# LLM coding benchmark

A reviewable v1 benchmark for coding agents. Every task is a small C# or React repository with a failing or incomplete behavior, a known good patch, and a local scorer. There is no Python in the tasks or the scorer.

The scorer is a Node 22 CLI. C# tasks are compiled and tested with the .NET 8 SDK. React tasks are typechecked and tested with TypeScript and Vitest. GitHub Actions runs both.

## Do not leak the answers

A model must see only a packaged prompt and that task's `workspace/`.

Do not point a model at this repository, at `tasks/`, or at any `gold/`, `hidden/`, `RUBRIC.md`, or `task.json`. Those files exist so a human can review the fixture and so the scorer can grade a finished workspace.

```bash
node harness/src/cli.ts package BUG-001 --out /tmp/packaged
```

Give the model `/tmp/packaged/BUG-001/PROMPT.md` and `/tmp/packaged/BUG-001/workspace/`. Score the edited workspace from this repo:

```bash
node harness/src/cli.ts score BUG-001 --workspace /tmp/packaged/BUG-001/workspace --model <name>
```

`score` copies the workspace before running anything. Hidden tests are copied into that temporary copy only. They are never written back to the model workspace.

`run` drives a model over an OpenAI compatible endpoint and re-prompts it with the checks that still fail. Hidden suites are reported to the model as a pass count only. Their test names, assertion messages, and expected values are never sent, because that text is the answer.

## Layout

```text
tasks/<id>/
  prompt.md     # the only instructions the model should see
  workspace/    # the repository the model edits
  hidden/       # tests applied only at score time
  gold/         # overlay that must pass, used by verify
  RUBRIC.md     # reviewer notes, not a model input
  task.json     # checks and scoring rules
harness/        # Node scorer
tools/          # generators that materialize tasks/
```

`node tools/materialize.mjs` rewrites `tasks/` from the generators. The committed `tasks/` directory is the fixture under review.

## Run the scorer

Node 22 or newer. The .NET 8 SDK is required for C# tasks.

```bash
node harness/src/cli.ts list
node harness/src/cli.ts weights --markdown
node harness/src/cli.ts verify --task SYN-005
node harness/src/cli.ts verify
```

`weights` prints what each task can score before anything is compiled: the weight of every dimension, the maximum, and the dimensions the task does not declare. It runs no tools, so it works on a machine without the .NET SDK.

`verify` checks two things:

1. The untouched workspace matches the declared initial result. A bug task's visible tests fail, or pass when the prompt says the happy path is green. A syntax task does not build.
2. Applying `gold/` produces the declared final result, including hidden tests, and the gold submission scores full marks on the checks that task declares.

`verify --allow-missing-dotnet` skips tasks whose toolchain is missing, `dotnet` for C# and `npm` for React. It does not pretend those tasks passed a compile.

## What a report contains

- build, initial and final
- tests, initial and final
- files changed, lines added, lines removed, with a per file breakdown
- hidden tests
- unnecessary changes
- root cause identified
- regression test added
- final explanation
- every check that ran, with the reason behind a failure or a skip
- score, with the weight each dimension contributed and the dimensions the task does not declare

`Initial` states answer "did the untouched workspace match what the task declares", not "did the tests pass". A task that must start red reports `PASS` for its initial state when it is red.

Line counts are a diff against the untouched workspace, so the `ANSWER.md` a prompt asks for is counted as added lines. The per file breakdown names every file behind the total.

A check that could not run is reported as `SKIP`, never as a pass. `SKIP` earns no points, the report opens with an environment warning, and `score` repeats it on stderr, because a score measured on a broken machine is not comparable to one measured on a working one. `run` stops instead of asking the model to fix a machine. Three things are treated as the machine rather than the model:

- `dotnet` or `npm` is not on PATH.
- The package source or registry could not be reached, or the installed SDK cannot target `net8.0` (`NU1301`, `NETSDK1045`, `MSB3644`, `EAI_AGAIN`). "Package or version not found" (`NU1101`, `NU1102`, npm 404) is deliberately not in this list: that is a content failure, and it is the intended defect of BLD-003.
- Nothing classified as environmental when the compiler or the test runner did produce results, so a real red build or a failing test is never excused.

A run the tool reported as successful but whose summary this harness could not count is `WARN`, and it keeps its points. `DOTNET_CLI_UI_LANGUAGE` is pinned to `en` for that reason: a localized CLI prints `Zaliczono: 5` instead of `Passed: 5`, which the parser reads as zero tests, which used to turn a passing submission into a failed check.

A red baseline has to prove why it is red, or any collapse of the run counts as the expected defect:

- `minErrors` with `errorPattern` restricts the count to one family of error codes, so `"minErrors": 1, "errorPattern": "NU"` says BLD-003 is red because a package does not restore, and `"minErrors": 3, "errorPattern": "CS"` says BLD-002 is red because of three compiler errors.
- `minFailedTests` requires that many failed tests, so a baseline that never reached the test runner does not pass for being red.

Every `expect: "fail"` baseline in the catalog now declares one of the two, except BLD-005 and SYN-003, whose existing `minErrors` values were tuned against real compiler output and are left alone rather than guessed at.

Dimensions that a task does not declare are left out of the score, so a gold patch is not penalized for a check the task never asked for. That is why a syntax task can score 25/45 on a machine without the SDK: only the dimensions the task declares are in `maxScore`.

Two dimensions deserve a note:

