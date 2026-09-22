# Fix the dependency failures

Build the project and fix every dependency issue that prevents the build.

Inspect the restore errors, change the package references, build again, and repeat until the build is clean. Do not remove a package that the code uses. Do not upgrade the target framework.

Run `dotnet test` when the build succeeds.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
