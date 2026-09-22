# Gaps

1. Subscribe is implemented for email.
2. SMS is missing. Subscribe rejects non-email channels, and SmsChannel is never called.
3. Retry is incorrect. A failed delivery is attempted once, not three times.
4. Duplicate suppression is missing. A second Send delivers again.
5. Delivery attempts are only partially recorded. Successes are stored and failures are dropped.
6. Unsubscribe is missing.
7. Processing is synchronous. Send blocks the caller and does not queue work.
