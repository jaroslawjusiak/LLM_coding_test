# Notifications

Delivery is durable.

1. `NotificationDispatcher.Dispatch` enqueues a message.
2. `OutboxProcessor.Flush` is the only component that calls the email client.
3. A message id is sent at most once.
