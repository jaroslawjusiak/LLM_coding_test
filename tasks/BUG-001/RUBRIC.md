# BUG-001

Symptom: UserService appears to null-ref or return a bad email.
Root cause: UserCache is constructed with stale seed entries and returns them forever.
Correct fix: stop treating seeds as live hits. Keep caching of actual database reads. A null check in UserService passes the visible id-42 case only if the seed email is null, and fails the hidden id-7 case where the stale email is non-null.

The visible test only covers id 42. Hidden covers id 7 and the second-read cache hit.
