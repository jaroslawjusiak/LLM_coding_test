import { add, csproj, guid, manifest, prompt, reactConfig, reactPackage, rubric, sln, testproj } from "./lib.mjs";

export function syntaxTasks() {
  syn001();
  syn002();
  syn003();
  syn004();
  syn005();
}

function syn001() {
  const id = "SYN-001";
  prompt(
    id,
    "Fix the JSON syntax",
    `\`appsettings.json\` does not parse. Fix the syntax errors only. Do not change keys, values, or formatting beyond what is required to make the document valid.

Run \`dotnet test\`.`,
  );
  rubric(
    id,
    `# SYN-001

Level 1 syntax repair. The only defect is a missing closing brace on the root object. Adding or renaming properties is a semantic change and should fail the property-count test.`,
  );
  add(
    `tasks/${id}/workspace/appsettings.json`,
    `{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "foo": "1.2.3"
}
`,
  );
  add(`tasks/${id}/workspace/JsonRepair.sln`, sln("JsonRepair", [{ name: "JsonRepair.Tests", path: "tests/JsonRepair.Tests/JsonRepair.Tests.csproj", guid: guid() }]));
  add(`tasks/${id}/workspace/tests/JsonRepair.Tests/JsonRepair.Tests.csproj`, testproj([]));
  add(
    `tasks/${id}/workspace/tests/JsonRepair.Tests/ConfigTests.cs`,
    `using System.Text.Json.Nodes;

namespace JsonRepair.Tests;

public class ConfigTests
{
    [Fact]
    public void Appsettings_has_the_original_document()
    {
        var path = Find("appsettings.json");
        var doc = JsonNode.Parse(File.ReadAllText(path))!.AsObject();
        Assert.Equal(3, doc.Count);
        Assert.Equal("test", doc["name"]!.GetValue<string>());
        Assert.Equal("1.0.0", doc["version"]!.GetValue<string>());
        var deps = doc["dependencies"]!.AsObject();
        Assert.Equal(1, deps.Count);
        Assert.Equal("1.2.3", deps["foo"]!.GetValue<string>());
    }

    private static string Find(string name)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, name);
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException(name);
    }
}
`,
  );
  add(
    `tasks/${id}/gold/appsettings.json`,
    `{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "foo": "1.2.3"
  }
}
`,
  );
  add(`tasks/${id}/gold/ANSWER.md`, "The root object was missing its closing brace. No keys or values were changed.\n");
  manifest({
    id,
    title: "Trivial JSON syntax repair",
    tier: 1,
    category: "syntax",
    difficulty: "easy",
    languages: ["csharp"],
    summary: "One missing brace in appsettings.json. Do not change the document's meaning.",
    symptom: "JSON parser rejects appsettings.json.",
    rootCause: "The root object is missing a closing brace.",
    correctFix: "Insert the missing brace and leave every key and value unchanged.",
    checks: {
      initial: {
        json: { files: ["appsettings.json"], expect: "fail" },
        dotnetTest: [{ project: "JsonRepair.sln", expect: "fail" }],
      },
      final: {
        json: { files: ["appsettings.json"], expect: "pass" },
        dotnetTest: [{ project: "JsonRepair.sln", expect: "pass" }],
      },
    },
    scoring: { precisionMode: "touch-list", allowedFiles: ["appsettings.json"], maxUnnecessaryFiles: 0 },
  });
}

