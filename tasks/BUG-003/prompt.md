# The app fails only in Docker

The application works locally and fails when started with the provided Docker Compose environment.

`dotnet test` shows the failure. Decide whether the defect is application code, configuration, the container environment, networking, a dependency, or the database. Fix the root cause.

Do not change local behavior. Application code is not the defect unless you can prove it. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
