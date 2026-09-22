# Fix the cascading compiler errors

`dotnet build` reports a large cascade of compiler errors. One structural mistake causes them.

Fix the structural mistake. Do not rewrite the methods and do not "fix" every reported line independently. Run `dotnet test` after the project builds.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
