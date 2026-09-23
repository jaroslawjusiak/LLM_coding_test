# BUG-004

Commit C added a direct send on top of the outbox enqueue. The visible test only calls Dispatch and therefore stays green. Gold removes the direct send and adds a regression test that flushes the processor. The prompt names `tests/Notify.Tests/DuplicateEmailRegressionTests.cs` because `requireFile` locks that path, and `regressionTestPatterns` awards the regression-test points for what a changed test file says rather than for what it is called. The misleading log is a NullReferenceException in UserService from an older incident.
