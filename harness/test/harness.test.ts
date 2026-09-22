import assert from "node:assert/strict";
import test from "node:test";
import { countBuildErrors, parseDotnetTest, parseFileBlocks, parseVitest } from "../src/checks.ts";
import { lineDiffCounts, matchGroups, maxIndentDepth } from "../src/diff.ts";

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
