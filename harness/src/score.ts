import path from "node:path";
import type { CheckOutcome } from "./checks.ts";
import { diffTrees, isTestPath, matchGroups, type DiffSummary } from "./diff.ts";
import { fileExists, readText, relFiles } from "./files.ts";
import { defaultWeights, type LoadedTask, type ScoreWeights } from "./manifest.ts";

export interface CheckLine {
  name: string;
  state: "pass" | "fail" | "skipped" | "unverified";
  detail: string;
}

export interface ScoreReport {
  task: string;
  title: string;
  model: string;
  time: string;
  build: { initial: string; final: string };
  tests: { initial: string; final: string };
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  /** Per file diff against the pristine workspace, so a line total is traceable. */
  files: { path: string; status: string; added: number; removed: number }[];
  hiddenTests: string;
  unnecessaryChanges: number;
  unnecessaryFiles: string[];
  rootCauseIdentified: boolean | null;
  regressionTestAdded: boolean | null;
  explanationCorrect: boolean | null;
  findingsMissed: string[];
  /** Final checks with their state and the reason behind it. */
  checks: CheckLine[];
  /** Toolchains that were missing, so some checks never ran. */
  environment: string[];
  /** Scoring dimensions this task does not declare, excluded from maxScore. */
  excluded: string[];
  score: number;
  maxScore: number;
  notes: string[];
}

export function scoreSubmission(
  task: LoadedTask,
  originalDir: string,
  submissionDir: string,
  finalOutcomes: CheckOutcome[],
  initialOutcomes: CheckOutcome[],
  model: string,
  elapsedMs: number,
): ScoreReport {
  const manifest = task.manifest;
  const declared: ScoreWeights = { ...defaultWeights(manifest.category), ...manifest.scoring.weights };
  const weights: ScoreWeights = effectiveWeights(task, declared);
  const excluded = excludedDimensions(declared, weights);
  const diff = diffTrees(originalDir, submissionDir);
  const unnecessary = unnecessaryFiles(task, diff);
  const answerName = manifest.checks.final.answerFile ?? "ANSWER.md";
  const answerPath = path.join(submissionDir, answerName);
  const answer = fileExists(answerPath) ? readText(answerPath) : "";
  const groups = matchGroups(answer, manifest.checks.final.answerGroups);
  const rootPatterns = manifest.scoring.rootCausePatterns ?? [];
  const rootCauseIdentified = rootPatterns.length === 0 ? null : rootPatterns.every((pattern) => new RegExp(pattern, "i").test(answer));
  const regressionTestAdded = manifest.scoring.requireRegressionTest ? hasRegressionTest(diff) : null;
  const buildFinal = outcomeState(finalOutcomes, ["dotnet build", "npm build"]);
  const testsFinal = outcomeState(finalOutcomes.filter((item) => !item.name.includes("+hidden")), ["dotnet test", "npm test"]);
  const hidden = hiddenState(finalOutcomes);
  const notes: string[] = [];
  let score = 0;
  let maxScore = 0;
  const add = (weight: number, fraction: number, note: string) => {
    if (weight <= 0) return;
    maxScore += weight;
    score += Math.round(weight * fraction);
    notes.push(`${note}: ${Math.round(fraction * 100)}% of ${weight}`);
  };
  // SKIP means the toolchain was absent, so no credit; it must not be read as a pass.
  const credit = (state: string) => (state === "FAIL" || state === "SKIP" ? 0 : 1);
  add(weights.build, credit(buildFinal), "build");
  add(weights.tests, credit(testsFinal), "tests");
  add(weights.hidden, credit(hidden), "hidden");
  if (weights.findings > 0) {
    const total = (manifest.checks.final.answerGroups ?? []).length || 1;
    const hit = total - groups.missed.length;
    add(weights.findings, answer ? hit / total : 0, "findings");
  }
  if (weights.rootCause > 0) add(weights.rootCause, rootCauseIdentified ? 1 : 0, "root cause");
  if (weights.precision > 0) {
    const limit = manifest.scoring.maxUnnecessaryFiles ?? 0;
    const fraction = unnecessary.length <= limit ? 1 : Math.max(0, 1 - (unnecessary.length - limit) / Math.max(1, diff.filesChanged));
    add(weights.precision, fraction, "precision");
  }
  if (weights.regressionTest > 0) add(weights.regressionTest, regressionTestAdded ? 1 : 0, "regression test");
  if (weights.unchanged > 0) {
    if (manifest.category === "refactor") {
      const gates = finalOutcomes.filter((item) => item.name.startsWith("nesting") || item.name.startsWith("lines"));
      add(weights.unchanged, gates.length > 0 && gates.every((item) => item.ok) ? 1 : 0, "maintainability");
    } else {
      const unchanged = finalOutcomes.find((item) => item.name.startsWith("workspace unchanged"));
      add(weights.unchanged, unchanged?.ok ? 1 : 0, "unchanged");
    }
  }
  return {
    task: manifest.id,
    title: manifest.title,
    model,
    time: formatDuration(elapsedMs),
    build: { initial: outcomeState(initialOutcomes, ["dotnet build", "npm build"]), final: buildFinal },
    tests: { initial: testFraction(initialOutcomes), final: testFraction(finalOutcomes.filter((item) => !item.name.includes("+hidden"))) },
    filesChanged: diff.filesChanged,
    linesAdded: diff.linesAdded,
    linesRemoved: diff.linesRemoved,
    files: diff.files.map((file) => ({ path: file.path, status: file.status, added: file.added, removed: file.removed })),
    hiddenTests: hidden,
    unnecessaryChanges: unnecessary.length,
    unnecessaryFiles: unnecessary,
    rootCauseIdentified,
    regressionTestAdded,
    explanationCorrect: answer.length === 0 && !(manifest.checks.final.answerGroups?.length) ? null : groups.missed.length === 0 && rootCauseIdentified !== false,
    findingsMissed: groups.missed,
    checks: finalOutcomes.map((item) => ({
      name: item.name,
      state: item.skipped ? "skipped" : item.unverified ? "unverified" : item.ok ? "pass" : "fail",
      detail: item.detail,
    })),
    environment: environmentProblems(initialOutcomes, finalOutcomes),
    excluded,
    score,
    maxScore,
    notes,
  };
}

