# Add user account deactivation

Add support for user account deactivation. Do not assume a file list; follow the structure already in the repository.

Contract:
- POST /api/users/{id}/deactivation
- Use the existing X-Role header authentication. Only Admin may call it.
- Body: { "reason": string }, required, 1 to 500 characters.
- 204 when an active user is deactivated.
- 400 when the body is missing or the reason is empty or longer than 500 characters.
- 403 when the caller is authenticated but not Admin.
- 404 when the user does not exist.
- 409 when the user is already deactivated.
- Record an audit event through the existing IAuditLog. Action must be "user.deactivated". Include the user id and the reason. Events are readable at GET /api/audit.
- Document the endpoint in README.md.
- Add tests.

Seeded user 4 is active. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
