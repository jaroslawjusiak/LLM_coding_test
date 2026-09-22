# Fix three independent build errors

Build the solution and fix every issue preventing it from building. There are three independent root causes:

- a project reference is missing
- a type is in the wrong namespace
- a generated partial file is missing

Fix each root cause. Do not paper over a missing type by deleting the caller. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
