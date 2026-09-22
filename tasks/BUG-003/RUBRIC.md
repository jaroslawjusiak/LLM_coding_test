# BUG-003

docker-compose sets ConnectionStrings__Database. The app reads ConnectionStrings:Orders. Local appsettings.json is correct. Gold renames the compose environment variable. A hidden test rejects edits to AppConfig.cs.
