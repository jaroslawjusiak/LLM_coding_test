# Accounts

GET /api/users/{id} returns a user.
GET /api/audit returns audit events.
Authentication is the X-Role header.

POST /api/users/{id}/deactivation deactivates an active user. Admin only. Body: { "reason": "..." }.
