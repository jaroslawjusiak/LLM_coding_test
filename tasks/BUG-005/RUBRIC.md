# BUG-005

Surgical task. UsersController dereferences a missing user. Gold returns NotFound before mapping. The known-user test locks the response shape. There are extra projects so a broad rewrite is visible in the diff.