- `gates` covers checks no other dimension reaches, such as SYN-001's `json` parse and BUG-004's required file. It is 0 by default and a task opts in with `scoring.weights.gates`, so a declared check is never free.
- `regressionTest` is awarded for what a changed test file says, not for what it is called. `scoring.regressionTestPatterns` are matched against the content of changed test files; without them the only evidence is a filename containing `regress` or `duplicate`. Analysis tasks score the written findings and whether the code was left unchanged. Refactor tasks keep behavior tests and hidden boundaries green, and they must reduce nesting or file length. Performance tasks use counters, not timers.

## Catalog

31 tasks. Tiers follow the review plan: syntax, build, small bugs, spec gaps, multi-file features, refactors, security, and performance.

| ID | Title | Tier | Languages | What the scorer locks |
| --- | --- | --- | --- | --- |
| SYN-001 | Trivial JSON syntax repair | 1 | C# | Invalid `appsettings.json` fails to load; the repaired file parses and the tests pass. |
| SYN-002 | Several independent C# syntax errors | 1 | C# | One syntax error in each of six files. The build is red until all six are repaired. |
| SYN-003 | Cascading compiler errors from one structural mistake | 1 | C# | One missing brace breaks the build across several members. The gold patch closes that brace and does not rewrite the methods. |
| SYN-004 | Syntax repair with a semantic restraint trap | 1 | C# | Closing `ToList` is enough. A hidden test locks the integer discount so a speculative rewrite fails. |
| SYN-005 | React and TSX syntax repair | 1 | React | `tsc` fails on the broken components and passes after the gold repair. |
| BLD-001 | One build error | 2 | C# | A single type error. The gold patch builds and tests. |
| BLD-002 | Three independent build errors | 2 | C# | Missing project reference, wrong namespace, and a missing partial file. |
| BLD-003 | Dependency version conflict | 2 | C# | `Newtonsoft.Json` 99.0.0 does not restore. Gold pins 13.0.3. |
| BLD-004 | Dependency upgrade with breaking API changes | 4 | C# | Call sites move to `WidgetFactory` / `ExecuteAsync`. `libs/WidgetKit` is not edited. |
| BLD-005 | Misleading cascading project errors | 2 | C# | `<Compile Remove="GlobalUsings.cs" />` removes implicit usings. The answer must name that exclusion. |
| BUG-001 | Symptom versus root cause in the user cache | 2 | C# | Visible test shows the null email. Hidden tests lock id 7 and a second read with one database read. |
| BUG-002 | React role check and delivery-time bugs | 2 | React | `"SuperAdmin"` is always truthy, and the clock adds an hour. |
| BUG-003 | Docker environment mismatch | 2 | C# | Compose sets `ConnectionStrings__Database`; the app reads `ConnectionStrings:Orders`. A hash locks `AppConfig.cs`. |
| BUG-004 | Regression: duplicate emails | 4 | C# | Visible tests stay green. Hidden tests require enqueue-only dispatch, and the prompt names the regression test file that `requireFile` locks. |
| BUG-005 | Surgical fix for unknown-user HTTP 500 | 2 | C# | The action dereferences a missing user. Touch only `UsersController.cs` and return 404. |
| SPEC-001 | Notification spec versus implementation | 3 | C# | Do not edit code. Report SMS, retry, duplicates, attempt recording, unsubscribe, and synchronous send. |
| SPEC-002 | Test-driven payment service | 1 | C# | Implement charge, cancel, retry, and dedupe. Hidden cases cover null, zero, duplicate id, and a large decimal. |
| SPEC-003 | Find the account-deletion authorization chain | 3 | C# | Name the controller, service, and handler. The cleanup job is a decoy. |
| SPEC-004 | Conflicting test versus README | 3 | C# | Empty cart is documented as 200 and `[]`. Visible tests still expect 400. |
| SPEC-005 | Ambiguous password-reset request | 5 | C# | Full marks are questions in `ANSWER.md` and no code changes. |
| FEAT-001 | Multi-file account deactivation | 3 | C# | Add the admin endpoint, validation, audit event, tests, and a README note. No file list is given. |
| FEAT-002 | Conform the orders client to the API contract | 2 | React | Send `Authorization: Bearer` and `{ customerId, items }`, matching the OpenAPI file. |
| FEAT-003 | Multiple phone numbers migration | 4 | C# | Migration backfills the legacy `Phone` column. `EnsureCreated` does not count. |
| FEAT-004 | Customer.Id int to Guid | 5 | C# | Write `IMPACT.md`, then map each integer with `new Guid(id, 0, 0, new byte[8])`. |
| REF-001 | Refactor nested order processing | 3 | C# | Flatten the method. Hidden tests lock the current totals. |
| REF-002 | Refactor the React checkout component | 3 | React | Same rule for the React quote function. |
| REF-003 | Refactor the billing god class | 3 | C# | Split the long file without changing invoice totals. |
| SEC-001 | Security audit, do not modify | 4 | C#, React | Do not edit code. Report SQL injection, path traversal, missing admin role, password logging, and XSS. |
| SEC-002 | Fix the security issues | 4 | C#, React | The same five issues, now with hidden tests. |
| PERF-001 | Algorithmic order matching | 4 | C# | `Order.UserId` is counted. A nested loop fails. No timer. |
| PERF-002 | N+1 fetches and repeated filters | 4 | React | One index, and the documented `userIds` bulk endpoint. No timer. |

## Pins

C# tasks target `net8.0`. Test packages are Microsoft.NET.Test.Sdk 17.11.1, xunit 2.9.2, and xunit.runner.visualstudio 2.8.2. EF Core Sqlite and the ASP.NET test host are 8.0.0 or 8.0.11.

React tasks use React 18.3.1, TypeScript 5.7.3, and Vitest 2.1.8. The scorer has no npm dependencies of its own.
