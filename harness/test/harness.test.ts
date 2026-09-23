import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { countBuildErrors, environmentFailure, parseDotnetTest, parseFileBlocks, parseVitest, toolchainMissing, type CheckOutcome } from "../src/checks.ts";
import { lineDiffCounts, matchGroups, maxIndentDepth } from "../src/diff.ts";
import { loadTasks, type LoadedTask } from "../src/manifest.ts";
import { repoRootFromHere } from "../src/files.ts";
import { DOTNET_ENV } from "../src/process.ts";
import { describeFailure } from "../src/runModel.ts";
import { renderReport, scoreSubmission, weightsFor } from "../src/score.ts";

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

interface SyntaxFixture {
  root: string;
  original: string;
  submission: string;
  task: LoadedTask;
}

/** A correct SYN-001 style submission: the brace closed, plus the ANSWER.md the prompt asks for. */
function syntaxFixture(): SyntaxFixture {
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
  return { root, original, submission, task };
}

test("a missing toolchain is reported as SKIP and earns no credit", () => {
  const { original, submission, task } = syntaxFixture();
  const final: CheckOutcome[] = [
    { name: "json pass", ok: true, detail: "parsed" },
    { name: "dotnet test JsonRepair.sln pass", ok: false, skipped: true, tool: "dotnet", skipReason: "is not on PATH", detail: "dotnet is not on PATH" },
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

test("a summary the harness cannot read is WARN, not FAIL", () => {
  const { original, submission, task } = syntaxFixture();
  const final: CheckOutcome[] = [
    { name: "json pass", ok: true, detail: "parsed" },
    { name: "dotnet test JsonRepair.sln pass", ok: true, unverified: true, detail: "exit 0, but no test summary could be parsed" },
  ];
  const report = scoreSubmission(task, original, submission, final, [], "local-model", 1_000);
  assert.equal(report.tests.final, "PASS (unverified)");
  assert.deepEqual(report.environment, []);
  // dotnet said the run succeeded, so the points are not withheld.
  assert.equal(report.score, 35);
  assert.equal(report.maxScore, 35);
  assert.match(renderReport(report), /WARN dotnet test JsonRepair\.sln pass/);
});

test("only connectivity and SDK failures count as environmental", () => {
  const offline = environmentFailure("dotnet", "error NU1301: Unable to load the service index for source https://api.nuget.org/v3/index.json");
  assert.equal(offline?.reason, "could not reach the package source");
  const sdk = environmentFailure("dotnet", "error NETSDK1045: The current .NET SDK does not support targeting .NET 8.0");
  assert.equal(sdk?.reason, "is not an SDK that can build this task");
  const registry = environmentFailure("npm", "npm error code EAI_AGAIN\nnpm error request to https://registry.npmjs.org/react failed");
  assert.equal(registry?.reason, "could not reach the npm registry");
  // A package or version that does not exist is a content failure, and it is the
  // intended defect of BLD-003, so it must never be excused as environmental.
  assert.equal(environmentFailure("dotnet", "error NU1102: Unable to find package Newtonsoft.Json version 99.0.0"), null);
  assert.equal(environmentFailure("dotnet", "Program.cs(4,9): error CS1002: ; expected"), null);
  assert.equal(environmentFailure("npm", "FAIL src/orders.test.tsx > sends the bearer token\nAssertionError: expected 401"), null);
});

test("error counts can be restricted to compiler errors", () => {
  const output = "a.cs(1,1): error CS1002: ; expected\nerror NU1102: unable to find package";
  assert.equal(countBuildErrors(output), 2);
  assert.equal(countBuildErrors(output, "CS"), 1);
  assert.equal(countBuildErrors(output, "NU"), 1);
});

test("the .NET CLI is pinned to English so summaries parse", () => {
  assert.equal(DOTNET_ENV.DOTNET_CLI_UI_LANGUAGE, "en");
  assert.deepEqual(parseDotnetTest("Passed!  - Failed:     0, Passed:     1, Skipped:     0, Total:     1"), {
    failedTests: 0,
    passedTests: 1,
    totalTests: 1,
  });
  // A localized CLI prints no recognisable summary, which used to read as zero tests.
  assert.deepEqual(parseDotnetTest("Zaliczono!  - Niepowodzenie:     0, Zaliczono:     1, Razem:     1"), {});
});

test("a task scores only the dimensions it declares", () => {
  const root = repoRootFromHere(import.meta.url);
  const syntax = weightsFor(loadTasks(root, "SYN-001")[0]);
  assert.equal(syntax.maxScore, 35);
  assert.deepEqual(syntax.excluded, ["build", "hidden tests", "findings", "root cause"]);
  const analysis = weightsFor(loadTasks(root, "SPEC-005")[0]);
  assert.equal(analysis.maxScore, 100);
  assert.deepEqual(analysis.excluded, []);
  assert.equal(analysis.weights.findings + analysis.weights.unchanged, 100);
});

test("hidden test output is never sent back to the model", () => {
  const hidden = describeFailure({
    name: "dotnet test Notify.sln pass +hidden",
    ok: false,
    totalTests: 4,
    passedTests: 2,
    detail: "Failed Dispatch_enqueues_only [42 ms]\nAssert.Equal() Failure: Expected 1, Actual 2\n  at OutboxHiddenTests.Sends_once()",
  });
  assert.match(hidden, /2\/4 passed/);
  assert.doesNotMatch(hidden, /OutboxHiddenTests/);
  assert.doesNotMatch(hidden, /Expected 1, Actual 2/);
  assert.doesNotMatch(hidden, /Dispatch_enqueues_only/);

  const visible = describeFailure({ name: "dotnet test Notify.sln pass", ok: false, detail: "Assert.Equal() Failure: Expected 404" });
  assert.match(visible, /Expected 404/);
});

test("spawn failures are recognised as a missing toolchain", () => {
  assert.equal(toolchainMissing({ code: 127, output: "spawn dotnet ENOENT", missing: true }), true);
  assert.equal(toolchainMissing({ code: 127, output: "'npm' is not recognized as an internal or external command" }), true);
  assert.equal(toolchainMissing({ code: 1, output: "error CS1002: ; expected" }), false);
});
