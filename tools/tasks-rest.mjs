import { add, csproj, guid, manifest, prompt, reactConfig, reactPackage, rubric, sln, testproj } from "./lib.mjs";

export function restTasks() {
  ref001();
  ref002();
  ref003();
  sec001();
  sec002();
  perf001();
  perf002();
}

function ref001() {
  const id = "REF-001";
  prompt(id, "Refactor order processing", `Refactor ProcessOrder so it is easier to maintain. Preserve the current behavior exactly, including skipped quantities and the discount boundary. Do not change the tests. Run \`dotnet test\`.`);
  rubric(id, "# REF-001\n\nThe method is deeply nested. Gold flattens it. Hidden tests lock negative quantities, null items, and the discount boundary. Both the broken-looking code and the refactor must pass those tests.\n");
  const lib = guid();
  add(`tasks/${id}/workspace/Orders.sln`, sln("Orders", [
    { name: "Orders", path: "src/Orders/Orders.csproj", guid: lib },
    { name: "Orders.Tests", path: "tests/Orders.Tests/Orders.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Orders/Orders.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Orders/OrderProcessor.cs`, orderProcessor(false));
  add(`tasks/${id}/gold/src/Orders/OrderProcessor.cs`, orderProcessor(true));
  add(`tasks/${id}/workspace/tests/Orders.Tests/Orders.Tests.csproj`, testproj(["../../src/Orders/Orders.csproj"]));
  add(`tasks/${id}/workspace/tests/Orders.Tests/OrderTests.cs`, orderTests(false));
  add(`tasks/${id}/hidden/OrderHiddenTests.cs`, orderTests(true));
  add(`tasks/${id}/gold/ANSWER.md`, "Flattened the nested ProcessOrder into guard clauses and extracted the discount decision. Null, empty, cancelled, non-positive quantities, and the 100 discount boundary behave as before.\n");
  manifest({
    id,
    title: "Refactor nested order processing",
    tier: 3,
    category: "refactor",
    difficulty: "easy",
    languages: ["csharp"],
    summary: "Reduce nesting in ProcessOrder without changing behavior.",
    symptom: "ProcessOrder is a deeply nested conditional.",
    rootCause: "The behavior is embedded in nested null and status checks.",
    correctFix: "Extract guard clauses or small methods and keep the same results.",
    hiddenCopy: [{ from: "OrderHiddenTests.cs", to: "tests/Orders.Tests/OrderHiddenTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [{ project: "Orders.sln", expect: "pass" }, { project: "Orders.sln", expect: "pass", includeHidden: true }],
        nesting: [{ file: "src/Orders/OrderProcessor.cs", compare: "gte", depth: 5 }],
      },
      final: {
        dotnetTest: [{ project: "Orders.sln", expect: "pass" }, { project: "Orders.sln", expect: "pass", includeHidden: true }],
        nesting: [{ file: "src/Orders/OrderProcessor.cs", compare: "lte", depth: 3 }],
      },
    },
    scoring: { rootCausePatterns: ["nest", "guard", "extract"] },
  });
}

function orderProcessor(flat) {
  if (flat) {
    return `namespace Orders;

public sealed class Order
{
    public string? Status { get; init; }
    public List<OrderLine>? Items { get; init; }
}

public sealed class OrderLine
{
    public decimal Price { get; init; }
    public int Quantity { get; init; }
}

public sealed class OrderResult
{
    public string Outcome { get; init; } = "ignored";
    public decimal Total { get; init; }
}

public sealed class OrderProcessor
{
    public OrderResult ProcessOrder(Order? order)
    {
        if (order is null || order.Items is null || order.Items.Count == 0 || order.Status == "cancelled")
            return new OrderResult();
        decimal total = 0;
        foreach (var line in order.Items)
        {
            if (line.Quantity <= 0) continue;
            total += line.Price * line.Quantity;
        }
        if (total >= 100) total *= 0.9m;
        return new OrderResult { Outcome = "processed", Total = total };
    }
}
`;
  }
  return `namespace Orders;

public sealed class Order
{
    public string? Status { get; init; }
    public List<OrderLine>? Items { get; init; }
}

public sealed class OrderLine
{
    public decimal Price { get; init; }
    public int Quantity { get; init; }
}

public sealed class OrderResult
{
    public string Outcome { get; init; } = "ignored";
    public decimal Total { get; init; }
}

public sealed class OrderProcessor
{
    public OrderResult ProcessOrder(Order? order)
    {
        if (order != null)
        {
            if (order.Items != null)
            {
                if (order.Items.Count > 0)
                {
                    if (order.Status != "cancelled")
                    {
                        decimal total = 0;
                        foreach (var line in order.Items)
                        {
                            if (line.Quantity > 0)
                            {
                                total += line.Price * line.Quantity;
                            }
                        }
                        if (total >= 100)
                        {
                            total = total * 0.9m;
                        }
                        return new OrderResult { Outcome = "processed", Total = total };
                    }
                }
            }
        }
        return new OrderResult();
    }
}
`;
}

function orderTests(hidden) {
  const name = hidden ? "OrderHiddenTests" : "OrderTests";
  const body = hidden
    ? `Assert.Equal("ignored", new Orders.OrderProcessor().ProcessOrder(new Orders.Order { Items = null }).Outcome);
        Assert.Equal(0m, new Orders.OrderProcessor().ProcessOrder(new Orders.Order { Items = new() { new Orders.OrderLine { Price = 5, Quantity = -1 } } }).Total);
        Assert.Equal(99.99m, new Orders.OrderProcessor().ProcessOrder(new Orders.Order { Items = new() { new Orders.OrderLine { Price = 99.99m, Quantity = 1 } } }).Total);`
    : `var processor = new Orders.OrderProcessor();
        Assert.Equal("ignored", processor.ProcessOrder(null).Outcome);
        Assert.Equal("ignored", processor.ProcessOrder(new Orders.Order { Items = new() }).Outcome);
        Assert.Equal("ignored", processor.ProcessOrder(new Orders.Order { Status = "cancelled", Items = new() { new Orders.OrderLine { Price = 10, Quantity = 1 } } }).Outcome);
        Assert.Equal(90m, processor.ProcessOrder(new Orders.Order { Items = new() { new Orders.OrderLine { Price = 50, Quantity = 2 } } }).Total);`;
  return `namespace Orders.Tests;

public class ${name}
{
    [Fact]
    public void Behavior_is_locked()
    {
        ${body}
    }
}
`;
}

function ref002() {
  const id = "REF-002";
  prompt(id, "Refactor the checkout component", `Refactor Checkout.tsx so the pricing rules are not buried in nested conditions. Preserve the current totals. Do not change the tests. Run \`npm test\`.`);
  rubric(id, "# REF-002\n\nReact refactor. Nesting must drop. Behavior tests stay green, including the hidden boundary cases.\n");
  const cfg = reactConfig();
  add(`tasks/${id}/workspace/package.json`, reactPackage("ref-002"));
  add(`tasks/${id}/workspace/tsconfig.json`, cfg["tsconfig.json"]);
  add(`tasks/${id}/workspace/vitest.config.ts`, cfg["vitest.config.ts"]);
  add(`tasks/${id}/workspace/src/Checkout.tsx`, checkout(false));
  add(`tasks/${id}/gold/src/Checkout.tsx`, checkout(true));
  add(`tasks/${id}/workspace/tests/checkout.test.ts`, `import { quote } from "../src/Checkout";

describe("checkout", () => {
  it("keeps the current totals", () => {
    expect(quote(null)).toEqual({ outcome: "ignored", total: 0 });
    expect(quote({ status: "cancelled", items: [{ price: 10, quantity: 1 }] })).toEqual({ outcome: "ignored", total: 0 });
    expect(quote({ status: "open", items: [{ price: 40, quantity: 3 }] })).toEqual({ outcome: "quoted", total: 108 });
  });
});
`);
  add(`tasks/${id}/hidden/checkout.hidden.test.ts`, `import { quote } from "../src/Checkout";

describe("checkout edges", () => {
  it("locks boundaries", () => {
    expect(quote({ status: "open", items: [] })).toEqual({ outcome: "ignored", total: 0 });
    expect(quote({ status: "open", items: [{ price: 20, quantity: 0 }] })).toEqual({ outcome: "quoted", total: 0 });
    expect(quote({ status: "open", items: [{ price: 99, quantity: 1 }] }).total).toBe(99);
  });
});
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Extracted the nested checkout conditions into guard clauses. Totals, cancelled orders, and empty carts behave as before.\n");
  manifest({
    id,
    title: "Refactor the React checkout component",
    tier: 3,
    category: "refactor",
    difficulty: "medium",
    languages: ["react", "typescript"],
    summary: "Flatten Checkout pricing without changing totals.",
    symptom: "Pricing rules are nested inside several conditions.",
    rootCause: "The component function mixes guards and arithmetic.",
    correctFix: "Extract helpers or guard clauses and keep quote results identical.",
    hiddenCopy: [{ from: "checkout.hidden.test.ts", to: "tests/checkout.hidden.test.ts" }],
    checks: {
      initial: {
        npm: [{ script: "test", expect: "pass" }, { script: "test", expect: "pass", includeHidden: true }],
        nesting: [{ file: "src/Checkout.tsx", compare: "gte", depth: 3 }],
      },
      final: {
        npm: [{ script: "test", expect: "pass" }, { script: "test", expect: "pass", includeHidden: true }],
        nesting: [{ file: "src/Checkout.tsx", compare: "lte", depth: 1 }],
      },
    },
    scoring: {},
  });
}

function checkout(flat) {
  if (flat) {
    return `export interface Line { price: number; quantity: number }
export interface Cart { status: string; items: Line[] }

export function quote(cart: Cart | null): { outcome: string; total: number } {
  if (!cart || cart.status === "cancelled" || cart.items.length === 0) return { outcome: "ignored", total: 0 };
  const raw = cart.items.filter((line) => line.quantity > 0).reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = raw >= 100 ? raw * 0.9 : raw;
  return { outcome: "quoted", total };
}

export function Checkout(props: { cart: Cart | null }) {
  const result = quote(props.cart);
  return <p>{result.outcome}:{result.total}</p>;
}
`;
  }
  return `export interface Line { price: number; quantity: number }
export interface Cart { status: string; items: Line[] }

export function quote(cart: Cart | null): { outcome: string; total: number } {
  if (cart != null) {
    if (cart.status !== "cancelled") {
      if (cart.items != null) {
        if (cart.items.length > 0) {
          let total = 0;
          for (const line of cart.items) {
            if (line.quantity > 0) {
              total += line.price * line.quantity;
            }
          }
          if (total >= 100) {
            total = total * 0.9;
          }
          return { outcome: "quoted", total };
        }
      }
    }
  }
  return { outcome: "ignored", total: 0 };
}

export function Checkout(props: { cart: Cart | null }) {
  const result = quote(props.cart);
  return <p>{result.outcome}:{result.total}</p>;
}
`;
}

function ref003() {
  const id = "REF-003";
  prompt(id, "Split the billing processor", `BillingProcessor.cs is a god class. Split it so the file is easier to maintain, and preserve every current billing result. Do not change tests. Run \`dotnet test\`.`);
  rubric(id, "# REF-003\n\nGold moves tax, discount, and validation out of BillingProcessor.cs. The line-count gate fails if the god class remains intact. Hidden tests lock rounding and the tax-exempt flag.\n");
  const lib = guid();
  add(`tasks/${id}/workspace/Billing.sln`, sln("Billing", [
    { name: "Billing", path: "src/Billing/Billing.csproj", guid: lib },
    { name: "Billing.Tests", path: "tests/Billing.Tests/Billing.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Billing/Billing.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Billing/BillingProcessor.cs`, billingGod());
  add(`tasks/${id}/gold/src/Billing/BillingProcessor.cs`, billingSplitMain());
  add(`tasks/${id}/gold/src/Billing/BillingRules.cs`, billingRules());
  add(`tasks/${id}/workspace/tests/Billing.Tests/Billing.Tests.csproj`, testproj(["../../src/Billing/Billing.csproj"]));
  add(`tasks/${id}/workspace/tests/Billing.Tests/BillingTests.cs`, `namespace Billing.Tests;

public class BillingTests
{
    [Fact]
    public void Standard_invoice_matches_current_total()
    {
        var total = new Billing.BillingProcessor().Total(new Billing.Invoice { Region = "EU", Subtotal = 200, TaxExempt = false });
        Assert.Equal(207m, total);
    }
}
`);
  add(`tasks/${id}/hidden/BillingHiddenTests.cs`, `namespace Billing.Tests;

public class BillingHiddenTests
{
    [Fact]
    public void Exempt_and_small_invoices_keep_current_rules()
    {
        var processor = new Billing.BillingProcessor();
        Assert.Equal(180m, processor.Total(new Billing.Invoice { Region = "EU", Subtotal = 200, TaxExempt = true }));
        Assert.Equal(53m, processor.Total(new Billing.Invoice { Region = "US", Subtotal = 50, TaxExempt = false }));
        Assert.Equal(0m, processor.Total(new Billing.Invoice { Region = "US", Subtotal = 0, TaxExempt = false }));
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Moved discount and tax rules out of BillingProcessor. Invoice totals are unchanged, including the exempt and regional cases.\n");
  manifest({
    id,
    title: "Refactor the billing god class",
    tier: 3,
    category: "refactor",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "Split BillingProcessor without changing invoice totals.",
    symptom: "Pricing, tax, and validation live in one long method.",
    rootCause: "The class accumulated every billing rule.",
    correctFix: "Move rules to focused types and keep Total results identical.",
    hiddenCopy: [{ from: "BillingHiddenTests.cs", to: "tests/Billing.Tests/BillingHiddenTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [{ project: "Billing.sln", expect: "pass" }, { project: "Billing.sln", expect: "pass", includeHidden: true }],
        lineCount: [{ file: "src/Billing/BillingProcessor.cs", compare: "gte", lines: 180 }],
      },
      final: {
        dotnetTest: [{ project: "Billing.sln", expect: "pass" }, { project: "Billing.sln", expect: "pass", includeHidden: true }],
        lineCount: [{ file: "src/Billing/BillingProcessor.cs", compare: "lte", lines: 80 }],
      },
    },
    scoring: {},
  });
}

function billingGod() {
  const filler = Array.from({ length: 150 }, (_, i) => `        if (invoice.Subtotal == ${1000 + i}m) note = note + "x";`).join("\n");
  return `namespace Billing;

public sealed class Invoice
{
    public string Region { get; init; } = "";
    public decimal Subtotal { get; init; }
    public bool TaxExempt { get; init; }
}

public sealed class BillingProcessor
{
    public decimal Total(Invoice invoice)
    {
        if (invoice == null) return 0;
        if (invoice.Subtotal < 0) return 0;
        decimal subtotal = invoice.Subtotal;
        decimal discount = 0;
        if (subtotal >= 100)
        {
            if (invoice.Region == "EU")
            {
                discount = subtotal * 0.10m;
            }
            else if (invoice.Region == "US")
            {
                discount = subtotal * 0.05m;
            }
            else
            {
                discount = subtotal * 0.02m;
            }
        }
        var discounted = subtotal - discount;
        decimal tax = 0;
        if (!invoice.TaxExempt)
        {
            if (invoice.Region == "EU") tax = discounted * 0.15m;
            else if (invoice.Region == "US") tax = discounted * 0.06m;
            else tax = discounted * 0.08m;
        }
        var note = "";
${filler}
        if (note.Length < 0) discounted += 1;
        return decimal.Round(discounted + tax, 2, MidpointRounding.AwayFromZero);
    }
}
`;
}

function billingSplitMain() {
  return `namespace Billing;

public sealed class Invoice
{
    public string Region { get; init; } = "";
    public decimal Subtotal { get; init; }
    public bool TaxExempt { get; init; }
}

public sealed class BillingProcessor
{
    public decimal Total(Invoice invoice) => BillingRules.Total(invoice);
}
`;
}

function billingRules() {
  return `namespace Billing;

public static class BillingRules
{
    public static decimal Total(Invoice invoice)
    {
        if (invoice == null || invoice.Subtotal < 0) return 0;
        var discountRate = invoice.Subtotal >= 100
            ? invoice.Region switch { "EU" => 0.10m, "US" => 0.05m, _ => 0.02m }
            : 0m;
        var discounted = invoice.Subtotal - invoice.Subtotal * discountRate;
        var taxRate = invoice.TaxExempt ? 0m : invoice.Region switch { "EU" => 0.15m, "US" => 0.06m, _ => 0.08m };
        return decimal.Round(discounted + discounted * taxRate, 2, MidpointRounding.AwayFromZero);
    }
}
`;
}

function sec001() {
  const id = "SEC-001";
  prompt(id, "Audit the support desk", `Audit this application for security vulnerabilities. It currently behaves correctly for normal input.

Identify each issue, explain the risk, and propose a fix. Do not modify the code. Write the findings in ANSWER.md.

Look at least at query construction, file paths, authorization, logging, and the React comment renderer.`);
  rubric(id, "# SEC-001\n\nFive issues: SQL interpolation, path traversal, authenticated-but-not-admin access, password logging, and dangerouslySetInnerHTML.\n");
  writeSecureApp(id, false);
  add(`tasks/${id}/gold/ANSWER.md`, `# Findings

1. SQL injection: UserLookup builds a query by interpolating the name. An attacker can change the query. Use a parameter.
2. Path traversal: DocumentStore combines the upload directory with the raw file name. A name such as ../secret can escape the directory. Use only the file name and reject paths outside the root.
3. Authorization: AdminController returns admin data to any authenticated user. Require the Admin role.
4. Sensitive logging: Login failed logs the password. Log the username only.
5. Cross-site scripting: CommentBody uses dangerouslySetInnerHTML for comment text. Render escaped text instead.
`);
  manifest({
    id,
    title: "Security audit, do not modify",
    tier: 4,
    category: "analysis",
    difficulty: "medium",
    languages: ["csharp", "react"],
    summary: "The app works. Find the injection, traversal, authorization, logging, and XSS issues.",
    symptom: "No failing test. The defects are unsafe patterns.",
    rootCause: "Query interpolation, unsanitized paths, role-blind auth, password logging, and raw HTML rendering.",
    correctFix: "Describe each issue, the risk, and a fix. Do not edit code.",
    checks: {
      initial: { dotnetTest: [{ project: "Support.sln", expect: "pass" }] },
      final: {
        unchangedExcept: ["ANSWER.md"],
        answerGroups: [
          { id: "sql", patterns: ["sql injection", "interpolat"] },
          { id: "path", patterns: ["path traversal", "\\.\\./"] },
          { id: "auth", patterns: ["admin", "authori"] },
          { id: "log", patterns: ["password"] },
          { id: "xss", patterns: ["dangerouslySetInnerHTML", "cross-site", "xss"] },
        ],
      },
    },
    scoring: {},
  });
}

function sec002() {
  const id = "SEC-002";
  prompt(id, "Fix the security issues", `Fix every security issue in this application and add tests where practical.

Cover SQL injection, path traversal, admin authorization, password logging, and the React comment renderer. Do not change the happy-path behavior. Run \`dotnet test\` and \`npm test\`.`);
  rubric(id, "# SEC-002\n\nHidden tests reject raw SQL concatenation, escaped paths, non-admin access, password logs, and raw HTML rendering.\n");
  writeSecureApp(id, true);
  add(`tasks/${id}/hidden/SecurityHiddenTests.cs`, securityHidden());
  add(`tasks/${id}/hidden/comment.hidden.test.ts`, `import { toCommentHtml } from "../src/comments";

describe("comments", () => {
  it("does not return raw markup", () => {
    expect(toCommentHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Parameterized the user query, confined uploads to the root, required the Admin role, stopped logging passwords, and escaped comment text.\n");
  manifest({
    id,
    title: "Fix the security issues",
    tier: 4,
    category: "security",
    difficulty: "hard",
    languages: ["csharp", "react"],
    summary: "Fix injection, traversal, authorization, logging, and XSS, and cover them with tests.",
    symptom: "The happy path works while the unsafe patterns remain.",
    rootCause: "The same five vulnerabilities as the audit task.",
    correctFix: "Parameterize, confine paths, check the Admin role, redact passwords, and escape HTML.",
    hiddenCopy: [
      { from: "SecurityHiddenTests.cs", to: "tests/Support.Tests/SecurityHiddenTests.cs" },
      { from: "comment.hidden.test.ts", to: "tests/comment.hidden.test.ts" },
    ],
    checks: {
      initial: {
        dotnetTest: [{ project: "Support.sln", expect: "pass" }],
        npm: [{ script: "test", expect: "pass" }],
      },
      final: {
        dotnetTest: [{ project: "Support.sln", expect: "pass" }, { project: "Support.sln", expect: "pass", includeHidden: true }],
        npm: [{ script: "test", expect: "pass" }, { script: "test", expect: "pass", includeHidden: true }],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 8 },
  });
}

function writeSecureApp(id, fixedGold) {
  const cfg = reactConfig();
  add(`tasks/${id}/workspace/Support.sln`, sln("Support", [
    { name: "Support", path: "src/Support/Support.csproj", guid: guid() },
    { name: "Support.Tests", path: "tests/Support.Tests/Support.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Support/Support.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Support/SupportDesk.cs`, supportCode(false));
  if (fixedGold) add(`tasks/${id}/gold/src/Support/SupportDesk.cs`, supportCode(true));
  add(`tasks/${id}/workspace/tests/Support.Tests/Support.Tests.csproj`, testproj(["../../src/Support/Support.csproj"]));
  add(`tasks/${id}/workspace/tests/Support.Tests/HappyPathTests.cs`, `namespace Support.Tests;

public class HappyPathTests
{
    [Fact]
    public void Alice_can_be_found_and_a_file_can_be_saved()
    {
        var db = new Support.FakeDb();
        var lookup = new Support.UserLookup(db);
        Assert.Equal("Alice", lookup.Search("Alice")[0].Name);
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var saved = new Support.DocumentStore(root).Save("note.txt", "hello"u8.ToArray());
        Assert.StartsWith(root, saved);
    }
}
`);
  add(`tasks/${id}/workspace/package.json`, reactPackage(id.toLowerCase()));
  add(`tasks/${id}/workspace/tsconfig.json`, cfg["tsconfig.json"]);
  add(`tasks/${id}/workspace/vitest.config.ts`, cfg["vitest.config.ts"]);
  add(`tasks/${id}/workspace/src/comments.tsx`, comments(false));
  if (fixedGold) add(`tasks/${id}/gold/src/comments.tsx`, comments(true));
  add(`tasks/${id}/workspace/tests/comments.test.ts`, `import { toCommentHtml } from "../src/comments";

describe("comments", () => {
  it("returns text for a normal comment", () => {
    expect(toCommentHtml("thanks")).toContain("thanks");
  });
});
`);
}

function supportCode(fixed) {
  const query = fixed
    ? `public IReadOnlyList<User> Search(string name)
    {
        return _db.Query("SELECT * FROM Users WHERE Name = @name", new Dictionary<string, object?> { ["name"] = name });
    }`
    : `public IReadOnlyList<User> Search(string name)
    {
        return _db.Query($"SELECT * FROM Users WHERE Name = '{name}'", null);
    }`;
  const save = fixed
    ? `var file = Path.GetFileName(fileName);
        var path = Path.GetFullPath(Path.Combine(_root, file));
        if (!path.StartsWith(Path.GetFullPath(_root), StringComparison.Ordinal)) throw new InvalidOperationException("path escapes root");
        Directory.CreateDirectory(_root);
        File.WriteAllBytes(path, content);
        return path;`
    : `var path = Path.Combine(_root, fileName);
        Directory.CreateDirectory(_root);
        File.WriteAllBytes(path, content);
        return path;`;
  const admin = fixed
    ? `if (user.Role != "Admin") return "forbidden";
        return GetAdminData();`
    : `if (user.IsAuthenticated) return GetAdminData();
        return "forbidden";`;
  const log = fixed
    ? `_logger.LogInformation("Login failed for {Username}", username);`
    : `_logger.LogInformation("Login failed for {Username} using password {Password}", username, password);`;
  return `namespace Support;

public sealed record User(string Name, string Role, bool IsAuthenticated);

public interface IDb
{
    IReadOnlyList<User> Query(string sql, IReadOnlyDictionary<string, object?>? parameters);
    string LastSql { get; }
}

public sealed class FakeDb : IDb
{
    public string LastSql { get; private set; } = "";
    private readonly List<User> _users = new() { new("Alice", "User", true), new("Ada", "Admin", true) };
    public IReadOnlyList<User> Query(string sql, IReadOnlyDictionary<string, object?>? parameters)
    {
        LastSql = sql;
        if (parameters is null && sql.Contains("' OR ", StringComparison.OrdinalIgnoreCase)) return _users;
        var name = parameters?["name"]?.ToString();
        if (name is null)
        {
            var start = sql.IndexOf('\\'');
            var end = sql.LastIndexOf('\\'');
            name = start >= 0 && end > start ? sql.Substring(start + 1, end - start - 1) : "";
        }
        return _users.Where(user => user.Name == name).ToList();
    }
}

public sealed class UserLookup
{
    private readonly IDb _db;
    public UserLookup(IDb db) => _db = db;
    ${query}
}

public sealed class DocumentStore
{
    private readonly string _root;
    public DocumentStore(string root) => _root = root;
    public string Save(string fileName, byte[] content)
    {
        ${save}
    }
}

public sealed class AdminService
{
    public string GetAdminData() => "admin-export";
    public string Read(User user)
    {
        ${admin}
    }
}

public interface ILog
{
    void LogInformation(string template, params object[] values);
    IReadOnlyList<string> Messages { get; }
}

public sealed class ListLog : ILog
{
    public List<string> Messages { get; } = new();
    IReadOnlyList<string> ILog.Messages => Messages;
    public void LogInformation(string template, params object[] values)
    {
        Messages.Add(template + " " + string.Join(" ", values));
    }
}

public sealed class LoginService
{
    private readonly ILog _logger;
    public LoginService(ILog logger) => _logger = logger;
    public void Fail(string username, string password)
    {
        ${log}
    }
}
`;
}

function comments(fixed) {
  if (fixed) {
    return `export function toCommentHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function CommentBody(props: { text: string }) {
  return <p>{toCommentHtml(props.text)}</p>;
}
`;
  }
  return `export function toCommentHtml(text: string): string {
  return text;
}

export function CommentBody(props: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: toCommentHtml(props.text) }} />;
}
`;
}

function securityHidden() {
  return `namespace Support.Tests;

public class SecurityHiddenTests
{
    [Fact]
    public void Injection_payload_is_not_concatenated()
    {
        var db = new Support.FakeDb();
        var lookup = new Support.UserLookup(db);
        var payload = "Robert' OR '1'='1";
        Assert.Empty(lookup.Search(payload));
        Assert.DoesNotContain(payload, db.LastSql);
    }

    [Fact]
    public void Upload_cannot_escape_the_root()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var saved = new Support.DocumentStore(root).Save("../secret.txt", "x"u8.ToArray());
        Assert.StartsWith(Path.GetFullPath(root), Path.GetFullPath(saved));
    }

    [Fact]
    public void Authenticated_user_does_not_receive_admin_data()
    {
        var result = new Support.AdminService().Read(new Support.User("Alice", "User", true));
        Assert.Equal("forbidden", result);
    }

    [Fact]
    public void Password_is_not_logged()
    {
        var log = new Support.ListLog();
        new Support.LoginService(log).Fail("ada", "S3cret!");
        Assert.DoesNotContain(log.Messages, message => message.Contains("S3cret!"));
    }
}
`;
}

function perf001() {
  const id = "PERF-001";
  prompt(id, "Speed up order matching", `MatchOrders is correct but too slow. For large user and order sets it must not scan every order for every user.

Keep the same matches. A hidden check counts how many times Order.UserId is read; a nested loop will fail it. Run \`dotnet test\`.`);
  rubric(id, "# PERF-001\n\nThe visible tests use tiny lists. Order.UserId is virtual so the hidden test can count reads. Gold groups orders once.\n");
  const lib = guid();
  add(`tasks/${id}/workspace/Match.sln`, sln("Match", [
    { name: "Match", path: "src/Match/Match.csproj", guid: lib },
    { name: "Match.Tests", path: "tests/Match.Tests/Match.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Match/Match.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Match/Matcher.cs`, matcher(false));
  add(`tasks/${id}/gold/src/Match/Matcher.cs`, matcher(true));
  add(`tasks/${id}/workspace/tests/Match.Tests/Match.Tests.csproj`, testproj(["../../src/Match/Match.csproj"]));
  add(`tasks/${id}/workspace/tests/Match.Tests/MatchTests.cs`, `namespace Match.Tests;

public class MatchTests
{
    [Fact]
    public void Matches_active_orders()
    {
        var users = new List<Match.User> { new() { Id = 1 }, new() { Id = 2 } };
        var orders = new List<Match.Order>
        {
            new() { UserId = 1, Status = Match.Status.Active, Total = 5 },
            new() { UserId = 1, Status = Match.Status.Cancelled, Total = 9 },
            new() { UserId = 2, Status = Match.Status.Active, Total = 4 }
        };
        var matched = new Match.Matcher().MatchOrders(users, orders);
        Assert.Equal(5, matched[0].Total);
        Assert.Equal(4, matched[1].Total);
    }
}
`);
  add(`tasks/${id}/hidden/MatchHiddenTests.cs`, `namespace Match.Tests;

public class MatchHiddenTests
{
    [Fact]
    public void Does_not_read_every_order_for_every_user()
    {
        var users = Enumerable.Range(0, 400).Select(i => new Match.User { Id = i }).ToList();
        var orders = Enumerable.Range(0, 4000).Select(i => (Match.Order)new CountingOrder { UserIdValue = i % 400, Status = Match.Status.Active, Total = 1 }).ToList();
        CountingOrder.Reads = 0;
        new Match.Matcher().MatchOrders(users, orders);
        Assert.True(CountingOrder.Reads < orders.Count * 5, $"reads={CountingOrder.Reads}");
    }

    private sealed class CountingOrder : Match.Order
    {
        public static int Reads;
        public int UserIdValue { get; init; }
        public override int UserId { get { Reads++; return UserIdValue; } }
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "The nested loop compared every order with every user. Orders are now grouped by user id in a dictionary lookup index, so UserId is read about once per order.\n");
  manifest({
    id,
    title: "Algorithmic order matching",
    tier: 4,
    category: "performance",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "Replace the nested user/order scan with a lookup.",
    symptom: "Matching is correct and quadratic.",
    rootCause: "Each user scans the full order list.",
    correctFix: "Group orders by user id before aggregating.",
    hiddenCopy: [{ from: "MatchHiddenTests.cs", to: "tests/Match.Tests/MatchHiddenTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [
          { project: "Match.sln", expect: "pass" },
          { project: "Match.sln", expect: "fail", includeHidden: true, minFailedTests: 1 },
        ],
      },
      final: {
        dotnetTest: [
          { project: "Match.sln", expect: "pass" },
          { project: "Match.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { rootCausePatterns: ["lookup", "group", "dictionary", "index"] },
  });
}

function matcher(fast) {
  const body = fast
    ? `var grouped = orders.Where(order => order.Status == Status.Active).GroupBy(order => order.UserId).ToDictionary(g => g.Key, g => g.Sum(order => order.Total));
        return users.Select(user => new UserOrders(user.Id, grouped.GetValueOrDefault(user.Id))).ToList();`
    : `var results = new List<UserOrders>();
        foreach (var user in users)
        {
            decimal total = 0;
            foreach (var order in orders)
            {
                if (order.UserId == user.Id && order.Status == Status.Active) total += order.Total;
            }
            results.Add(new UserOrders(user.Id, total));
        }
        return results;`;
  return `namespace Match;

public enum Status { Active, Cancelled }

public sealed class User
{
    public int Id { get; init; }
}

public class Order
{
    public virtual int UserId { get; init; }
    public Status Status { get; init; }
    public decimal Total { get; init; }
}

public sealed record UserOrders(int UserId, decimal Total);

public sealed class Matcher
{
    public IReadOnlyList<UserOrders> MatchOrders(IReadOnlyList<User> users, IReadOnlyList<Order> orders)
    {
        ${body}
    }
}
`;
}

function perf002() {
  const id = "PERF-002";
  prompt(id, "Remove the N+1 work", `Two client functions are correct and expensive:

- groupActive filters the full order list once per user
- loadOrders calls the single-user endpoint once per user

docs/orders-api.md describes GET /api/orders?userIds=1,2,3. Use it, and group orders without a nested filter. Functional results must stay the same. Run \`npm test\`.`);
  rubric(id, "# PERF-002\n\nHidden tests count userId getter reads and fetch calls. Gold builds one map and one bulk request.\n");
  const cfg = reactConfig();
  add(`tasks/${id}/workspace/package.json`, reactPackage("perf-002"));
  add(`tasks/${id}/workspace/tsconfig.json`, cfg["tsconfig.json"]);
  add(`tasks/${id}/workspace/vitest.config.ts`, cfg["vitest.config.ts"]);
  add(`tasks/${id}/workspace/docs/orders-api.md`, `# Orders API

GET /api/orders?userId=1 returns one user's orders.
GET /api/orders?userIds=1,2,3 returns orders for many users in one call.
`);
  add(`tasks/${id}/workspace/src/orders.ts`, ordersPerf(false));
  add(`tasks/${id}/gold/src/orders.ts`, ordersPerf(true));
  add(`tasks/${id}/workspace/src/OrderTable.tsx`, `import { groupActive } from "./orders";

export function OrderTable(props: { users: { id: number }[]; orders: { userId: number; status: string }[] }) {
  const groups = groupActive(props.users, props.orders);
  return <p>{groups.length}</p>;
}
`);
  add(`tasks/${id}/workspace/tests/orders.test.ts`, `import { groupActive, loadOrders } from "../src/orders";

describe("orders", () => {
  it("groups active orders", () => {
    const grouped = groupActive([{ id: 1 }, { id: 2 }], [
      { userId: 1, status: "active" },
      { userId: 1, status: "closed" },
      { userId: 2, status: "active" },
    ]);
    expect(grouped.map((group) => group.length)).toEqual([1, 1]);
  });

  it("loads orders for the requested users", async () => {
    const fetchImpl = async (url: string) => new Response(JSON.stringify([{ userId: url, status: "active" }]), { status: 200 });
    const loaded = await loadOrders(fetchImpl, [1, 2]);
    expect(loaded).toHaveLength(2);
  });
});
`);
  add(`tasks/${id}/hidden/orders.hidden.test.ts`, `import { groupActive, loadOrders } from "../src/orders";

describe("performance", () => {
  it("does not filter once per user", () => {
    let reads = 0;
    const orders = Array.from({ length: 2000 }, (_, index) => ({
      get userId() { reads += 1; return index % 50; },
      status: "active",
    }));
    groupActive(Array.from({ length: 50 }, (_, id) => ({ id })), orders);
    expect(reads).toBeLessThan(orders.length * 5);
  });

  it("does not fetch once per user", async () => {
    let calls = 0;
    const fetchImpl = async (url: string) => {
      calls += 1;
      const ids = new URL(url, "http://local").searchParams.get("userIds")?.split(",") ?? [new URL(url, "http://local").searchParams.get("userId")];
      return new Response(JSON.stringify(ids.map((id) => ({ userId: Number(id), status: "active" }))), { status: 200 });
    };
    const loaded = await loadOrders(fetchImpl, Array.from({ length: 30 }, (_, id) => id + 1));
    expect(calls).toBeLessThanOrEqual(2);
    expect(loaded.flat()).toHaveLength(30);
  });
});
`);
  add(`tasks/${id}/gold/ANSWER.md`, "groupActive now indexes orders once in a map. loadOrders uses the documented bulk userIds query instead of one request per user.\n");
  manifest({
    id,
    title: "N+1 fetches and repeated filters",
    tier: 4,
    category: "performance",
    difficulty: "hard",
    languages: ["react", "typescript"],
    summary: "Replace a nested filter and a per-user fetch with one index and the bulk endpoint.",
    symptom: "Results are correct. Work grows with users times orders, and with one HTTP call per user.",
    rootCause: "groupActive filters the full list per user. loadOrders ignores the bulk endpoint.",
    correctFix: "Build a map once and request /api/orders?userIds=.",
    hiddenCopy: [{ from: "orders.hidden.test.ts", to: "tests/orders.hidden.test.ts" }],
    checks: {
      initial: {
        npm: [
          { script: "test", expect: "pass" },
          { script: "test", expect: "fail", includeHidden: true, minFailedTests: 1 },
        ],
      },
      final: {
        npm: [
          { script: "test", expect: "pass" },
          { script: "test", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { rootCausePatterns: ["userIds", "map", "index", "bulk"] },
  });
}

function ordersPerf(fast) {
  const group = fast
    ? `const byUser = new Map<number, Order[]>();
  for (const order of orders) {
    if (order.status !== "active") continue;
    const list = byUser.get(order.userId) ?? [];
    list.push(order);
    byUser.set(order.userId, list);
  }
  return users.map((user) => byUser.get(user.id) ?? []);`
    : `return users.map((user) => orders.filter((order) => order.userId === user.id && order.status === "active"));`;
  const load = fast
    ? `const response = await fetchImpl(\`/api/orders?userIds=\${userIds.join(",")}\`);
  const body = await response.json();
  return userIds.map((id) => body.filter((order) => order.userId === id));`
    : `const results = [];
  for (const id of userIds) {
    const response = await fetchImpl(\`/api/orders?userId=\${id}\`);
    results.push(await response.json());
  }
  return results;`;
  return `export interface Order { userId: number; status: string }

export function groupActive(users: { id: number }[], orders: Order[]): Order[][] {
  ${group}
}

export async function loadOrders(fetchImpl: (url: string) => Promise<{ json(): Promise<Order[]> }>, userIds: number[]): Promise<Order[][]> {
  ${load}
}
`;
}
