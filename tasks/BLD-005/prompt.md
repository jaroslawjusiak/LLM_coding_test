# Fix the misleading build cascade

Build the solution and fix the issues preventing it from building.

The compiler reports many missing-type errors. They are cascading. Find the root cause instead of adding a using directive to every file. Run `dotnet test` after the build succeeds.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
