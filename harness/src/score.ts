import path from "node:path";
import type { CheckOutcome } from "./checks.ts";
import { diffTrees, isTestPath, matchGroups, type DiffSummary } from "./diff.ts";
import { fileExists, readText, relFiles } from "./files.ts";
import { defaultWeights, type LoadedTask, type ScoreWeights } from "./manifest.ts";

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
  hiddenTests: string;
  unnecessaryChanges: number;
  unnecessaryFiles: string[];
  rootCauseIdentified: boolean | null;
  regressionTestAdded: boolean | null;
  explanationCorrect: boolean | null;
  findingsMissed: string[];
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
  const weights: ScoreWeights = effectiveWeights(task, { ...defaultWeights(manifest.category), ...manifest.scoring.weights });
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
  add(weights.build, buildFinal === "FAIL" ? 0 : 1, "build");
  add(weights.tests, testsFinal === "FAIL" ? 0 : 1, "tests");
  add(weights.hidden, hidden === "FAIL" ? 0 : 1, "hidden");
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
    hiddenTests: hidden,
    unnecessaryChanges: unnecessary.length,
    unnecessaryFiles: unnecessary,
    rootCauseIdentified,
    regressionTestAdded,
    explanationCorrect: answer.length === 0 && !(manifest.checks.final.answerGroups?.length) ? null : groups.missed.length === 0 && rootCauseIdentified !== false,
    findingsMissed: groups.missed,
    score,
    maxScore,
    notes,
  };
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
  return relevant.every((item) => item.ok) ? "PASS" : "FAIL";
}

function hiddenState(outcomes: CheckOutcome[]): string {
  const tests = outcomes.filter((item) => item.name.includes("+hidden"));
  if (tests.length === 0) return "N/A";
  return tests.every((item) => item.ok) ? "PASS" : "FAIL";
}

function testFraction(outcomes: CheckOutcome[]): string {
  const tests = outcomes.filter((item) => item.name.includes("dotnet test") || item.name.includes("npm test"));
  if (tests.length === 0) return "N/A";
  const passed = tests.reduce((sum, item) => sum + (item.passedTests ?? 0), 0);
  const total = tests.reduce((sum, item) => sum + (item.totalTests ?? 0), 0);
  if (!total) return tests.every((item) => item.ok) ? "PASS" : "FAIL";
  return `${passed}/${total}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function renderReport(report: ScoreReport): string {
  const yn = (value: boolean | null) => (value === null ? "N/A" : value ? "YES" : "NO");
  return [
    "# Benchmark report",
    "",
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
    `Files changed: ${report.filesChanged}`,
    `Lines added: ${report.linesAdded}`,
    `Lines removed: ${report.linesRemoved}`,
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
    `Score: ${report.score}/${report.maxScore || 100}`,
    "",
  ].join("\n");
}
