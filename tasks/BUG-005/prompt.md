# Unknown users return HTTP 500

`GET /users/{id}` returns HTTP 500 when the user does not exist. It should return 404. Known users must keep the current response.

Fix that bug. Do not change any other behavior. Do not reformat unrelated files. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
