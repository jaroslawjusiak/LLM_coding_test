# Change Customer.Id from int to Guid

Change Customer.Id from int to Guid.

First write IMPACT.md listing every part of this repository that the change can affect. Then implement the change.

Preserve existing rows by mapping each integer id to `new Guid(id, 0, 0, new byte[8])`. Add an EF migration; do not rely on EnsureCreated. Routes, DTOs, the cache, the webhook contract, logs, fixtures, and wwwroot/customer.js must accept Guid values.

Run `dotnet test`.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
