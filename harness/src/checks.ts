import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { diffTrees, maxIndentDepth, matchGroups } from "./diff.ts";
import { copyHidden, copyTree, readText } from "./files.ts";
import type { CheckSet, DotnetCheck, TaskManifest } from "./manifest.ts";
import { DOTNET_ENV, NPM_ENV, npmCommand, runProcess, tail } from "./process.ts";

export interface CheckOutcome {
  name: string;
  ok: boolean;
  detail: string;
  /** True when the toolchain this check needs is not installed, so it never ran. */
  skipped?: boolean;
  /** The missing tool, when skipped is true. */
  tool?: string;
  passedTests?: number;
  failedTests?: number;
  totalTests?: number;
  errorCount?: number;
}

function missingTool(tool: string, name: string): CheckOutcome {
  return {
    name,
    ok: false,
    skipped: true,
    tool,
    detail: `${tool} is not on PATH, so this check never ran. An "expect: fail" check that is satisfied only by a missing toolchain is not evidence about the submission.`,
  };
}

export interface CheckContext {
  hiddenDir?: string;
  manifest?: TaskManifest;
  originalWorkspace?: string;
}

export async function runCheckSet(workspace: string, checks: CheckSet, context: CheckContext = {}): Promise<CheckOutcome[]> {
  const isolated = path.join(os.tmpdir(), "llm-coding-test-check", `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  copyTree(workspace, isolated);
  try {
    return await runCheckSetInPlace(isolated, checks, context);
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }
}

async function runCheckSetInPlace(workspace: string, checks: CheckSet, context: CheckContext): Promise<CheckOutcome[]> {
  const outcomes: CheckOutcome[] = [];
  if (checks.json) outcomes.push(checkJson(workspace, checks.json.files, checks.json.expect));
  if (checks.unchangedExcept) outcomes.push(checkUnchanged(workspace, checks.unchangedExcept, context.originalWorkspace));
  for (const check of checks.nesting ?? []) outcomes.push(checkNesting(workspace, check.file, check.compare, check.depth));
  for (const check of checks.lineCount ?? []) outcomes.push(checkLines(workspace, check.file, check.compare, check.lines));
  for (const rel of checks.requireFile ?? []) {
    const ok = existsSync(path.join(workspace, rel));
    outcomes.push({ name: `file ${rel}`, ok, detail: ok ? "present" : "missing" });
  }
  if (checks.answerGroups?.length) {
    const answerPath = path.join(workspace, checks.answerFile ?? "ANSWER.md");
    const text = existsSync(answerPath) ? readText(answerPath) : "";
    const groups = matchGroups(text, checks.answerGroups);
    outcomes.push({
      name: `findings ${checks.answerFile ?? "ANSWER.md"}`,
      ok: groups.missed.length === 0 && text.length > 0,
      detail: text.length === 0 ? "answer file missing" : groups.missed.length ? `missing: ${groups.missed.join(", ")}` : `matched ${groups.matched.length}`,
    });
  }
  for (const check of checks.dotnetBuild ?? []) outcomes.push(await runDotnetBuild(workspace, check));
  for (const check of checks.dotnetTest ?? []) outcomes.push(await runDotnetTest(workspace, check, context));
  for (const check of checks.npm ?? []) outcomes.push(await runNpm(workspace, check.script, check.expect, check.cwd, context, check.includeHidden));
  return outcomes;
}

function checkJson(workspace: string, files: string[], expect: "pass" | "fail"): CheckOutcome {
  const failures: string[] = [];
  for (const rel of files) {
    const full = path.join(workspace, rel);
    if (!existsSync(full)) {
      failures.push(`${rel}: missing`);
      continue;
    }
    try {
      JSON.parse(readText(full));
    } catch (error) {
      failures.push(`${rel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const parsed = failures.length === 0;
  const ok = expect === "pass" ? parsed : !parsed;
  return { name: `json ${expect}`, ok, detail: failures.join("; ") || "parsed" };
}

function checkUnchanged(workspace: string, allowed: string[], original?: string): CheckOutcome {
  if (!original) return { name: "workspace unchanged", ok: false, detail: "original workspace was not provided" };
  const diff = diffTrees(original, workspace);
  const allow = new Set(allowed);
  const unexpected = diff.files.filter((file) => !allow.has(file.path));
  return {
    name: "workspace unchanged",
    ok: unexpected.length === 0,
    detail: unexpected.length ? unexpected.map((file) => file.path).join(", ") : "only allowed files changed",
  };
}

function checkNesting(workspace: string, file: string, compare: "lte" | "gte", depth: number): CheckOutcome {
  const full = path.join(workspace, file);
  if (!existsSync(full)) return { name: `nesting ${file}`, ok: false, detail: "file missing" };
  const actual = maxIndentDepth(readText(full));
  const ok = compare === "lte" ? actual <= depth : actual >= depth;
  return { name: `nesting ${file} ${compare} ${depth}`, ok, detail: `depth ${actual}` };
}

function checkLines(workspace: string, file: string, compare: "lte" | "gte", lines: number): CheckOutcome {
  const full = path.join(workspace, file);
  if (!existsSync(full)) return { name: `lines ${file}`, ok: false, detail: "file missing" };
  const actual = readText(full).split(/\r?\n/).length;
  const ok = compare === "lte" ? actual <= lines : actual >= lines;
  return { name: `lines ${file} ${compare} ${lines}`, ok, detail: `${actual} lines` };
}

async function runDotnetBuild(workspace: string, check: DotnetCheck): Promise<CheckOutcome> {
  const name = `dotnet build ${check.project} ${check.expect}`;
  const result = await runProcess("dotnet", ["build", check.project, "-v", "q", "--nologo"], workspace, 240_000, DOTNET_ENV);
  if (result.missing) return missingTool("dotnet", name);
  const errors = countBuildErrors(result.output);
  const built = result.code === 0 && !result.timedOut;
  let ok = check.expect === "pass" ? built : !built;
  if (check.expect === "fail" && check.minErrors && errors < check.minErrors) ok = false;
  return {
    name,
    ok,
    errorCount: errors,
    detail: result.timedOut ? "timed out" : `${built ? "built" : "failed"} with ${errors} errors\n${tail(result.output, 30)}`,
  };
}

async function runDotnetTest(workspace: string, check: DotnetCheck, context: CheckContext): Promise<CheckOutcome> {
  if (check.includeHidden && context.hiddenDir && context.manifest) {
    copyHidden(context.hiddenDir, workspace, context.manifest.hiddenCopy);
  }
  const name = `dotnet test ${check.project} ${check.expect}${check.includeHidden ? " +hidden" : ""}`;
  const result = await runProcess("dotnet", ["test", check.project, "-v", "q", "--nologo"], workspace, 300_000, DOTNET_ENV);
  if (result.missing) return missingTool("dotnet", name);
  const counts = parseDotnetTest(result.output);
  const passed = result.code === 0 && !result.timedOut && (counts.failedTests ?? 0) === 0 && (counts.totalTests ?? 0) > 0;
  const ok = check.expect === "pass" ? passed : !passed;
  return {
    name,
    ok,
    ...counts,
    detail: result.timedOut ? "timed out" : `${counts.passedTests ?? 0}/${counts.totalTests ?? 0} passed\n${tail(result.output, 30)}`,
  };
}

const installed = new Set<string>();

async function runNpm(workspace: string, script: "build" | "test", expect: "pass" | "fail", cwd: string | undefined, context: CheckContext, includeHidden?: boolean): Promise<CheckOutcome> {
  if (includeHidden && context.hiddenDir && context.manifest) copyHidden(context.hiddenDir, workspace, context.manifest.hiddenCopy);
  const dir = cwd ? path.join(workspace, cwd) : workspace;
  const name = `npm ${script} ${expect}${includeHidden ? " +hidden" : ""}`;
  const npm = npmCommand();
  if (!installed.has(dir)) {
    const lock = existsSync(path.join(dir, "package-lock.json"));
    const install = await runProcess(npm, [lock ? "ci" : "install", "--no-fund", "--no-audit"], dir, 240_000, NPM_ENV);
    if (toolchainMissing(install)) return missingTool("npm", name);
    if (install.code !== 0) {
      return { name, ok: false, detail: `npm install failed\n${tail(install.output, 40)}` };
    }
    installed.add(dir);
  }
  const result = await runProcess(npm, ["run", script], dir, 240_000, NPM_ENV);
  if (toolchainMissing(result)) return missingTool("npm", name);
  const counts = parseVitest(result.output);
  const passed = result.code === 0 && !result.timedOut;
  const ok = expect === "pass" ? passed : !passed;
  return {
    name,
    ok,
    ...counts,
    detail: result.timedOut ? "timed out" : `exit ${result.code}\n${tail(result.output, 30)}`,
  };
}

/** A tool is absent when spawn fails, or when a Windows shell wrapper reports 127. */
export function toolchainMissing(result: { code: number; output: string; missing?: boolean }): boolean {
  if (result.missing) return true;
  return result.code === 127 && /is not recognized as an internal or external command|command not found/i.test(result.output);
}

export function countBuildErrors(output: string): number {
  const matches = output.match(/(?:^|\s)error [A-Z]{1,4}\d{3,5}:/g) ?? [];
  return matches.length;
}

export function parseDotnetTest(output: string): { passedTests?: number; failedTests?: number; totalTests?: number } {
  const match = /Failed:\s+(\d+),\s+Passed:\s+(\d+),[\s\S]*?Total:\s+(\d+)/.exec(output);
  if (!match) return {};
  return { failedTests: Number(match[1]), passedTests: Number(match[2]), totalTests: Number(match[3]) };
}

export function parseVitest(output: string): { passedTests?: number; failedTests?: number; totalTests?: number } {
  const failed = /Tests\s+(\d+)\s+failed(?:\s+\|\s+(\d+)\s+passed)?\s+\((\d+)\)/.exec(output);
  if (failed) {
    return {
      failedTests: Number(failed[1]),
      passedTests: failed[2] ? Number(failed[2]) : Number(failed[3]) - Number(failed[1]),
      totalTests: Number(failed[3]),
    };
  }
  const passed = /Tests\s+(\d+)\s+passed\s+\((\d+)\)/.exec(output);
  if (passed) return { passedTests: Number(passed[1]), failedTests: 0, totalTests: Number(passed[2]) };
  return {};
}

export function parseFileBlocks(text: string): { writes: { path: string; content: string }[]; deletes: string[] } {
  const writes: { path: string; content: string }[] = [];
  const deletes: string[] = [];
  const writeRe = /<<<FILE path="([^"]+)">>>\r?\n([\s\S]*?)<<<END FILE>>>/g;
  const deleteRe = /<<<DELETE path="([^"]+)">>>/g;
  for (const match of text.matchAll(writeRe)) {
    writes.push({ path: match[1], content: match[2].replace(/\s+$/, "") + "\n" });
  }
  for (const match of text.matchAll(deleteRe)) deletes.push(match[1]);
  return { writes, deletes };
}
