# Fix the user lookup bug

The project builds. `dotnet test` fails.

`GetUser` throws or returns a user whose email does not match the database. The stack trace points at `UserService`. A null check there is not necessarily the fix.

Find the root cause, fix it, and keep caching real database reads. Do not delete the cache. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
