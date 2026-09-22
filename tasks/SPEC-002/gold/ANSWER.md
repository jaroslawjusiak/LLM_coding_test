ChargeAsync now skips cancelled and non-positive amounts, retries transient failures three times, and records a payment id so a duplicate charge is not sent to the gateway.
