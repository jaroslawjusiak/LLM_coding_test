# Duplicate emails since the last release

Since the last release, users occasionally receive duplicate emails.

The project builds and the existing tests pass. That is not sufficient. Read `docs/notifications.md` and `history/`. The sample log in `diagnostics/sample-log.txt` is from an earlier incident and may not be the current defect.

Identify the root cause, fix it, and add a regression test in `tests/Notify.Tests/DuplicateEmailRegressionTests.cs`. Preserve the outbox design: dispatch enqueues, and the outbox processor is the only component that sends. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
