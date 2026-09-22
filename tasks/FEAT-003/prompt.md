# Support multiple phone numbers per user

Users currently have a single Phone column. Add support for multiple phone numbers per user.

Required model:
- UserPhoneNumber with UserId, Number, and Kind.
- A user has many phone numbers.
- Existing Phone values must be copied into a phone-number row by a migration. Map a non-empty Phone to Kind "mobile".
- Add POST /api/users/{id}/phones with { "number": "...", "kind": "mobile" } and GET /api/users/{id}/phones.
- Update the EF model, DbContext, migration, and tests.

Use SQLite and `Database.Migrate()`. Do not switch the app to EnsureCreated. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
