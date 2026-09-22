import { createHash } from "node:crypto";
import { add, csproj, guid, manifest, prompt, reactConfig, reactPackage, rubric, sln, testproj, webproj } from "./lib.mjs";

export function bugTasks() {
  bug001();
  bug002();
  bug003();
  bug004();
  bug005();
}

function bug001() {
  const id = "BUG-001";
  prompt(
    id,
    "Fix the user lookup bug",
    `The project builds. \`dotnet test\` fails.

\`GetUser\` throws or returns a user whose email does not match the database. The stack trace points at \`UserService\`. A null check there is not necessarily the fix.

Find the root cause, fix it, and keep caching real database reads. Do not delete the cache. Run \`dotnet test\`.`,
  );
  rubric(id, `# BUG-001

Symptom: UserService appears to null-ref or return a bad email.
Root cause: UserCache is constructed with stale seed entries and returns them forever.
Correct fix: stop treating seeds as live hits. Keep caching of actual database reads. A null check in UserService passes the visible id-42 case only if the seed email is null, and fails the hidden id-7 case where the stale email is non-null.

The visible test only covers id 42. Hidden covers id 7 and the second-read cache hit.`);
  const lib = guid();
  add(`tasks/${id}/workspace/CacheBug.sln`, sln("CacheBug", [
    { name: "CacheBug", path: "src/CacheBug/CacheBug.csproj", guid: lib },
    { name: "CacheBug.Tests", path: "tests/CacheBug.Tests/CacheBug.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/CacheBug/CacheBug.csproj`, csproj());
  add(`tasks/${id}/workspace/tests/CacheBug.Tests/CacheBug.Tests.csproj`, testproj(["../../src/CacheBug/CacheBug.csproj"]));
  add(`tasks/${id}/workspace/src/CacheBug/UserService.cs`, userService(false));
  add(`tasks/${id}/gold/src/CacheBug/UserService.cs`, userService(true));
  add(`tasks/${id}/workspace/tests/CacheBug.Tests/UserServiceTests.cs`, `namespace CacheBug.Tests;

public class UserServiceTests
{
    [Fact]
    public async Task GetUser_returns_the_database_email()
    {
        var db = new CacheBug.Database();
        var service = new CacheBug.UserService(new CacheBug.UserCache(), db);
        var user = await service.GetUserAsync(42);
        Assert.NotNull(user);
        Assert.Equal(42, user.Id);
        Assert.Equal("ada@example.com", user.Email);
    }
}
`);
  add(`tasks/${id}/hidden/CacheHiddenTests.cs`, `namespace CacheBug.Tests;

public class CacheHiddenTests
{
    [Fact]
    public async Task Stale_non_null_cache_entries_are_not_returned()
    {
        var db = new CacheBug.Database();
        var service = new CacheBug.UserService(new CacheBug.UserCache(), db);
        var user = await service.GetUserAsync(7);
        Assert.Equal("grace@example.com", user!.Email);
    }

    [Fact]
    public async Task A_second_read_does_not_hit_the_database()
    {
        var db = new CacheBug.Database();
        var service = new CacheBug.UserService(new CacheBug.UserCache(), db);
        await service.GetUserAsync(3);
        await service.GetUserAsync(3);
        Assert.Equal(1, db.Reads);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "UserService was only the symptom. UserCache seeded stale users, including a null email for id 42 and a wrong email for id 7, and never expired them. Seeds are no longer returned as hits. Database reads are still cached.\n");
  manifest({
    id,
    title: "Symptom versus root cause in the user cache",
    tier: 2,
    category: "debug",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "The stack trace points at UserService. The cache is seeded with stale users and never invalidates them.",
    symptom: "GetUser returns a user with a missing or wrong email. A null check looks sufficient.",
    rootCause: "UserCache constructor seeds live entries that shadow the database.",
    correctFix: "Do not serve seed entries. Keep caching genuine database reads.",
    hiddenCopy: [{ from: "CacheHiddenTests.cs", to: "tests/CacheBug.Tests/CacheHiddenTests.cs" }],
    checks: {
      initial: {
        dotnetBuild: [{ project: "CacheBug.sln", expect: "pass" }],
        dotnetTest: [{ project: "CacheBug.sln", expect: "fail" }],
      },
      final: {
        dotnetBuild: [{ project: "CacheBug.sln", expect: "pass" }],
        dotnetTest: [
          { project: "CacheBug.sln", expect: "pass" },
          { project: "CacheBug.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0, rootCausePatterns: ["cache", "seed"] },
  });
}

function userService(fixed) {
  const seeds = fixed
    ? ""
    : `[42] = new User { Id = 42, Name = "Ada", Email = null },
        [7] = new User { Id = 7, Name = "Grace", Email = "grace.old@example.com" }`;
  return `namespace CacheBug;

public sealed class User
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Email { get; init; }
}

public sealed class Database
{
    public int Reads { get; private set; }
    private readonly Dictionary<int, User> _rows = new()
    {
        [42] = new User { Id = 42, Name = "Ada", Email = "ada@example.com" },
        [7] = new User { Id = 7, Name = "Grace", Email = "grace@example.com" },
        [3] = new User { Id = 3, Name = "Lin", Email = "lin@example.com" }
    };

    public Task<User?> GetUserAsync(int id)
    {
        Reads++;
        return Task.FromResult(_rows.GetValueOrDefault(id));
    }
}

public sealed class UserCache
{
    private readonly Dictionary<int, User> _entries = new()
    {
        ${seeds}
    };

    public Task<User?> GetAsync(int id) => Task.FromResult(_entries.GetValueOrDefault(id));

    public Task SetAsync(int id, User user)
    {
        _entries[id] = user;
        return Task.CompletedTask;
    }
}

public sealed class UserService
{
    private readonly UserCache _cache;
    private readonly Database _database;

    public UserService(UserCache cache, Database database)
    {
        _cache = cache;
        _database = database;
    }

    public async Task<User?> GetUserAsync(int id)
    {
        var cached = await _cache.GetAsync(id);
        if (cached is not null) return cached;
        return await LoadAndCache(id);
    }

    private async Task<User?> LoadAndCache(int id)
    {
        var user = await _database.GetUserAsync(id);
        if (user is not null) await _cache.SetAsync(id, user);
        return user;
    }
}
`;
}

function bug002() {
  const id = "BUG-002";
  prompt(
    id,
    "Fix the React access and delivery bugs",
    `The project builds. \`npm test\` fails.

Two bugs are visible in the tests:

- non-admin users are treated as admins
- delivery labels are shifted by one hour even though the requirement is UTC

Fix both. Do not change the test expectations. Run \`npm test\`.`,
  );
  rubric(id, "# BUG-002\n\n`role == \"Admin\" || \"SuperAdmin\"` is always truthy in JavaScript. formatDelivery adds a hardcoded hour instead of reading UTC.\n");
  const cfg = reactConfig();
  add(`tasks/${id}/workspace/package.json`, reactPackage("bug-002"));
  add(`tasks/${id}/workspace/tsconfig.json`, cfg["tsconfig.json"]);
  add(`tasks/${id}/workspace/vitest.config.ts`, cfg["vitest.config.ts"]);
  add(`tasks/${id}/workspace/src/access.ts`, access(false));
  add(`tasks/${id}/gold/src/access.ts`, access(true));
  add(`tasks/${id}/workspace/src/AccessPanel.tsx`, `import { canSeeAdminPanel } from "./access";

export function AccessPanel(props: { role: string }) {
  if (!canSeeAdminPanel(props.role)) return <p>Restricted</p>;
  return <p>Admin tools</p>;
}
`);
  add(`tasks/${id}/workspace/tests/access.test.ts`, `import { canSeeAdminPanel, formatDelivery } from "../src/access";

describe("access", () => {
  it("does not treat every role as admin", () => {
    expect(canSeeAdminPanel("User")).toBe(false);
    expect(canSeeAdminPanel("Admin")).toBe(true);
    expect(canSeeAdminPanel("SuperAdmin")).toBe(true);
  });

  it("formats delivery in UTC", () => {
    expect(formatDelivery("2024-05-06T08:30:00Z")).toBe("08:30 UTC");
  });
});
`);
  add(`tasks/${id}/gold/ANSWER.md`, "The role check used || with a non-empty string, so every role was admin. formatDelivery added one hour instead of reading the UTC clock. Both are fixed; tests were not edited.\n");
  manifest({
    id,
    title: "React role check and delivery-time bugs",
    tier: 2,
    category: "debug",
    difficulty: "medium",
    languages: ["react", "typescript"],
    summary: "A truthy string makes every user an admin, and delivery labels are shifted by an hour.",
    symptom: "Tests fail for non-admin access and for an 08:30 UTC label.",
    rootCause: "|| \"SuperAdmin\" is always truthy. formatDelivery adds 60 minutes instead of using UTC accessors.",
    correctFix: "Compare both roles, and format with getUTCHours/getUTCMinutes.",
    checks: {
      initial: {
        npm: [
          { script: "build", expect: "pass" },
          { script: "test", expect: "fail" },
        ],
      },
      final: { npm: [{ script: "build", expect: "pass" }, { script: "test", expect: "pass" }] },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0 },
  });
}

function access(fixed) {
  return `export function canSeeAdminPanel(role: string): boolean {
  ${fixed ? 'return role === "Admin" || role === "SuperAdmin";' : 'return Boolean(role === "Admin" || "SuperAdmin");'}
}

export function formatDelivery(iso: string): string {
  const date = new Date(iso);
  ${fixed ? "const hours = date.getUTCHours();" : "const hours = date.getUTCHours() + 1;"}
  const minutes = date.getUTCMinutes();
  return \`\${String(hours).padStart(2, "0")}:\${String(minutes).padStart(2, "0")} UTC\`;
}
`;
}

function bug003() {
  const id = "BUG-003";
  const program = `using Microsoft.Extensions.Configuration;

namespace Acme.Orders;

public static class AppConfig
{
    public static string ResolveOrdersConnection(IConfiguration config) =>
        config.GetConnectionString("Orders")
        ?? throw new InvalidOperationException("Missing Orders connection string.");
}
`;
  const hash = createHash("sha256").update(program.replace(/\r/g, "")).digest("hex");
  prompt(
    id,
    "The app fails only in Docker",
    `The application works locally and fails when started with the provided Docker Compose environment.

\`dotnet test\` shows the failure. Decide whether the defect is application code, configuration, the container environment, networking, a dependency, or the database. Fix the root cause.

Do not change local behavior. Application code is not the defect unless you can prove it. Run \`dotnet test\`.`,
  );
  rubric(id, `# BUG-003

docker-compose sets ConnectionStrings__Database. The app reads ConnectionStrings:Orders. Local appsettings.json is correct. Gold renames the compose environment variable. A hidden test rejects edits to AppConfig.cs.`);
  const lib = guid();
  add(`tasks/${id}/workspace/DockerTrap.sln`, sln("DockerTrap", [
    { name: "Acme.Orders", path: "src/Acme.Orders/Acme.Orders.csproj", guid: lib },
    { name: "Acme.Orders.Tests", path: "tests/Acme.Orders.Tests/Acme.Orders.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Acme.Orders/Acme.Orders.csproj`, csproj(`  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Configuration" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.EnvironmentVariables" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Binder" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Acme.Orders/AppConfig.cs`, program);
  add(`tasks/${id}/workspace/src/Acme.Orders/appsettings.json`, `{
  "ConnectionStrings": {
    "Orders": "Host=localhost;Port=5432;Database=orders"
  }
}
`);
  add(`tasks/${id}/workspace/src/Acme.Orders/appsettings.Docker.json`, `{
  "ConnectionStrings": {
    "Orders": "Host=localhost;Port=5432;Database=orders"
  }
}
`);
  add(`tasks/${id}/workspace/Dockerfile`, `FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /src
COPY . .
ENV ASPNETCORE_ENVIRONMENT=Docker
CMD ["dotnet", "test"]
`);
  add(`tasks/${id}/workspace/docker-compose.yml`, compose(false));
  add(`tasks/${id}/gold/docker-compose.yml`, compose(true));
  add(`tasks/${id}/workspace/tests/Acme.Orders.Tests/Acme.Orders.Tests.csproj`, testproj(["../../src/Acme.Orders/Acme.Orders.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Configuration.EnvironmentVariables" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Acme.Orders.Tests/ConfigTests.cs`, configTests());
  add(`tasks/${id}/hidden/DockerCodeGuardTests.cs`, `using System.Security.Cryptography;
using System.Text;

namespace Acme.Orders.Tests;

public class DockerCodeGuardTests
{
    [Fact]
    public void Application_code_was_not_the_defect()
    {
        var source = File.ReadAllText(Find("src/Acme.Orders/AppConfig.cs"));
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(source.Replace("\\r", "")))).ToLowerInvariant();
        Assert.Equal("${hash}", hash);
    }

    private static string Find(string relative)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, relative.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException(relative);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Local appsettings already uses ConnectionStrings:Orders. Compose published ConnectionStrings__Database, so the container never overrode the localhost value. Renamed the environment variable. Application code was not changed.\n");
  manifest({
    id,
    title: "Docker environment mismatch",
    tier: 2,
    category: "configuration",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "The app works locally and fails in the provided Compose environment because the connection-string key does not match.",
    symptom: "Docker config still resolves Host=localhost.",
    rootCause: "Compose sets ConnectionStrings__Database while the app reads ConnectionStrings:Orders.",
    correctFix: "Rename the Compose environment variable. Do not change AppConfig.cs or local appsettings.",
    hiddenCopy: [{ from: "DockerCodeGuardTests.cs", to: "tests/Acme.Orders.Tests/DockerCodeGuardTests.cs" }],
    checks: {
      initial: {
        dotnetBuild: [{ project: "DockerTrap.sln", expect: "pass" }],
        dotnetTest: [{ project: "DockerTrap.sln", expect: "fail" }],
      },
      final: {
        dotnetTest: [
          { project: "DockerTrap.sln", expect: "pass" },
          { project: "DockerTrap.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: {
      precisionMode: "touch-list",
      allowedFiles: ["docker-compose.yml", "src/Acme.Orders/appsettings.Docker.json"],
      maxUnnecessaryFiles: 0,
      rootCausePatterns: ["ConnectionStrings", "Orders"],
    },
  });
}

function compose(fixed) {
  const key = fixed ? "ConnectionStrings__Orders" : "ConnectionStrings__Database";
  return `services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: orders
      POSTGRES_PASSWORD: orders
  api:
    build: .
    depends_on:
      - db
    environment:
      ASPNETCORE_ENVIRONMENT: Docker
      ${key}: Host=db;Port=5432;Database=orders
`;
}

function configTests() {
  return `using Microsoft.Extensions.Configuration;

namespace Acme.Orders.Tests;

public class ConfigTests
{
    [Fact]
    public void Local_config_uses_localhost()
    {
        var config = Build(includeCompose: false);
        Assert.Contains("Host=localhost", Acme.Orders.AppConfig.ResolveOrdersConnection(config));
    }

    [Fact]
    public void Compose_environment_points_at_the_db_service()
    {
        var config = Build(includeCompose: true);
        Assert.Contains("Host=db", Acme.Orders.AppConfig.ResolveOrdersConnection(config));
    }

    private static IConfiguration Build(bool includeCompose)
    {
        var root = FindWorkspace();
        var builder = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(root, "src", "Acme.Orders"))
            .AddJsonFile("appsettings.json", optional: false);
        if (includeCompose)
        {
            builder.AddJsonFile("appsettings.Docker.json", optional: true);
            builder.AddInMemoryCollection(ReadComposeEnv(Path.Combine(root, "docker-compose.yml")));
        }
        return builder.Build();
    }

    private static Dictionary<string, string?> ReadComposeEnv(string path)
    {
        var values = new Dictionary<string, string?>();
        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (!line.Contains(':') || line.StartsWith("-") || line.StartsWith("image:") || line.StartsWith("build:") || line.EndsWith(":")) continue;
            var split = line.Split(':', 2);
            if (split.Length == 2 && split[0].Contains('_')) values[split[0].Trim().Replace("__", ":")] = split[1].Trim();
        }
        return values;
    }

    private static string FindWorkspace()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "docker-compose.yml"))) return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("workspace");
    }
}
`;
}

function bug004() {
  const id = "BUG-004";
  prompt(
    id,
    "Duplicate emails since the last release",
    `Since the last release, users occasionally receive duplicate emails.

The project builds and the existing tests pass. That is not sufficient. Read \`docs/notifications.md\` and \`history/\`. The sample log in \`diagnostics/sample-log.txt\` is from an earlier incident and may not be the current defect.

Identify the root cause, fix it, and add a regression test. Preserve the outbox design: dispatch enqueues, and the outbox processor is the only component that sends. Run \`dotnet test\`.`,
  );
  rubric(id, `# BUG-004

Commit C added a direct send on top of the outbox enqueue. The visible test only calls Dispatch and therefore stays green. Gold removes the direct send and adds a regression test that flushes the processor. The misleading log is a NullReferenceException in UserService from an older incident.`);
  const lib = guid();
  add(`tasks/${id}/workspace/Notify.sln`, sln("Notify", [
    { name: "Notify", path: "src/Notify/Notify.csproj", guid: lib },
    { name: "Notify.Tests", path: "tests/Notify.Tests/Notify.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Notify/Notify.csproj`, csproj());
  add(`tasks/${id}/workspace/tests/Notify.Tests/Notify.Tests.csproj`, testproj(["../../src/Notify/Notify.csproj"]));
  add(`tasks/${id}/workspace/docs/notifications.md`, `# Notifications

Delivery is durable.

1. \`NotificationDispatcher.Dispatch\` enqueues a message.
2. \`OutboxProcessor.Flush\` is the only component that calls the email client.
3. A message id is sent at most once.
`);
  add(`tasks/${id}/workspace/history/LOG.md`, `# History

- 001 initial: direct send. No duplicates.
- 002 feature: outbox processor. Dispatcher only enqueues. Tests flush the processor.
- 003 bug: a timeout workaround sends immediately and also enqueues. Duplicates start here. The visible test was narrowed so it no longer flushes.
`);
  add(`tasks/${id}/workspace/history/003-bug.diff`, `--- a/src/Notify/NotificationDispatcher.cs
+++ b/src/Notify/NotificationDispatcher.cs
@@
-    public void Dispatch(Notification note) => _outbox.Enqueue(note);
+    public void Dispatch(Notification note)
+    {
+        _email.Send(note);
+        _outbox.Enqueue(note);
+    }
`);
  add(`tasks/${id}/workspace/diagnostics/sample-log.txt`, `2024-04-02T10:11:02Z ERR NullReferenceException in UserService.cs line 40
2024-04-02T10:11:02Z INF recovered user 18 from replica
This log is from the April incident. It was fixed before the duplicate-email reports started.
`);
  add(`tasks/${id}/workspace/src/Notify/Notifications.cs`, notifications(false));
  add(`tasks/${id}/gold/src/Notify/Notifications.cs`, notifications(true));
  add(`tasks/${id}/workspace/tests/Notify.Tests/DispatchTests.cs`, `namespace Notify.Tests;

public class DispatchTests
{
    [Fact]
    public void Dispatch_sends_the_template()
    {
        var email = new Notify.RecordingEmail();
        var dispatcher = new Notify.NotificationDispatcher(email, new Notify.Outbox());
        dispatcher.Dispatch(new Notify.Notification("n-1", "ada@example.com", "hello"));
        Assert.Contains(email.Sent, message => message.Id == "n-1");
    }
}
`);
  add(`tasks/${id}/gold/tests/Notify.Tests/DispatchTests.cs`, `namespace Notify.Tests;

public class DispatchTests
{
    [Fact]
    public void Dispatch_enqueues_and_the_processor_sends_once()
    {
        var email = new Notify.RecordingEmail();
        var outbox = new Notify.Outbox();
        var dispatcher = new Notify.NotificationDispatcher(email, outbox);
        dispatcher.Dispatch(new Notify.Notification("n-1", "ada@example.com", "hello"));
        Assert.Empty(email.Sent);
        new Notify.OutboxProcessor(email, outbox).Flush();
        Assert.Single(email.Sent);
    }
}
`);
  add(`tasks/${id}/gold/tests/Notify.Tests/DuplicateEmailRegressionTests.cs`, `namespace Notify.Tests;

public class DuplicateEmailRegressionTests
{
    [Fact]
    public void Retry_flush_does_not_send_a_duplicate()
    {
        var email = new Notify.RecordingEmail();
        var outbox = new Notify.Outbox();
        new Notify.NotificationDispatcher(email, outbox).Dispatch(new Notify.Notification("n-9", "ada@example.com", "hello"));
        var processor = new Notify.OutboxProcessor(email, outbox);
        processor.Flush();
        processor.Flush();
        Assert.Single(email.Sent);
    }
}
`);
  add(`tasks/${id}/hidden/OutboxHiddenTests.cs`, `namespace Notify.Tests;

public class OutboxHiddenTests
{
    [Fact]
    public void Hosted_path_sends_exactly_once()
    {
        var email = new Notify.RecordingEmail();
        var outbox = new Notify.Outbox();
        new Notify.NotificationDispatcher(email, outbox).Dispatch(new Notify.Notification("n-2", "grace@example.com", "body"));
        Assert.Empty(email.Sent);
        new Notify.OutboxProcessor(email, outbox).Flush();
        Assert.Equal(1, email.Sent.Count);
        Assert.Equal("n-2", email.Sent[0].Id);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Commit C made NotificationDispatcher send and enqueue. The outbox processor then sent the same message. The April NullReferenceException in the sample log is unrelated. Dispatch now only enqueues, and the processor remains the only sender. Added a duplicate-email regression test.\n");
  manifest({
    id,
    title: "Regression: duplicate emails",
    tier: 4,
    category: "debug",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "A later commit sends directly and through the outbox. Existing tests stay green. A sample log points at the wrong service.",
    symptom: "Users occasionally receive two copies of one notification.",
    rootCause: "Dispatch both sends and enqueues, so the processor sends a second copy.",
    correctFix: "Enqueue only. Add a regression test that flushes twice and expects one send.",
    hiddenCopy: [{ from: "OutboxHiddenTests.cs", to: "tests/Notify.Tests/OutboxHiddenTests.cs" }],
    checks: {
      initial: {
        dotnetBuild: [{ project: "Notify.sln", expect: "pass" }],
        dotnetTest: [
          { project: "Notify.sln", expect: "pass" },
          { project: "Notify.sln", expect: "fail", includeHidden: true },
        ],
      },
      final: {
        dotnetTest: [
          { project: "Notify.sln", expect: "pass" },
          { project: "Notify.sln", expect: "pass", includeHidden: true },
        ],
        requireFile: ["tests/Notify.Tests/DuplicateEmailRegressionTests.cs"],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 4, requireRegressionTest: true, rootCausePatterns: ["enqueue", "outbox"] },
  });
}

function notifications(fixed) {
  return `namespace Notify;

public sealed record Notification(string Id, string To, string Body);

public sealed class RecordingEmail
{
    public List<Notification> Sent { get; } = new();
    public void Send(Notification note) => Sent.Add(note);
}

public sealed class Outbox
{
    private readonly Queue<Notification> _pending = new();
    public void Enqueue(Notification note) => _pending.Enqueue(note);
    public bool TryDequeue(out Notification? note) => _pending.TryDequeue(out note);
}

public sealed class NotificationDispatcher
{
    private readonly RecordingEmail _email;
    private readonly Outbox _outbox;
    public NotificationDispatcher(RecordingEmail email, Outbox outbox)
    {
        _email = email;
        _outbox = outbox;
    }

    public void Dispatch(Notification note)
    {
        ${fixed ? "_outbox.Enqueue(note);" : "_email.Send(note);\n        _outbox.Enqueue(note);"}
    }
}

public sealed class OutboxProcessor
{
    private readonly RecordingEmail _email;
    private readonly Outbox _outbox;
    private readonly HashSet<string> _sent = new();
    public OutboxProcessor(RecordingEmail email, Outbox outbox)
    {
        _email = email;
        _outbox = outbox;
    }

    public void Flush()
    {
        while (_outbox.TryDequeue(out var note) && note is not null)
        {
            if (!_sent.Add(note.Id)) continue;
            _email.Send(note);
        }
    }
}
`;
}

function bug005() {
  const id = "BUG-005";
  prompt(
    id,
    "Unknown users return HTTP 500",
    `\`GET /users/{id}\` returns HTTP 500 when the user does not exist. It should return 404. Known users must keep the current response.

Fix that bug. Do not change any other behavior. Do not reformat unrelated files. Run \`dotnet test\`.`,
  );
  rubric(id, "# BUG-005\n\nSurgical task. UsersController dereferences a missing user. Gold returns NotFound before mapping. The known-user test locks the response shape. There are extra projects so a broad rewrite is visible in the diff.\n");
  const domain = guid();
  const app = guid();
  const infra = guid();
  const api = guid();
  add(`tasks/${id}/workspace/Users.sln`, sln("Users", [
    { name: "Acme.Users.Domain", path: "src/Acme.Users.Domain/Acme.Users.Domain.csproj", guid: domain },
    { name: "Acme.Users.Application", path: "src/Acme.Users.Application/Acme.Users.Application.csproj", guid: app },
    { name: "Acme.Users.Infrastructure", path: "src/Acme.Users.Infrastructure/Acme.Users.Infrastructure.csproj", guid: infra },
    { name: "Acme.Users.Api", path: "src/Acme.Users.Api/Acme.Users.Api.csproj", guid: api },
    { name: "Acme.Users.Tests", path: "tests/Acme.Users.Tests/Acme.Users.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Acme.Users.Domain/Acme.Users.Domain.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Acme.Users.Domain/User.cs`, `namespace Acme.Users.Domain;

public sealed class User
{
    public int Id { get; init; }
    public EmailAddress Email { get; init; } = EmailAddress.Parse("none@example.com");
    public UserStatus Status { get; init; } = UserStatus.Active;
}

public enum UserStatus { Active, Invited, Disabled }
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Domain/EmailAddress.cs`, `namespace Acme.Users.Domain;

public sealed class EmailAddress
{
    public string Value { get; }
    private EmailAddress(string value) => Value = value;
    public static EmailAddress Parse(string value) => new(value);
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Application/Acme.Users.Application.csproj`, csproj(`  <ItemGroup>
    <ProjectReference Include="../Acme.Users.Domain/Acme.Users.Domain.csproj" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Acme.Users.Application/Users/UserSummary.cs`, `namespace Acme.Users.Application.Users;

public sealed record UserSummary(int Id, string Email, string Status);
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Application/Users/IUserReader.cs`, `namespace Acme.Users.Application.Users;

public interface IUserReader
{
    UserSummary? Find(int id);
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Application/Users/UserReader.cs`, `using Acme.Users.Domain;

namespace Acme.Users.Application.Users;

public sealed class UserReader : IUserReader
{
    private readonly IUserRepository _repository;
    public UserReader(IUserRepository repository) => _repository = repository;
    public UserSummary? Find(int id)
    {
        var user = _repository.Find(id);
        if (user is null) return null;
        return new UserSummary(user.Id, user.Email.Value, user.Status.ToString());
    }
}

public interface IUserRepository
{
    User? Find(int id);
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Infrastructure/Acme.Users.Infrastructure.csproj`, csproj(`  <ItemGroup>
    <ProjectReference Include="../Acme.Users.Domain/Acme.Users.Domain.csproj" />
    <ProjectReference Include="../Acme.Users.Application/Acme.Users.Application.csproj" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Acme.Users.Infrastructure/InMemoryUserRepository.cs`, `using Acme.Users.Application.Users;
using Acme.Users.Domain;

namespace Acme.Users.Infrastructure;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly Dictionary<int, User> _users = UserSeed.Create();
    public User? Find(int id) => _users.GetValueOrDefault(id);
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Infrastructure/UserSeed.cs`, `using Acme.Users.Domain;

namespace Acme.Users.Infrastructure;

public static class UserSeed
{
    public static Dictionary<int, User> Create() => new()
    {
        [4] = new User { Id = 4, Email = EmailAddress.Parse("ada@example.com"), Status = UserStatus.Active }
    };
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Infrastructure/SystemClock.cs`, `namespace Acme.Users.Infrastructure;

public sealed class SystemClock
{
    public DateTimeOffset UtcNow() => DateTimeOffset.UtcNow;
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Api/Acme.Users.Api.csproj`, webproj(`  <ItemGroup>
    <ProjectReference Include="../Acme.Users.Application/Acme.Users.Application.csproj" />
    <ProjectReference Include="../Acme.Users.Infrastructure/Acme.Users.Infrastructure.csproj" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Acme.Users.Api/Program.cs`, `using Acme.Users.Application.Users;
using Acme.Users.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
builder.Services.AddSingleton<IUserReader, UserReader>();
var app = builder.Build();
app.MapControllers();
app.Run();

public partial class Program;
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Api/Controllers/UsersController.cs`, usersController(false));
  add(`tasks/${id}/gold/src/Acme.Users.Api/Controllers/UsersController.cs`, usersController(true));
  add(`tasks/${id}/workspace/src/Acme.Users.Api/Controllers/HealthController.cs`, `using Microsoft.AspNetCore.Mvc;

namespace Acme.Users.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });
}
`);
  add(`tasks/${id}/workspace/src/Acme.Users.Api/Auth/HeaderUserMiddleware.cs`, `using System.Security.Claims;

namespace Acme.Users.Api.Auth;

public sealed class HeaderUserMiddleware
{
    private readonly RequestDelegate _next;
    public HeaderUserMiddleware(RequestDelegate next) => _next = next;
    public async Task Invoke(HttpContext context)
    {
        var role = context.Request.Headers["X-Role"].ToString();
        if (!string.IsNullOrEmpty(role))
        {
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role) }, "Header");
            context.User = new ClaimsPrincipal(identity);
        }
        await _next(context);
    }
}
`);
  add(`tasks/${id}/workspace/README.md`, `# Users API

GET /users/{id} returns the user summary. Unknown ids currently crash; that is the bug under investigation.
`);
  add(`tasks/${id}/workspace/tests/Acme.Users.Tests/Acme.Users.Tests.csproj`, testproj(["../../src/Acme.Users.Api/Acme.Users.Api.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.11" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Acme.Users.Tests/KnownUserTests.cs`, `using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Users.Tests;

public class KnownUserTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public KnownUserTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Known_user_keeps_the_current_body()
    {
        var response = await _factory.CreateClient().GetAsync("/users/4");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ada@example.com", body);
        Assert.Contains("Active", body);
    }
}
`);
  add(`tasks/${id}/hidden/UnknownUserTests.cs`, `using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Users.Tests;

public class UnknownUserTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public UnknownUserTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Unknown_user_is_not_found()
    {
        var response = await _factory.CreateClient().GetAsync("/users/404");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "GET /users/{id} threw when the reader returned null. The controller now returns 404. Known user responses were not changed.\n");
  manifest({
    id,
    title: "Surgical fix for unknown-user HTTP 500",
    tier: 2,
    category: "debug",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "Unknown users crash the controller. Change only the behavior of that case.",
    symptom: "GET /users/{id} returns 500 for an unknown id.",
    rootCause: "UsersController maps user.Id without a null check.",
    correctFix: "Return NotFound when the reader returns null.",
    hiddenCopy: [{ from: "UnknownUserTests.cs", to: "tests/Acme.Users.Tests/UnknownUserTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [
          { project: "Users.sln", expect: "pass" },
          { project: "Users.sln", expect: "fail", includeHidden: true },
        ],
      },
      final: {
        dotnetTest: [
          { project: "Users.sln", expect: "pass" },
          { project: "Users.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "touch-list", allowedFiles: ["src/Acme.Users.Api/Controllers/UsersController.cs"], maxUnnecessaryFiles: 0 },
  });
}

function usersController(fixed) {
  return `using Acme.Users.Application.Users;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Users.Api.Controllers;

[ApiController]
[Route("users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserReader _reader;
    public UsersController(IUserReader reader) => _reader = reader;

    [HttpGet("{id:int}")]
    public ActionResult<UserSummary> Get(int id)
    {
        var user = _reader.Find(id);
        ${fixed ? "if (user is null) return NotFound();\n        return Ok(user);" : "return Ok(new UserSummary(user.Id, user.Email, user.Status));"}
    }
}
`;
}
