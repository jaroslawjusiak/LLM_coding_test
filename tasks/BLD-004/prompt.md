# Upgrade WidgetKit to v2

WidgetKit in `libs/WidgetKit` is already v2. The application still calls the v1 API, and its package reference does not restore.

Read `docs/widgetkit-v2.md`. Upgrade the application to v2, fix the package reference, and make the build and tests pass.

Do not change files under `libs/WidgetKit`. Do not take the target framework backwards.

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write `ANSWER.md` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
