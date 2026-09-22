Customer.Id is now a Guid. Existing integer ids map with new Guid(id, 0, 0, new byte[8]). IMPACT.md lists the affected database, API, cache, webhook, logs, tests, and frontend parser.