const DIMENSION_LABELS: Record<keyof ScoreWeights, string> = {
  build: "build",
  tests: "tests",
  hidden: "hidden tests",
  findings: "findings",
  rootCause: "root cause",
  precision: "precision",
  regressionTest: "regression test",
  unchanged: "unchanged workspace",
};

/** Dimensions the task never declared, so maxScore is below 100 by design. */
function excludedDimensions(declared: ScoreWeights, effective: ScoreWeights): string[] {
  return (Object.keys(DIMENSION_LABELS) as (keyof ScoreWeights)[])
    .filter((key) => declared[key] > 0 && effective[key] === 0)
    .map((key) => DIMENSION_LABELS[key]);
}

/** What a task can score before anything runs, so a max score below 100 explains itself. */
export function weightsFor(task: LoadedTask): { weights: ScoreWeights; maxScore: number; excluded: string[] } {
  const declared: ScoreWeights = { ...defaultWeights(task.manifest.category), ...task.manifest.scoring.weights };
  const weights = effectiveWeights(task, declared);
  return {
    weights,
    maxScore: Object.values(weights).reduce((sum, weight) => sum + weight, 0),
    excluded: excludedDimensions(declared, weights),
  };
}

/** Toolchain problems, reported as `tool reason (N checks could not run)`. */
function environmentProblems(...sets: CheckOutcome[][]): string[] {
  const counts = new Map<string, number>();
  for (const outcomes of sets) {
    for (const outcome of outcomes) {
      if (!outcome.skipped || !outcome.tool) continue;
      const key = `${outcome.tool} ${outcome.skipReason ?? "was unavailable"}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([problem, count]) => `${problem} (${count} check${count === 1 ? "" : "s"} could not run)`);
}

function effectiveWeights(task: LoadedTask, weights: ScoreWeights): ScoreWeights {
  const final = task.manifest.checks.final;
  const scoring = task.manifest.scoring;
  const next = { ...weights };
  const hasBuild = (final.dotnetBuild?.length ?? 0) > 0 || (final.npm ?? []).some((item) => item.script === "build");
  const hasTests = (final.dotnetTest?.length ?? 0) > 0 || (final.npm ?? []).some((item) => item.script === "test");
  const hasHidden = (final.dotnetTest ?? []).some((item) => item.includeHidden) || (final.npm ?? []).some((item) => item.includeHidden);
  if (!hasBuild) next.build = 0;
  if (!hasTests) next.tests = 0;
  if (!hasHidden) next.hidden = 0;
  if (!(final.answerGroups?.length)) next.findings = 0;
  if (!(scoring.rootCausePatterns?.length)) next.rootCause = 0;
  if ((scoring.precisionMode ?? "none") === "none") next.precision = 0;
  if (!scoring.requireRegressionTest) next.regressionTest = 0;
  else if (next.regressionTest === 0) next.regressionTest = 10;
  if (task.manifest.category === "refactor") {
    if (!(final.nesting?.length || final.lineCount?.length)) next.unchanged = 0;
  } else if (!(final.unchangedExcept?.length)) {
    next.unchanged = 0;
  }
  return next;
}

function unnecessaryFiles(task: LoadedTask, diff: DiffSummary): string[] {
  const mode = task.manifest.scoring.precisionMode ?? "none";
  if (mode === "none") return [];
  const changed = diff.files.map((file) => file.path);
  if (mode === "max-files") {
    const max = task.manifest.scoring.maxChangedFiles ?? Number.MAX_SAFE_INTEGER;
    return changed.length <= max ? [] : changed.slice(max);
  }
  const allowed = new Set(task.manifest.scoring.allowedFiles ?? []);
  for (const rel of relFiles(path.join(task.dir, task.manifest.gold))) {
    if (rel !== "delete.txt") allowed.add(rel);
  }
  allowed.add("ANSWER.md");
  allowed.add("IMPACT.md");
  allowed.add("QUESTIONS.md");
  return changed.filter((rel) => {
    if (allowed.has(rel)) return false;
    if (task.manifest.scoring.allowNewTests && isTestPath(rel)) {
      const change = diff.files.find((file) => file.path === rel);
      if (change?.status === "added") return false;
    }
    return true;
  });
}

function hasRegressionTest(diff: DiffSummary): boolean {
  return diff.files.some((file) => file.status !== "removed" && /test/i.test(file.path) && /regress|duplicate/i.test(file.path));
}

function outcomeState(outcomes: CheckOutcome[], needles: string[]): string {
  const relevant = outcomes.filter((item) => needles.some((needle) => item.name.includes(needle)) && !item.name.includes("+hidden"));
  if (relevant.length === 0) return "N/A";
  if (relevant.every((item) => item.skipped)) return "SKIP";
  return relevant.every((item) => item.ok) ? "PASS" : "FAIL";
}

function hiddenState(outcomes: CheckOutcome[]): string {
  const tests = outcomes.filter((item) => item.name.includes("+hidden"));
  if (tests.length === 0) return "N/A";
  if (tests.every((item) => item.skipped)) return "SKIP";
  return tests.every((item) => item.ok) ? "PASS" : "FAIL";
}

function testFraction(outcomes: CheckOutcome[]): string {
  const tests = outcomes.filter((item) => item.name.includes("dotnet test") || item.name.includes("npm test"));
  if (tests.length === 0) return "N/A";
  if (tests.every((item) => item.skipped)) return "SKIP";
  const unverified = tests.some((item) => item.unverified);
  const passed = tests.reduce((sum, item) => sum + (item.passedTests ?? 0), 0);
  const total = tests.reduce((sum, item) => sum + (item.totalTests ?? 0), 0);
  if (!total) return tests.every((item) => item.ok) ? (unverified ? "PASS (unverified)" : "PASS") : "FAIL";
  return `${passed}/${total}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function renderReport(report: ScoreReport): string {
  const yn = (value: boolean | null) => (value === null ? "N/A" : value ? "YES" : "NO");
  const lines = ["# Benchmark report", ""];
  if (report.environment.length > 0) {
    lines.push(
      "!! ENVIRONMENT PROBLEM - THIS SCORE IS NOT A MEASUREMENT OF THE MODEL",
      ...report.environment.map((item) => `   ${item}`),
      "   Checks that could not run are reported as SKIP and earn no points.",
      "   Fix the machine, then score again before drawing conclusions.",
      "",
    );
  }
  lines.push(
    `Task: ${report.task}`,
    `Title: ${report.title}`,
    `Model: ${report.model}`,
    `Time: ${report.time}`,
    "",
    "Build:",
    `  Initial: ${report.build.initial}`,
    `  Final: ${report.build.final}`,
    "",
    "Tests:",
    `  Initial: ${report.tests.initial}`,
    `  Final: ${report.tests.final}`,
    "",
    "  Initial states report whether the starting workspace matched what the task",
    "  declares (a task that starts red should be red). They are not passing tests.",
    "  SKIP means the toolchain could not run the check; WARN means it reported",
    "  success in a form this harness could not count. Neither is a failure of the code.",
    "",
    `Files changed: ${report.filesChanged}`,
    `Lines added: ${report.linesAdded}`,
    `Lines removed: ${report.linesRemoved}`,
    "",
    "Changed files (diff against the untouched workspace, answer files included):",
    ...(report.files.length > 0
      ? report.files.map((file) => `  ${file.status}\t+${file.added}/-${file.removed}\t${file.path}`)
      : ["  none"]),
    "",
    "Hidden tests:",
    `  ${report.hiddenTests}`,
    "",
    "Unnecessary changes:",
    `  ${report.unnecessaryChanges}`,
    ...report.unnecessaryFiles.map((file) => `  - ${file}`),
    "",
    "Root cause identified:",
    `  ${yn(report.rootCauseIdentified)}`,
    "",
    "Regression test added:",
    `  ${yn(report.regressionTestAdded)}`,
    "",
    "Final explanation:",
    `  ${report.explanationCorrect === null ? "N/A" : report.explanationCorrect ? "Correct" : "Incomplete"}`,
    "",
    "Checks:",
    ...(report.checks.length > 0 ? report.checks.flatMap(renderCheck) : ["  none declared"]),
    "",
    `Score: ${report.score}/${report.maxScore || 100}`,
    ...report.notes.map((note) => `  ${note}`),
    ...(report.excluded.length > 0
      ? [`  not scored (task does not declare them): ${report.excluded.join(", ")}`]
      : []),
    "",
  );
  return lines.join("\n");
}

function renderCheck(check: CheckLine): string[] {
  const state = { pass: "ok  ", skipped: "SKIP", unverified: "WARN", fail: "FAIL" }[check.state];
  const out = [`  ${state} ${check.name}`];
  if (check.state === "pass") return out;
  const detail = check.detail.trim().split(/\r?\n/).slice(0, 8).filter((line) => line.trim().length > 0);
  return [...out, ...detail.map((line) => `       ${line}`)];
}