function syn002() {
  const id = "SYN-002";
  prompt(
    id,
    "Fix the independent syntax errors",
    `This C# project does not compile. The defects are independent syntax errors, including a missing brace, a missing parenthesis, a missing semicolon, incorrect generic brackets, a malformed string, and incorrect attribute syntax.

Fix the syntax errors. Do not change behavior. Run \`dotnet test\`.`,
  );
  rubric(id, "# SYN-002\n\nSix independent syntax errors live in separate types in SyntaxSamples.cs so the compiler can report them separately. Gold restores the original behavior locked by SyntaxTests.\n");
  const g = guid();
  add(`tasks/${id}/workspace/SyntaxRepair.sln`, sln("SyntaxRepair", [
    { name: "SyntaxRepair", path: "src/SyntaxRepair/SyntaxRepair.csproj", guid: g },
    { name: "SyntaxRepair.Tests", path: "tests/SyntaxRepair.Tests/SyntaxRepair.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/SyntaxRepair/SyntaxRepair.csproj`, csproj());
  add(`tasks/${id}/workspace/tests/SyntaxRepair.Tests/SyntaxRepair.Tests.csproj`, testproj(["../../src/SyntaxRepair/SyntaxRepair.csproj"]));
  add(`tasks/${id}/workspace/src/SyntaxRepair/MissingSemicolon.cs`, `namespace SyntaxRepair;

public class MissingSemicolon
{
    public int Value()
    {
        var x = 1
        return x;
    }
}
`);
  add(`tasks/${id}/workspace/src/SyntaxRepair/MissingParen.cs`, `namespace SyntaxRepair;

public class MissingParen
{
    public string Hello()
    {
        return string.Concat("a", "b";
    }
}
`);
  add(`tasks/${id}/workspace/src/SyntaxRepair/MissingBrace.cs`, `namespace SyntaxRepair;

public class MissingBrace
{
    public int Plus(int n)
    {
        if (n > 0)
        {
            return n + 1;
        return n;
    }
}
`);
  add(`tasks/${id}/workspace/src/SyntaxRepair/BadGeneric.cs`, `namespace SyntaxRepair;

public class BadGeneric
{
    public System.Collections.Generic.List[string] Items()
    {
        return new System.Collections.Generic.List<string>();
    }
}
`);
  add(`tasks/${id}/workspace/src/SyntaxRepair/BadAttribute.cs`, `namespace SyntaxRepair;

public class BadAttribute
{
    [System.Obsolete("old")
    public string Marked() => "kept";
}
`);
  add(`tasks/${id}/workspace/src/SyntaxRepair/BadString.cs`, `namespace SyntaxRepair;

public class BadString
{
    public string Text() => "hello;
}
`);
  add(`tasks/${id}/gold/src/SyntaxRepair/MissingSemicolon.cs`, `namespace SyntaxRepair;

public class MissingSemicolon
{
    public int Value()
    {
        var x = 1;
        return x;
    }
}
`);
  add(`tasks/${id}/gold/src/SyntaxRepair/MissingParen.cs`, `namespace SyntaxRepair;

public class MissingParen
{
    public string Hello()
    {
        return string.Concat("a", "b");
    }
}
`);
  add(`tasks/${id}/gold/src/SyntaxRepair/MissingBrace.cs`, `namespace SyntaxRepair;

public class MissingBrace
{
    public int Plus(int n)
    {
        if (n > 0)
        {
            return n + 1;
        }
        return n;
    }
}
`);
  add(`tasks/${id}/gold/src/SyntaxRepair/BadGeneric.cs`, `namespace SyntaxRepair;

public class BadGeneric
{
    public System.Collections.Generic.List<string> Items()
    {
        return new System.Collections.Generic.List<string>();
    }
}
`);
  add(`tasks/${id}/gold/src/SyntaxRepair/BadAttribute.cs`, `namespace SyntaxRepair;

public class BadAttribute
{
    [System.Obsolete("old")]
    public string Marked() => "kept";
}
`);
  add(`tasks/${id}/gold/src/SyntaxRepair/BadString.cs`, `namespace SyntaxRepair;

public class BadString
{
    public string Text() => "hello";
}
`);
  add(`tasks/${id}/workspace/tests/SyntaxRepair.Tests/SyntaxTests.cs`, syntaxTests());
  add(`tasks/${id}/gold/ANSWER.md`, "Each type had its own syntax error: missing semicolon, missing parenthesis, missing brace, a generic written with square brackets, an attribute missing its closing bracket, and an unterminated string. Behavior was not changed.\n");
  manifest({
    id,
    title: "Several independent C# syntax errors",
    tier: 1,
    category: "syntax",
    difficulty: "easy",
    languages: ["csharp"],
    summary: "One file contains six independent syntax errors. Repair them without changing behavior.",
    symptom: "The project does not compile.",
    rootCause: "Six separate syntax errors, one per type.",
    correctFix: "Repair each error in place.",
    checks: {
      initial: { dotnetBuild: [{ project: "SyntaxRepair.sln", expect: "fail" }] },
      final: {
        dotnetBuild: [{ project: "SyntaxRepair.sln", expect: "pass" }],
        dotnetTest: [{ project: "SyntaxRepair.sln", expect: "pass" }],
      },
    },
    scoring: { precisionMode: "touch-list", allowedFiles: ["src/SyntaxRepair/SyntaxSamples.cs"], maxUnnecessaryFiles: 0 },
  });
}

function brokenSamples() {
  return `namespace SyntaxRepair;

public class MissingSemicolon
{
    public int Value()
    {
        var x = 1
        return x;
    }
}

public class MissingParen
{
    public string Hello()
    {
        return string.Concat("a", "b";
    }
}

public class MissingBrace
{
    public int Plus(int n)
    {
        if (n > 0)
        {
            return n + 1;
        }
    }
}

public class BadGeneric
{
    public System.Collections.Generic.List[string] Items()
    {
        return new System.Collections.Generic.List<string>();
    }
}

public class BadAttribute
{
    [System.Obsolete("old")
    public string Marked() => "kept";
}

public class BadString
{
    public string Text() => "hello;
}
`;
}

function fixedSamples() {
  return `namespace SyntaxRepair;

public class MissingSemicolon
{
    public int Value()
    {
        var x = 1;
        return x;
    }
}

public class MissingParen
{
    public string Hello()
    {
        return string.Concat("a", "b");
    }
}

public class MissingBrace
{
    public int Plus(int n)
    {
        if (n > 0)
        {
            return n + 1;
        }
        return n;
    }
}

public class BadGeneric
{
    public System.Collections.Generic.List<string> Items()
    {
        return new System.Collections.Generic.List<string>();
    }
}

public class BadAttribute
{
    [System.Obsolete("old")]
    public string Marked() => "kept";
}

public class BadString
{
    public string Text() => "hello";
}
`;
}

function syntaxTests() {
  return `namespace SyntaxRepair.Tests;

public class SyntaxTests
{
    [Fact]
    public void Samples_keep_their_behavior()
    {
        Assert.Equal(1, new SyntaxRepair.MissingSemicolon().Value());
        Assert.Equal("ab", new SyntaxRepair.MissingParen().Hello());
        Assert.Equal(3, new SyntaxRepair.MissingBrace().Plus(2));
        Assert.Equal(0, new SyntaxRepair.MissingBrace().Plus(0));
        Assert.Empty(new SyntaxRepair.BadGeneric().Items());
        Assert.Equal("kept", new SyntaxRepair.BadAttribute().Marked());
        Assert.Equal("hello", new SyntaxRepair.BadString().Text());
    }
}
`;
}

function syn003() {
  const id = "SYN-003";
  prompt(
    id,
    "Fix the cascading compiler errors",
    `\`dotnet build\` reports a large cascade of compiler errors. One structural mistake causes them.

Fix the structural mistake. Do not rewrite the methods and do not "fix" every reported line independently. Run \`dotnet test\` after the project builds.`,
  );
  rubric(
    id,
    `# SYN-003

The first method is missing its closing brace. Later members are then reported as cascading errors. The gold patch adds that one brace. A model that edits many methods has missed the root cause.`,
  );
  const g = guid();
  add(`tasks/${id}/workspace/Cascade.sln`, sln("Cascade", [
    { name: "Cascade", path: "src/Cascade/Cascade.csproj", guid: g },
    { name: "Cascade.Tests", path: "tests/Cascade.Tests/Cascade.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Cascade/Cascade.csproj`, csproj());
  add(`tasks/${id}/workspace/tests/Cascade.Tests/Cascade.Tests.csproj`, testproj(["../../src/Cascade/Cascade.csproj"]));
  add(`tasks/${id}/workspace/src/Cascade/ReportBuilder.cs`, cascadeSource(false));
  add(`tasks/${id}/gold/src/Cascade/ReportBuilder.cs`, cascadeSource(true));
  add(
    `tasks/${id}/workspace/tests/Cascade.Tests/ReportTests.cs`,
    `namespace Cascade.Tests;

public class ReportTests
{
    [Fact]
    public void Totals_are_stable()
    {
        var report = new Cascade.ReportBuilder();
        Assert.Equal(10, report.Line(0));
        Assert.Equal(55, report.SumThrough(10));
        Assert.Equal("ok", report.Label(true));
    }
}
`,
  );
  add(`tasks/${id}/gold/ANSWER.md`, "ReportBuilder.Open was missing its closing brace. That single structural error produced the cascade. No method bodies were rewritten.\n");
  manifest({
    id,
    title: "Cascading compiler errors from one structural mistake",
    tier: 1,
    category: "syntax",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "One missing brace produces a large compiler cascade. Fix the cause, not every reported line.",
    symptom: "dotnet build reports many errors across ReportBuilder.cs.",
    rootCause: "ReportBuilder.Open is missing its closing brace.",
    correctFix: "Add the missing brace and leave the other methods unchanged.",
    checks: {
      initial: { dotnetBuild: [{ project: "Cascade.sln", expect: "fail", minErrors: 15 }] },
      final: {
        dotnetBuild: [{ project: "Cascade.sln", expect: "pass" }],
        dotnetTest: [{ project: "Cascade.sln", expect: "pass" }],
      },
    },
    scoring: {
      precisionMode: "max-files",
      maxChangedFiles: 2,
      maxUnnecessaryFiles: 0,
      rootCausePatterns: ["brace", "Open"],
    },
  });
}

function cascadeSource(closed) {
  const methods = [];
  for (let i = 1; i <= 18; i++) {
    methods.push(`    public int Slot${i}()
    {
        var value = ${i};
        return value + ${i};
    }`);
  }
  return `namespace Cascade;

public sealed class ReportBuilder
{
    public int Open()
    {
        var seed = 1;
        if (seed > 0)
        {
            seed += 1;
        }
        return seed;
${closed ? "    }\n" : ""}
    public int Line(int index) => 10 + index;

    public int SumThrough(int n)
    {
        var total = 0;
        for (var i = 1; i <= n; i++) total += i;
        return total;
    }

    public string Label(bool ready) => ready ? "ok" : "wait";

${methods.join("\n\n")}
}
`;
}

function syn004() {
  const id = "SYN-004";
  prompt(
    id,
    "Fix compile errors without changing behavior",
    `The project does not compile. Fix the errors so it builds and the existing tests pass.

Do not modify behavior unnecessarily. A behavior change that is not required to compile is a wrong fix, even if it looks like a cleanup. Do not edit the tests.

Run \`dotnet test\`.`,
  );
  rubric(
    id,
    `# SYN-004

The compile error is the missing closing parenthesis on ToList(. PreferredDiscount uses integer division. That compiles and is locked by the visible test and by the hidden restraint test. Gold does not "correct" it.`,
  );
  const g = guid();
  add(`tasks/${id}/workspace/Restraint.sln`, sln("Restraint", [
    { name: "Restraint", path: "src/Restraint/Restraint.csproj", guid: g },
    { name: "Restraint.Tests", path: "tests/Restraint.Tests/Restraint.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Restraint/Restraint.csproj`, csproj());
  add(`tasks/${id}/workspace/tests/Restraint.Tests/Restraint.Tests.csproj`, testproj(["../../src/Restraint/Restraint.csproj"]));
  add(`tasks/${id}/workspace/src/Restraint/UserDirectory.cs`, directorySource(false));
  add(`tasks/${id}/gold/src/Restraint/UserDirectory.cs`, directorySource(true));
  add(
    `tasks/${id}/workspace/tests/Restraint.Tests/DirectoryTests.cs`,
    `namespace Restraint.Tests;

public class DirectoryTests
{
    [Fact]
    public void Names_are_projected()
    {
        var names = new Restraint.UserDirectory().Names();
        Assert.Equal(new[] { "John", "Jane" }, names);
    }

    [Fact]
    public void Preferred_discount_keeps_current_results()
    {
        var directory = new Restraint.UserDirectory();
        Assert.Equal(0m, directory.PreferredDiscount(50));
        Assert.Equal(1m, directory.PreferredDiscount(150));
        Assert.Equal(2m, directory.PreferredDiscount(200));
    }
}
`,
  );
  add(
    `tasks/${id}/hidden/RestraintHiddenTests.cs`,
    `namespace Restraint.Tests;

public class RestraintHiddenTests
{
    [Fact]
    public void Integer_discount_behavior_is_preserved()
    {
        var directory = new Restraint.UserDirectory();
        Assert.Equal(0m, directory.PreferredDiscount(99));
        Assert.Equal(3m, directory.PreferredDiscount(399));
    }
}
`,
  );
  add(`tasks/${id}/gold/ANSWER.md`, "Names() was missing the closing parenthesis and semicolon on ToList. PreferredDiscount still uses integer division; that behavior is covered by tests and was left unchanged.\n");
  manifest({
    id,
    title: "Syntax repair with a semantic restraint trap",
    tier: 1,
    category: "syntax",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "Fix the compile error. Do not rewrite the discount behavior that already compiles.",
    symptom: "Names() does not compile because ToList( is unclosed.",
    rootCause: "A missing parenthesis, plus an unrelated integer-division discount that is intentional current behavior.",
    correctFix: "Close the ToList call. Do not change PreferredDiscount or the tests.",
    hiddenCopy: [{ from: "RestraintHiddenTests.cs", to: "tests/Restraint.Tests/RestraintHiddenTests.cs" }],
    checks: {
      initial: { dotnetBuild: [{ project: "Restraint.sln", expect: "fail" }] },
      final: {
        dotnetBuild: [{ project: "Restraint.sln", expect: "pass" }],
        dotnetTest: [
          { project: "Restraint.sln", expect: "pass" },
          { project: "Restraint.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "touch-list", allowedFiles: ["src/Restraint/UserDirectory.cs"], maxUnnecessaryFiles: 0 },
  });
}

function directorySource(fixed) {
  return `namespace Restraint;

public sealed class User
{
    public string Name { get; init; } = "";
}

public sealed class UserDirectory
{
    public List<string> Names()
    {
        var users = new List<User>
        {
            new User { Name = "John" },
            new User { Name = "Jane" }
        };
        return users.Select(x => x.Name).ToList(${fixed ? ");" : "("}
    }

    public decimal PreferredDiscount(int points) => points / 100;
}
`;
}

function syn005() {
  const id = "SYN-005";
  prompt(
    id,
    "Fix the React syntax errors",
    `This React TypeScript project does not build. UserCard.tsx and UserList.tsx contain syntax errors: a malformed string, a bad generic, a missing JSX close, a missing parenthesis, and a missing brace that cascades.

Fix the syntax only. Do not change rendered text or helper results. Run \`npm run build\` and \`npm test\`.`,
  );
  rubric(id, "# SYN-005\n\nReact/TSX counterpart of the independent-plus-cascade syntax tasks. Gold restores the original helpers and JSX without changing copy.\n");
  const cfg = reactConfig();
  add(`tasks/${id}/workspace/package.json`, reactPackage("syn-005"));
  add(`tasks/${id}/workspace/tsconfig.json`, cfg["tsconfig.json"]);
  add(`tasks/${id}/workspace/vitest.config.ts`, cfg["vitest.config.ts"]);
  add(`tasks/${id}/workspace/src/format.ts`, formatSource(true));
  add(`tasks/${id}/workspace/src/UserCard.tsx`, userCard(false));
  add(`tasks/${id}/workspace/src/UserList.tsx`, userList(false));
  add(`tasks/${id}/gold/src/UserCard.tsx`, userCard(true));
  add(`tasks/${id}/gold/src/UserList.tsx`, userList(true));
  add(
    `tasks/${id}/workspace/tests/format.test.ts`,
    `import { displayName, activeLabels } from "../src/format";

describe("format", () => {
  it("keeps display text", () => {
    expect(displayName("Ada")).toBe("User: Ada");
    expect(activeLabels(["Ada", "Grace"])).toEqual(["Ada", "Grace"]);
  });
});
`,
  );
  add(`tasks/${id}/gold/ANSWER.md`, "UserCard had a bad generic, an unclosed string, a missing parenthesis, and an unclosed JSX tag. UserList was missing the closing brace of its helper. No copy or behavior was changed.\n");
  manifest({
    id,
    title: "React and TSX syntax repair",
    tier: 1,
    category: "syntax",
    difficulty: "medium",
    languages: ["react", "typescript"],
    summary: "Independent TSX syntax errors plus one missing brace. Fix syntax only.",
    symptom: "tsc cannot parse the components.",
    rootCause: "Syntax errors in UserCard.tsx and a missing brace in UserList.tsx.",
    correctFix: "Repair the syntax and leave strings and helper results unchanged.",
    checks: {
      initial: { npm: [{ script: "build", expect: "fail" }] },
      final: { npm: [{ script: "build", expect: "pass" }, { script: "test", expect: "pass" }] },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0 },
  });
}

function formatSource() {
  return `export function displayName(name: string): string {
  return \`User: \${name}\`;
}

export function activeLabels(names: string[]): string[] {
  return names.filter((name) => name.length > 0);
}
`;
}

function userCard(fixed) {
  if (!fixed) {
    return `import { displayName } from "./format";

type Badge<T = { label: string };
const badge: Badge = { label: "member" };

export function UserCard(props: { name: string }) {
  const note = "member;
  const title = displayName(props.name;
  return (
    <article className="card">
      <h2>{title}</h2>
      <span>{badge.label}</span>
  );
}
`;
  }
  return `import { displayName } from "./format";

type Badge<T = { label: string }> = T;
const badge: Badge = { label: "member" };

export function UserCard(props: { name: string }) {
  const title = displayName(props.name);
  return (
    <article className="card">
      <h2>{title}</h2>
      <span>{badge.label}</span>
    </article>
  );
}
`;
}

function userList(fixed) {
  return `import { activeLabels } from "./format";
import { UserCard } from "./UserCard";

export function labels(names: string[]): string[] {
  const cleaned = activeLabels(names);
  return cleaned.map((name) => name.trim());
${fixed ? "}\n" : ""}
export function UserList(props: { names: string[] }) {
  return (
    <ul>
      {labels(props.names).map((name) => (
        <li key={name}>
          <UserCard name={name} />
        </li>
      ))}
    </ul>
  );
}
`;
}
