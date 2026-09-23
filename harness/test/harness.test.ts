import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { countBuildErrors, parseDotnetTest, parseFileBlocks, parseVitest, toolchainMissing, type CheckOutcome } from "../src/checks.ts";
import { lineDiffCounts, matchGroups, maxIndentDepth } from "../src/diff.ts";
import type { LoadedTask } from "../src/manifest.ts";
import { renderReport, scoreSubmission } from "../src/score.ts";

test("file blocks parse writes and deletes", () => {
  const parsed = parseFileBlocks(`notes
<<<FILE path="src/A.cs">>>
class A {}
<<<END FILE>>>
<<<DELETE path="src/Old.cs">>>
`);
  assert.equal(parsed.writes.length, 1);
  assert.equal(parsed.writes[0].path, "src/A.cs");
  assert.match(parsed.writes[0].content, /class A/);
  assert.deepEqual(parsed.deletes, ["src/Old.cs"]);
});

test("line diff counts an insertion", () => {
  const diff = lineDiffCounts("a\nb\nc\n", "a\nb\nx\nc\n");
  assert.equal(diff.added, 1);
  assert.equal(diff.removed, 0);
});

test("indent depth ignores blank lines", () => {
  const depth = maxIndentDepth("public void M()\n{\n    if (true)\n    {\n        return;\n    }\n}\n");
  assert.equal(depth, 2);
});

test("finding groups are case-insensitive and all required", () => {
  const result = matchGroups("SMS is missing. Retry runs once.", [
    { id: "sms", patterns: ["sms", "text message"] },
    { id: "retry", patterns: ["retry"] },
    { id: "async", patterns: ["asynchronous"] },
  ]);
  assert.deepEqual(result.matched, ["sms", "retry"]);
  assert.deepEqual(result.missed, ["async"]);
});

test("dotnet and vitest summaries parse", () => {
  const dotnet = parseDotnetTest("Failed!  - Failed:     1, Passed:     4, Skipped:     0, Total:     5, Duration: 1 s");
  assert.equal(dotnet.passedTests, 4);
  assert.equal(dotnet.totalTests, 5);
  const vitest = parseVitest("Tests  2 failed | 3 passed (5)");
  assert.equal(vitest.failedTests, 2);
  assert.equal(vitest.passedTests, 3);
  assert.equal(countBuildErrors("a.cs(1,1): error CS1002: ; expected\nerror NU1102: missing"), 2);
});

test("a missing toolchain is reported as SKIP and earns no credit", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "llm-score-"));
  const original = path.join(root, "original");
  const submission = path.join(root, "submission");
  const gold = path.join(root, "gold");
  for (const dir of [original, submission, gold]) mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(original, "appsettings.json"), '{\n  "name": "test"\n');
  writeFileSync(path.join(submission, "appsettings.json"), '{\n  "name": "test"\n}\n');
  writeFileSync(path.join(submission, "ANSWER.md"), "Missing closing brace.\n");
  writeFileSync(path.join(gold, "appsettings.json"), '{\n  "name": "test"\n}\n');

  const task: LoadedTask = {
    dir: root,
    manifest: {
      id: "SYN-001",
      title: "Trivial JSON syntax repair",
      tier: 1,
      category: "syntax",
      difficulty: "easy",
      languages: ["csharp"],
      summary: "One missing brace.",
      promptFile: "prompt.md",
      workspace: "original",
      hidden: "hidden",
      gold: "gold",
      checks: { initial: {}, final: { dotnetTest: [{ project: "JsonRepair.sln", expect: "pass" }] } },
      scoring: { precisionMode: "touch-list", allowedFiles: ["appsettings.json"], maxUnnecessaryFiles: 0 },
    },
  };
  const final: CheckOutcome[] = [
    { name: "json pass", ok: true, detail: "parsed" },
    { name: "dotnet test JsonRepair.sln pass", ok: false, skipped: true, tool: "dotnet", detail: "dotnet is not on PATH" },
  ];

  const report = scoreSubmission(task, original, submission, final, [], "local-model", 3_000);
  assert.deepEqual(report.environment, ["dotnet is not on PATH (1 check could not run)"]);
  assert.equal(report.tests.final, "SKIP");
  // A perfect edit still loses the 20 test points, because the tests never ran.
  assert.equal(report.score, 15);
  assert.equal(report.maxScore, 35);
  assert.deepEqual(report.unnecessaryFiles, []);
  assert.deepEqual(report.files.map((file) => file.path), ["ANSWER.md", "appsettings.json"]);

  const markdown = renderReport(report);
  assert.match(markdown, /ENVIRONMENT PROBLEM/);
  assert.match(markdown, /dotnet is not on PATH/);
  assert.match(markdown, /SKIP dotnet test JsonRepair\.sln pass/);
  assert.match(markdown, /tests: 0% of 20/);
  assert.match(markdown, /precision: 100% of 15/);
  assert.match(markdown, /not scored \(task does not declare them\): build, hidden tests, findings, root cause/);
  assert.match(markdown, /\+1\/-0\tANSWER\.md/);
});

test("spawn failures are recognised as a missing toolchain", () => {
  assert.equal(toolchainMissing({ code: 127, output: "spawn dotnet ENOENT", missing: true }), true);
  assert.equal(toolchainMissing({ code: 127, output: "'npm' is not recognized as an internal or external command" }), true);
  assert.equal(toolchainMissing({ code: 1, output: "error CS1002: ; expected" }), false);
});
