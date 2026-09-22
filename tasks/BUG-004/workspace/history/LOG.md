# History

- 001 initial: direct send. No duplicates.
- 002 feature: outbox processor. Dispatcher only enqueues. Tests flush the processor.
- 003 bug: a timeout workaround sends immediately and also enqueues. Duplicates start here. The visible test was narrowed so it no longer flushes.
