# BUG-004

Commit C added a direct send on top of the outbox enqueue. The visible test only calls Dispatch and therefore stays green. Gold removes the direct send and adds a regression test that flushes the processor. The misleading log is a NullReferenceException in UserService from an older incident.
