# Remove the N+1 work

Two client functions are correct and expensive:

- groupActive filters the full order list once per user
- loadOrders calls the single-user endpoint once per user

docs/orders-api.md describes GET /api/orders?userIds=1,2,3. Use it, and group orders without a nested filter. Functional results must stay the same. Run `npm test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
