import { add, csproj, guid, manifest, prompt, reactConfig, reactPackage, rubric, sln, testproj, webproj } from "./lib.mjs";

export function featTasks() {
  feat001();
  feat002();
  feat003();
  feat004();
}

function feat001() {
  const id = "FEAT-001";
  prompt(id, "Add user account deactivation", `Add support for user account deactivation. Do not assume a file list; follow the structure already in the repository.

Contract:
- POST /api/users/{id}/deactivation
- Use the existing X-Role header authentication. Only Admin may call it.
- Body: { "reason": string }, required, 1 to 500 characters.
- 204 when an active user is deactivated.
- 400 when the body is missing or the reason is empty or longer than 500 characters.
- 403 when the caller is authenticated but not Admin.
- 404 when the user does not exist.
- 409 when the user is already deactivated.
- Record an audit event through the existing IAuditLog. Action must be "user.deactivated". Include the user id and the reason. Events are readable at GET /api/audit.
- Document the endpoint in README.md.
- Add tests.

Seeded user 4 is active. Run \`dotnet test\`.`);
  rubric(id, "# FEAT-001\n\nHidden tests lock the contract. The prompt names existing extension points, not the files to edit.\n");
  const api = guid();
  add(`tasks/${id}/workspace/Deactivate.sln`, sln("Deactivate", [
    { name: "Acme.Accounts", path: "src/Acme.Accounts/Acme.Accounts.csproj", guid: api },
    { name: "Acme.Accounts.Tests", path: "tests/Acme.Accounts.Tests/Acme.Accounts.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/README.md`, `# Accounts

GET /api/users/{id} returns a user.
GET /api/audit returns audit events.
Authentication is the X-Role header.
`);
  add(`tasks/${id}/workspace/src/Acme.Accounts/Acme.Accounts.csproj`, webproj());
  add(`tasks/${id}/workspace/src/Acme.Accounts/Program.cs`, `using Acme.Accounts;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IUserStore, InMemoryUserStore>();
builder.Services.AddSingleton<IAuditLog, InMemoryAuditLog>();
var app = builder.Build();
app.UseMiddleware<HeaderRoleMiddleware>();
app.MapControllers();
app.Run();
public partial class Program;
`);
  add(`tasks/${id}/workspace/src/Acme.Accounts/Users.cs`, accountTypes(false));
  add(`tasks/${id}/gold/src/Acme.Accounts/Users.cs`, accountTypes(true));
  add(`tasks/${id}/gold/README.md`, `# Accounts

GET /api/users/{id} returns a user.
GET /api/audit returns audit events.
Authentication is the X-Role header.

POST /api/users/{id}/deactivation deactivates an active user. Admin only. Body: { "reason": "..." }.
`);
  add(`tasks/${id}/workspace/tests/Acme.Accounts.Tests/Acme.Accounts.Tests.csproj`, testproj(["../../src/Acme.Accounts/Acme.Accounts.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.11" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Acme.Accounts.Tests/ExistingTests.cs`, `using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Accounts.Tests;

public class ExistingTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public ExistingTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Known_user_is_readable()
    {
        var response = await _factory.CreateClient().GetAsync("/api/users/4");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
`);
  add(`tasks/${id}/hidden/DeactivationTests.cs`, deactivationTests());
  add(`tasks/${id}/gold/ANSWER.md`, "Added POST /api/users/{id}/deactivation on the existing user controller, using IAuditLog and the X-Role middleware. README documents the endpoint.\n");
  manifest({
    id,
    title: "Multi-file account deactivation",
    tier: 3,
    category: "feature",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "Add an admin deactivation endpoint, validation, audit, tests, and docs without a file list.",
    symptom: "The capability does not exist.",
    rootCause: "No deactivation workflow is implemented.",
    correctFix: "Add the endpoint, status change, audit event, validation, and README note.",
    hiddenCopy: [{ from: "DeactivationTests.cs", to: "tests/Acme.Accounts.Tests/DeactivationTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [
          { project: "Deactivate.sln", expect: "pass" },
          { project: "Deactivate.sln", expect: "fail", includeHidden: true, minFailedTests: 1 },
        ],
      },
      final: {
        dotnetTest: [
          { project: "Deactivate.sln", expect: "pass" },
          { project: "Deactivate.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 8 },
  });
}

function accountTypes(done) {
  const action = done
    ? `[HttpPost("{id:int}/deactivation")]
    public IActionResult Deactivate(int id, [FromBody] DeactivateRequest? request)
    {
        if (!User.IsInRole("Admin")) return StatusCode(403);
        if (request is null || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 500) return BadRequest();
        var user = _users.Find(id);
        if (user is null) return NotFound();
        if (user.Status == "deactivated") return Conflict();
        user.Status = "deactivated";
        _audit.Write("user.deactivated", new Dictionary<string, string> { ["userId"] = id.ToString(), ["reason"] = request.Reason });
        return NoContent();
    }`
    : "";
  return `using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Accounts;

public sealed class UserRecord
{
    public int Id { get; init; }
    public string Email { get; init; } = "";
    public string Status { get; set; } = "active";
}

public interface IUserStore
{
    UserRecord? Find(int id);
}

public sealed class InMemoryUserStore : IUserStore
{
    private readonly Dictionary<int, UserRecord> _users = new()
    {
        [4] = new UserRecord { Id = 4, Email = "ada@example.com", Status = "active" }
    };
    public UserRecord? Find(int id) => _users.GetValueOrDefault(id);
}

public sealed record AuditEntry(string Action, IReadOnlyDictionary<string, string> Data);

public interface IAuditLog
{
    void Write(string action, IReadOnlyDictionary<string, string> data);
    IReadOnlyList<AuditEntry> Entries { get; }
}

public sealed class InMemoryAuditLog : IAuditLog
{
    private readonly List<AuditEntry> _entries = new();
    public IReadOnlyList<AuditEntry> Entries => _entries;
    public void Write(string action, IReadOnlyDictionary<string, string> data) => _entries.Add(new AuditEntry(action, data));
}

public sealed class HeaderRoleMiddleware
{
    private readonly RequestDelegate _next;
    public HeaderRoleMiddleware(RequestDelegate next) => _next = next;
    public async Task Invoke(HttpContext context)
    {
        var role = context.Request.Headers["X-Role"].ToString();
        if (!string.IsNullOrEmpty(role))
        {
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role), new Claim(ClaimTypes.Name, "tester") }, "Header");
            context.User = new ClaimsPrincipal(identity);
        }
        await _next(context);
    }
}

public sealed record DeactivateRequest(string Reason);

[ApiController]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserStore _users;
    private readonly IAuditLog _audit;
    public UsersController(IUserStore users, IAuditLog audit)
    {
        _users = users;
        _audit = audit;
    }

    [HttpGet("{id:int}")]
    public IActionResult Get(int id)
    {
        var user = _users.Find(id);
        return user is null ? NotFound() : Ok(new { user.Id, user.Email, user.Status });
    }

    ${action}
}

[ApiController]
[Route("api/audit")]
public sealed class AuditController : ControllerBase
{
    private readonly IAuditLog _audit;
    public AuditController(IAuditLog audit) => _audit = audit;
    [HttpGet]
    public IActionResult Get() => Ok(_audit.Entries);
}
`;
}

function deactivationTests() {
  return `using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Accounts.Tests;

public class DeactivationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public DeactivationTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Admin_deactivates_and_writes_audit()
    {
        var client = Client("Admin");
        var response = await client.PostAsJsonAsync("/api/users/4/deactivation", new { reason = "left the company" });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var audit = await client.GetFromJsonAsync<AuditDto[]>("/api/audit");
        Assert.Contains(audit!, item => item.Action == "user.deactivated" && item.Data["reason"] == "left the company");
        var again = await client.PostAsJsonAsync("/api/users/4/deactivation", new { reason = "again" });
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task Non_admin_is_forbidden()
    {
        var response = await Client("User").PostAsJsonAsync("/api/users/4/deactivation", new { reason = "no" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_user_and_bad_reason_are_rejected()
    {
        var client = Client("Admin");
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/users/9/deactivation", new { reason = "gone" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/users/4/deactivation", new { reason = "" })).StatusCode);
    }

    [Fact]
    public void Readme_documents_the_endpoint()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "README.md"))) dir = dir.Parent;
        var readme = File.ReadAllText(Path.Combine(dir!.FullName, "README.md"));
        Assert.Contains("/api/users/{id}/deactivation", readme);
    }

    private HttpClient Client(string role)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Role", role);
        return client;
    }

    private sealed record AuditDto(string Action, Dictionary<string, string> Data);
}
`;
}

function feat002() {
  const id = "FEAT-002";
  prompt(id, "Make the orders client match the contract", `docs/orders-api.openapi.yaml is the contract for POST /api/orders.

The React client does not match it. Update the client so the tests pass. Do not change the OpenAPI file or the tests.

Run \`npm test\`.`);
  rubric(id, "# FEAT-002\n\nThe client sends X-Api-Key and { customer, products }. The contract requires Authorization: Bearer and { customerId, items: [{ sku, quantity }] }.\n");
  const cfg = reactConfig();
  add(`tasks/${id}/workspace/package.json`, reactPackage("feat-002"));
  add(`tasks/${id}/workspace/tsconfig.json`, cfg["tsconfig.json"]);
  add(`tasks/${id}/workspace/vitest.config.ts`, cfg["vitest.config.ts"]);
  add(`tasks/${id}/workspace/docs/orders-api.openapi.yaml`, openApi());
  add(`tasks/${id}/workspace/src/ordersClient.ts`, ordersClient(false));
  add(`tasks/${id}/gold/src/ordersClient.ts`, ordersClient(true));
  add(`tasks/${id}/workspace/src/OrderForm.tsx`, `import { createOrder } from "./ordersClient";

export function OrderForm(props: { token: string; customerId: string }) {
  return <button onClick={() => createOrder(fetch, props.token, { customerId: props.customerId, items: [{ sku: "pen", quantity: 1 }] })}>Place order</button>;
}
`);
  add(`tasks/${id}/workspace/tests/ordersClient.test.ts`, `import { createOrder } from "../src/ordersClient";

describe("orders client", () => {
  it("matches the OpenAPI contract", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ orderId: "o-1", status: "accepted" }), { status: 201 });
    };
    const result = await createOrder(fetchImpl, "secret-token", {
      customerId: "c-9",
      items: [{ sku: "pen", quantity: 2 }],
    });
    expect(result).toEqual({ orderId: "o-1", status: "accepted" });
    expect(calls[0].url).toBe("/api/orders");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      customerId: "c-9",
      items: [{ sku: "pen", quantity: 2 }],
    });
  });
});
`);
  add(`tasks/${id}/gold/ANSWER.md`, "The client sent X-Api-Key and a customer/products body. It now sends Authorization: Bearer and customerId/items, matching the OpenAPI document.\n");
  manifest({
    id,
    title: "Conform the orders client to the API contract",
    tier: 2,
    category: "integration",
    difficulty: "medium",
    languages: ["react", "typescript"],
    summary: "The OpenAPI document and the client disagree on the header and the body.",
    symptom: "The client test fails against the documented contract.",
    rootCause: "The client still uses an older header and payload shape.",
    correctFix: "Send Authorization: Bearer and { customerId, items }.",
    checks: {
      initial: { npm: [{ script: "test", expect: "fail", minFailedTests: 1 }] },
      final: { npm: [{ script: "build", expect: "pass" }, { script: "test", expect: "pass" }] },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0 },
  });
}

function openApi() {
  return `openapi: 3.0.3
info:
  title: Orders
  version: 1.0.0
paths:
  /api/orders:
    post:
      summary: Create an order
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customerId, items]
              properties:
                customerId:
                  type: string
                items:
                  type: array
                  items:
                    type: object
                    required: [sku, quantity]
                    properties:
                      sku:
                        type: string
                      quantity:
                        type: integer
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                type: object
                required: [orderId, status]
                properties:
                  orderId:
                    type: string
                  status:
                    type: string
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
`;
}

function ordersClient(fixed) {
  if (!fixed) {
    return `export interface OrderItem { sku: string; quantity: number }
export interface OrderRequest { customerId: string; items: OrderItem[] }

export async function createOrder(fetchImpl: (url: string, init: RequestInit) => Promise<Response>, token: string, request: OrderRequest) {
  const response = await fetchImpl("/api/orders", {
    method: "POST",
    headers: { "X-Api-Key": token, "Content-Type": "application/json" },
    body: JSON.stringify({ customer: request.customerId, products: request.items.map((item) => ({ code: item.sku, qty: item.quantity })) }),
  });
  if (!response.ok) throw new Error("order failed");
  return response.json();
}
`;
  }
  return `export interface OrderItem { sku: string; quantity: number }
export interface OrderRequest { customerId: string; items: OrderItem[] }

export async function createOrder(fetchImpl: (url: string, init: RequestInit) => Promise<Response>, token: string, request: OrderRequest) {
  const response = await fetchImpl("/api/orders", {
    method: "POST",
    headers: { Authorization: \`Bearer \${token}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: request.customerId, items: request.items }),
  });
  if (!response.ok) throw new Error("order failed");
  return response.json();
}
`;
}

function feat003() {
  const id = "FEAT-003";
  prompt(id, "Support multiple phone numbers per user", `Users currently have a single Phone column. Add support for multiple phone numbers per user.

Required model:
- UserPhoneNumber with UserId, Number, and Kind.
- A user has many phone numbers.
- Existing Phone values must be copied into a phone-number row by a migration. Map a non-empty Phone to Kind "mobile".
- Add POST /api/users/{id}/phones with { "number": "...", "kind": "mobile" } and GET /api/users/{id}/phones.
- Update the EF model, DbContext, migration, and tests.

Use SQLite and \`Database.Migrate()\`. Do not switch the app to EnsureCreated. Run \`dotnet test\`.`);
  rubric(id, "# FEAT-003\n\nHidden tests migrate to the first migration, insert a legacy phone with SQL, migrate to latest, and expect a backfilled row. They also call the new API.\n");
  const api = guid();
  add(`tasks/${id}/workspace/Phones.sln`, sln("Phones", [
    { name: "Phones", path: "src/Phones/Phones.csproj", guid: api },
    { name: "Phones.Tests", path: "tests/Phones.Tests/Phones.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Phones/Phones.csproj`, webproj(`  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0">
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Phones/AppDbContext.cs`, phoneContext(false));
  add(`tasks/${id}/gold/src/Phones/AppDbContext.cs`, phoneContext(true));
  add(`tasks/${id}/workspace/src/Phones/Migrations/20240115120000_InitialCreate.cs`, initialMigration());
  add(`tasks/${id}/gold/src/Phones/Migrations/20240601120000_UserPhoneNumbers.cs`, phoneMigration());
  add(`tasks/${id}/workspace/src/Phones/Program.cs`, phoneProgram(false));
  add(`tasks/${id}/gold/src/Phones/Program.cs`, phoneProgram(true));
  add(`tasks/${id}/workspace/tests/Phones.Tests/Phones.Tests.csproj`, testproj(["../../src/Phones/Phones.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Phones.Tests/UserTests.cs`, `namespace Phones.Tests;

public class UserTests
{
    [Fact]
    public void User_still_has_a_name()
    {
        var user = new Phones.User { Name = "Ada" };
        Assert.Equal("Ada", user.Name);
    }
}
`);
  add(`tasks/${id}/hidden/PhoneMigrationTests.cs`, phoneHiddenTests());
  add(`tasks/${id}/gold/ANSWER.md`, "Added UserPhoneNumber, the relationship, a migration that backfills Phone into Kind mobile, and GET/POST /api/users/{id}/phones.\n");
  manifest({
    id,
    title: "Multiple phone numbers migration",
    tier: 4,
    category: "data",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "Split a single phone column into a related collection, with a data migration and API.",
    symptom: "A user can store only one phone number.",
    rootCause: "Phone is a scalar column and there is no phone collection or migration.",
    correctFix: "Add the entity, relationship, backfill migration, and phone endpoints.",
    hiddenCopy: [{ from: "PhoneMigrationTests.cs", to: "tests/Phones.Tests/PhoneMigrationTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [
          { project: "Phones.sln", expect: "pass" },
          { project: "Phones.sln", expect: "fail", includeHidden: true, minFailedTests: 1 },
        ],
      },
      final: {
        dotnetTest: [
          { project: "Phones.sln", expect: "pass" },
          { project: "Phones.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 8 },
  });
}

function phoneContext(done) {
  const phones = done
    ? `public DbSet<UserPhoneNumber> UserPhoneNumbers => Set<UserPhoneNumber>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserPhoneNumber>().HasOne(p => p.User).WithMany(u => u.PhoneNumbers).HasForeignKey(p => p.UserId);
    }`
    : "";
  const nav = done ? `public List<UserPhoneNumber> PhoneNumbers { get; } = new();` : "";
  const type = done
    ? `public sealed class UserPhoneNumber
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Number { get; set; } = "";
    public string Kind { get; set; } = "";
    public User? User { get; set; }
}`
    : "";
  return `using Microsoft.EntityFrameworkCore;

namespace Phones;

public sealed class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    ${nav}
}

${type}

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users => Set<User>();
    ${phones}
}
`;
}

function initialMigration() {
  return `using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Phones.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20240115120000_InitialCreate")]
public class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false).Annotation("Sqlite:Autoincrement", true),
                Name = table.Column<string>(type: "TEXT", nullable: false),
                Phone = table.Column<string>(type: "TEXT", nullable: true)
            },
            constraints: table => table.PrimaryKey("PK_Users", x => x.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("Users");
}
`;
}

function phoneMigration() {
  return `using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Phones.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20240601120000_UserPhoneNumbers")]
public class UserPhoneNumbers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "UserPhoneNumbers",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false).Annotation("Sqlite:Autoincrement", true),
                UserId = table.Column<int>(type: "INTEGER", nullable: false),
                Number = table.Column<string>(type: "TEXT", nullable: false),
                Kind = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserPhoneNumbers", x => x.Id);
                table.ForeignKey("FK_UserPhoneNumbers_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.Sql("INSERT INTO UserPhoneNumbers (UserId, Number, Kind) SELECT Id, Phone, 'mobile' FROM Users WHERE Phone IS NOT NULL AND Phone <> '';");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("UserPhoneNumbers");
}
`;
}

function phoneProgram(done) {
  const endpoints = done
    ? `app.MapPost("/api/users/{id:int}/phones", async (int id, PhoneBody body, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();
    db.UserPhoneNumbers.Add(new UserPhoneNumber { UserId = id, Number = body.Number, Kind = body.Kind });
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{id}/phones", body);
});
app.MapGet("/api/users/{id:int}/phones", async (int id, AppDbContext db) =>
    await db.UserPhoneNumbers.Where(p => p.UserId == id).Select(p => new { p.Number, p.Kind }).ToListAsync());
`
    : "";
  return `using Microsoft.EntityFrameworkCore;
using Phones;

var builder = WebApplication.CreateBuilder(args);
var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=phones.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(cs));
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}
app.MapGet("/api/users/{id:int}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(new { user.Id, user.Name, user.Phone });
});
${endpoints}
app.Run();
public partial class Program;
public sealed record PhoneBody(string Number, string Kind);
`;
}

function phoneHiddenTests() {
  return `using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;

namespace Phones.Tests;

public class PhoneMigrationTests
{
    [Fact]
    public void Migration_backfills_the_legacy_phone_column()
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".db");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite($"Data Source={path}").Options;
        using var db = new AppDbContext(options);
        var migrator = db.Database.GetService<IMigrator>()!;
        var migrations = db.Database.GetMigrations().ToList();
        Assert.True(migrations.Count >= 2, "expected a new migration");
        migrator.Migrate(migrations[0]);
        db.Database.ExecuteSqlRaw("INSERT INTO Users (Name, Phone) VALUES ('Ada', '555-0100')");
        migrator.Migrate(migrations[^1]);
        using var check = new SqliteConnection($"Data Source={path}");
        check.Open();
        using var cmd = check.CreateCommand();
        cmd.CommandText = "SELECT Number, Kind FROM UserPhoneNumbers";
        using var reader = cmd.ExecuteReader();
        Assert.True(reader.Read());
        Assert.Equal("555-0100", reader.GetString(0));
        Assert.Equal("mobile", reader.GetString(1));
    }
}

public class PhoneApiTests : IClassFixture<PhoneFactory>
{
    private readonly PhoneFactory _factory;
    public PhoneApiTests(PhoneFactory factory) => _factory = factory;

    [Fact]
    public async Task Can_add_two_phone_numbers()
    {
        var client = _factory.CreateClient();
        int id;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new User { Name = "Grace" });
            await db.SaveChangesAsync();
            id = db.Users.Single().Id;
        }
        Assert.Equal(System.Net.HttpStatusCode.Created, (await client.PostAsJsonAsync($"/api/users/{id}/phones", new { number = "1", kind = "mobile" })).StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Created, (await client.PostAsJsonAsync($"/api/users/{id}/phones", new { number = "2", kind = "work" })).StatusCode);
        var body = await client.GetStringAsync($"/api/users/{id}/phones");
        Assert.Contains("work", body);
        Assert.Contains("mobile", body);
    }
}

public sealed class PhoneFactory : WebApplicationFactory<Program>
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".db");
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_path}");
    }
}
`;
}

function feat004() {
  const id = "FEAT-004";
  prompt(id, "Change Customer.Id from int to Guid", `Change Customer.Id from int to Guid.

First write IMPACT.md listing every part of this repository that the change can affect. Then implement the change.

Preserve existing rows by mapping each integer id to \`new Guid(id, 0, 0, new byte[8])\`. Add an EF migration; do not rely on EnsureCreated. Routes, DTOs, the cache, the webhook contract, logs, fixtures, and wwwroot/customer.js must accept Guid values.

Run \`dotnet test\`.`);
  rubric(id, "# FEAT-004\n\nImpact analysis is required in IMPACT.md. Hidden tests check the schema, the Guid mapping, and the API. This is the autonomous follow-through after the impact list.\n");
  const api = guid();
  add(`tasks/${id}/workspace/Customers.sln`, sln("Customers", [
    { name: "Customers", path: "src/Customers/Customers.csproj", guid: api },
    { name: "Customers.Tests", path: "tests/Customers.Tests/Customers.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Customers/Customers.csproj`, webproj(`  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Customers/CustomerModel.cs`, customerModel(false));
  add(`tasks/${id}/gold/src/Customers/CustomerModel.cs`, customerModel(true));
  add(`tasks/${id}/workspace/src/Customers/Migrations/20240115120000_InitialCreate.cs`, customerInitial());
  add(`tasks/${id}/gold/src/Customers/Migrations/20240602120000_CustomerGuid.cs`, customerGuidMigration());
  add(`tasks/${id}/workspace/src/Customers/Program.cs`, customerProgram(false));
  add(`tasks/${id}/gold/src/Customers/Program.cs`, customerProgram(true));
  add(`tasks/${id}/workspace/src/Customers/CustomerCache.cs`, `namespace Customers;

public sealed class CustomerCache
{
    private readonly Dictionary<int, string> _names = new();
    public void Remember(int id, string name) => _names[id] = name;
    public string? Find(int id) => _names.GetValueOrDefault(id);
}
`);
  add(`tasks/${id}/gold/src/Customers/CustomerCache.cs`, `namespace Customers;

public sealed class CustomerCache
{
    private readonly Dictionary<Guid, string> _names = new();
    public void Remember(Guid id, string name) => _names[id] = name;
    public string? Find(Guid id) => _names.GetValueOrDefault(id);
}
`);
  add(`tasks/${id}/workspace/src/Customers/WebhookContract.cs`, `namespace Customers;

public sealed class CustomerWebhook
{
    public int CustomerId { get; init; }
    public string EventName { get; init; } = "customer.changed";
}
`);
  add(`tasks/${id}/gold/src/Customers/WebhookContract.cs`, `namespace Customers;

public sealed class CustomerWebhook
{
    public Guid CustomerId { get; init; }
    public string EventName { get; init; } = "customer.changed";
}
`);
  add(`tasks/${id}/workspace/wwwroot/customer.js`, `export function parseCustomerId(value) {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new Error("customer id must be an integer");
  return id;
}
`);
  add(`tasks/${id}/gold/wwwroot/customer.js`, `export function parseCustomerId(value) {
  if (!/^[0-9a-fA-F-]{36}$/.test(String(value))) throw new Error("customer id must be a guid");
  return String(value);
}
`);
  add(`tasks/${id}/workspace/docs/api.md`, `# GET /api/customers/{id}

\`id\` is an integer.
`);
  add(`tasks/${id}/gold/docs/api.md`, `# GET /api/customers/{id}

\`id\` is a UUID string.
`);
  add(`tasks/${id}/workspace/tests/Customers.Tests/Customers.Tests.csproj`, testproj(["../../src/Customers/Customers.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.0" />
    <PackageReference Include="Microsoft.Data.Sqlite" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Customers.Tests/CustomerTests.cs`, `namespace Customers.Tests;

public class CustomerTests
{
    [Fact]
    public void Cache_remembers_an_integer_id()
    {
        var cache = new Customers.CustomerCache();
        cache.Remember(7, "Ada");
        Assert.Equal("Ada", cache.Find(7));
    }
}
`);
  add(`tasks/${id}/gold/tests/Customers.Tests/CustomerTests.cs`, `namespace Customers.Tests;

public class CustomerTests
{
    [Fact]
    public void Cache_remembers_a_guid_id()
    {
        var cache = new Customers.CustomerCache();
        var id = new Guid(7, 0, 0, new byte[8]);
        cache.Remember(id, "Ada");
        Assert.Equal("Ada", cache.Find(id));
    }
}
`);
  add(`tasks/${id}/hidden/CustomerGuidTests.cs`, customerHidden());
  add(`tasks/${id}/gold/IMPACT.md`, `# Impact

- database schema and EF migration
- Customer entity
- DTOs returned by the controller
- route parameter
- JSON serialization of the id
- tests and fixtures
- CustomerCache keys
- CustomerWebhook external contract
- log messages that include the id
- wwwroot/customer.js frontend parser
- docs/api.md
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Customer.Id is now a Guid. Existing integer ids map with new Guid(id, 0, 0, new byte[8]). IMPACT.md lists the affected database, API, cache, webhook, logs, tests, and frontend parser.\n");
  manifest({
    id,
    title: "Customer.Id int to Guid",
    tier: 5,
    category: "feature",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "Identify the blast radius, then change Customer.Id from int to Guid across the repository.",
    symptom: "Identifiers are integers end to end.",
    rootCause: "The id type is part of the schema, API, cache, webhook, logs, tests, and a small script.",
    correctFix: "Write IMPACT.md, then migrate the id and update every dependent contract.",
    hiddenCopy: [{ from: "CustomerGuidTests.cs", to: "tests/Customers.Tests/CustomerGuidTests.cs" }],
    checks: {
      initial: { dotnetTest: [{ project: "Customers.sln", expect: "pass" }] },
      final: {
        dotnetTest: [{ project: "Customers.sln", expect: "pass", includeHidden: true }],
        answerFile: "IMPACT.md",
        answerGroups: [
          { id: "db", patterns: ["migration", "database", "schema"] },
          { id: "dto", patterns: ["DTO", "dto"] },
          { id: "route", patterns: ["route", "controller"] },
          { id: "json", patterns: ["JSON", "serialization"] },
          { id: "tests", patterns: ["test"] },
          { id: "cache", patterns: ["cache"] },
          { id: "webhook", patterns: ["webhook"] },
          { id: "front", patterns: ["customer.js", "frontend"] },
        ],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 12 },
  });
}

function customerModel(guidId) {
  const idType = guidId ? "Guid" : "int";
  return `using Microsoft.EntityFrameworkCore;

namespace Customers;

public sealed class Customer
{
    public ${idType} Id { get; set; }
    public string Name { get; set; } = "";
}

public sealed class CustomerDb : DbContext
{
    public CustomerDb(DbContextOptions<CustomerDb> options) : base(options) { }
    public DbSet<Customer> Customers => Set<Customer>();
}
`;
}

function customerInitial() {
  return `using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Customers.Migrations;

[DbContext(typeof(CustomerDb))]
[Migration("20240115120000_InitialCreate")]
public class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Customers",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false).Annotation("Sqlite:Autoincrement", true),
                Name = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Customers", x => x.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("Customers");
}
`;
}

function customerGuidMigration() {
  return `using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Customers.Migrations;

[DbContext(typeof(CustomerDb))]
[Migration("20240602120000_CustomerGuid")]
public class CustomerGuid : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("ALTER TABLE Customers RENAME TO Customers_old;");
        migrationBuilder.CreateTable(
            name: "Customers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                Name = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Customers", x => x.Id));
        migrationBuilder.Sql(@"
INSERT INTO Customers (Id, Name)
SELECT printf('%08x-0000-0000-0000-000000000000', Id), Name FROM Customers_old;");
        migrationBuilder.DropTable("Customers_old");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => throw new NotSupportedException();
}
`;
}

function customerProgram(guidId) {
  const route = guidId ? "{id:guid}" : "{id:int}";
  const idType = guidId ? "Guid" : "int";
  return `using Customers;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<CustomerDb>(options => options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=customers.db"));
builder.Services.AddSingleton<CustomerCache>();
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<CustomerDb>().Database.Migrate();
}
app.MapGet("/api/customers/${route}", async (${idType} id, CustomerDb db, ILoggerFactory logs) =>
{
    var customer = await db.Customers.FindAsync(id);
    logs.CreateLogger("Customers").LogInformation("Loaded customer {CustomerId}", id);
    return customer is null ? Results.NotFound() : Results.Ok(customer);
});
app.Run();
public partial class Program;
`;
}

function customerHidden() {
  return `using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Customers.Tests;

public class CustomerGuidTests
{
    [Fact]
    public void Integer_ids_are_preserved_as_guids()
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".db");
        var options = new DbContextOptionsBuilder<CustomerDb>().UseSqlite($"Data Source={path}").Options;
        using var db = new CustomerDb(options);
        var migrator = db.Database.GetService<IMigrator>()!;
        var migrations = db.Database.GetMigrations().ToList();
        Assert.True(migrations.Count >= 2);
        migrator.Migrate(migrations[0]);
        db.Database.ExecuteSqlRaw("INSERT INTO Customers (Name) VALUES ('Ada')");
        var connection = db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open) connection.Open();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT Id FROM Customers";
        var oldId = Convert.ToInt64(cmd.ExecuteScalar());
        migrator.Migrate(migrations[^1]);
        using var check = new SqliteConnection($"Data Source={path}");
        check.Open();
        using var cmd2 = check.CreateCommand();
        cmd2.CommandText = "SELECT Id FROM Customers";
        var stored = (string)cmd2.ExecuteScalar()!;
        Assert.Equal(new Guid(Convert.ToInt32(oldId), 0, 0, new byte[8]).ToString(), stored);
    }
}
`;
}
