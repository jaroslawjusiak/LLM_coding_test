# Implement the payment service

The tests describe the required behavior. PaymentService.ChargeAsync throws NotImplementedException.

Implement it so the tests pass. Handle null orders, do not charge a cancelled order, retry a transient gateway failure up to three attempts, and do not charge the same payment id twice.

Run `dotnet test`. There may be additional cases beyond the tests you can see; implement the service properly rather than hard-coding the visible examples.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
