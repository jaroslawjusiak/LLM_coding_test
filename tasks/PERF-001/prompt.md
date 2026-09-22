# Speed up order matching

MatchOrders is correct but too slow. For large user and order sets it must not scan every order for every user.

Keep the same matches. A hidden check counts how many times Order.UserId is read; a nested loop will fail it. Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
