# Fix the React access and delivery bugs

The project builds. `npm test` fails.

Two bugs are visible in the tests:

- non-admin users are treated as admins
- delivery labels are shifted by one hour even though the requirement is UTC

Fix both. Do not change the test expectations. Run `npm test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
