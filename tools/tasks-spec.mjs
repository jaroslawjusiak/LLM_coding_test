import { add, csproj, guid, manifest, prompt, rubric, sln, testproj, webproj } from "./lib.mjs";

export function specTasks() {
  spec001();
  spec002();
  spec003();
  spec004();
  spec005();
}

function spec001() {
  const id = "SPEC-001";
  prompt(id, "Compare the notification system to the plan", `Read IMPLEMENTATION_PLAN.md and the code under src/. Identify every missing, incorrect, or partially implemented requirement.

Do not modify the code. Write the findings in ANSWER.md. For each requirement say whether it is implemented, partial, or missing, and cite the type that supports that conclusion.`);
  rubric(id, `# SPEC-001

Analysis only. SMS is a dead type. A failed delivery is attempted once and is not retried. There is no dedup. Only successes are recorded. Unsubscribe does not exist. Send is synchronous.`);
  add(`tasks/${id}/workspace/IMPLEMENTATION_PLAN.md`, `# User notification system

The system must:

1. Allow users to subscribe to notifications.
2. Support email and SMS.
3. Retry failed deliveries up to 3 times.
4. Never send duplicate notifications.
5. Record every delivery attempt.
6. Allow users to unsubscribe.
7. Process notifications asynchronously.
`);
  const lib = guid();
  add(`tasks/${id}/workspace/Notifications.sln`, sln("Notifications", [
    { name: "Notifications", path: "src/Notifications/Notifications.csproj", guid: lib },
    { name: "Notifications.Tests", path: "tests/Notifications.Tests/Notifications.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Notifications/Notifications.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Notifications/NotificationService.cs`, notificationService());
  add(`tasks/${id}/workspace/tests/Notifications.Tests/Notifications.Tests.csproj`, testproj(["../../src/Notifications/Notifications.csproj"]));
  add(`tasks/${id}/workspace/tests/Notifications.Tests/NotificationTests.cs`, `namespace Notifications.Tests;

public class NotificationTests
{
    [Fact]
    public void Email_subscribe_and_send_records_success()
    {
        var email = new Notifications.FakeEmail();
        var service = new Notifications.NotificationService(email);
        service.Subscribe("u1", "email", "ada@example.com");
        service.Send("u1", "hello");
        Assert.Equal(new[] { "ada@example.com:hello" }, email.Sent);
        Assert.Single(service.Attempts);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, `# Gaps

1. Subscribe is implemented for email.
2. SMS is missing. Subscribe rejects non-email channels, and SmsChannel is never called.
3. Retry is incorrect. A failed delivery is attempted once, not three times.
4. Duplicate suppression is missing. A second Send delivers again.
5. Delivery attempts are only partially recorded. Successes are stored and failures are dropped.
6. Unsubscribe is missing.
7. Processing is synchronous. Send blocks the caller and does not queue work.
`);
  manifest({
    id,
    title: "Notification spec versus implementation",
    tier: 3,
    category: "analysis",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "The notification service looks complete. Compare it with IMPLEMENTATION_PLAN.md and do not edit code.",
    symptom: "Several requirements are missing, partial, or wrong while the happy-path test stays green.",
    rootCause: "The implementation covers email subscribe/send only.",
    correctFix: "Report the gaps. Do not modify the code in this variant.",
    checks: {
      initial: { dotnetTest: [{ project: "Notifications.sln", expect: "pass" }] },
      final: {
        unchangedExcept: ["ANSWER.md"],
        answerFile: "ANSWER.md",
        answerGroups: [
          { id: "sms", patterns: ["sms[\\s\\S]{0,80}missing"] },
          { id: "retry", patterns: ["retry[\\s\\S]{0,80}(once|incorrect|not three)"] },
          { id: "duplicate", patterns: ["duplicate[\\s\\S]{0,80}missing"] },
          { id: "attempts", patterns: ["(attempt|recorded)[\\s\\S]{0,80}(partial|success)"] },
          { id: "unsubscribe", patterns: ["unsubscribe[\\s\\S]{0,40}missing"] },
          { id: "async", patterns: ["synchronous"] },
        ],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0 },
  });
}

function notificationService() {
  return `namespace Notifications;

public sealed record Subscription(string UserId, string Channel, string Address);
public sealed record DeliveryAttempt(string UserId, string Address, bool Success);

public interface IEmailSender
{
    void Send(string address, string body);
}

public sealed class FakeEmail : IEmailSender
{
    public List<string> Sent { get; } = new();
    public void Send(string address, string body) => Sent.Add($"{address}:{body}");
}

public sealed class SmsChannel
{
    public void Send(string phone, string body) => throw new NotSupportedException(phone + body);
}

public sealed class NotificationService
{
    private readonly IEmailSender _email;
    private readonly List<Subscription> _subs = new();
    public List<DeliveryAttempt> Attempts { get; } = new();

    public NotificationService(IEmailSender email) => _email = email;

    public void Subscribe(string userId, string channel, string address)
    {
        if (channel != "email") throw new NotSupportedException("Only email is supported.");
        _subs.Add(new Subscription(userId, channel, address));
    }

    public void Send(string userId, string body)
    {
        foreach (var sub in _subs.Where(s => s.UserId == userId))
        {
            try
            {
                _email.Send(sub.Address, body);
                Attempts.Add(new DeliveryAttempt(userId, sub.Address, true));
            }
            catch
            {
                // failed attempts are not recorded and are not retried
            }
        }
    }
}
`;
}

function spec002() {
  const id = "SPEC-002";
  prompt(id, "Implement the payment service", `The tests describe the required behavior. PaymentService.ChargeAsync throws NotImplementedException.

Implement it so the tests pass. Handle null orders, do not charge a cancelled order, retry a transient gateway failure up to three attempts, and do not charge the same payment id twice.

Run \`dotnet test\`. There may be additional cases beyond the tests you can see; implement the service properly rather than hard-coding the visible examples.`);
  rubric(id, `# SPEC-002

Visible tests cover a normal charge, a cancelled order, and three retries. Hidden tests cover null, duplicate payment ids, a zero amount, and a large decimal. Gold is a real implementation, not a table of the visible inputs.`);
  const lib = guid();
  add(`tasks/${id}/workspace/Payments.sln`, sln("Payments", [
    { name: "Payments", path: "src/Payments/Payments.csproj", guid: lib },
    { name: "Payments.Tests", path: "tests/Payments.Tests/Payments.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Payments/Payments.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Payments/PaymentService.cs`, paymentTypes(false));
  add(`tasks/${id}/gold/src/Payments/PaymentService.cs`, paymentTypes(true));
  add(`tasks/${id}/workspace/tests/Payments.Tests/Payments.Tests.csproj`, testproj(["../../src/Payments/Payments.csproj"]));
  add(`tasks/${id}/workspace/tests/Payments.Tests/PaymentTests.cs`, visiblePaymentTests());
  add(`tasks/${id}/hidden/PaymentHiddenTests.cs`, hiddenPaymentTests());
  add(`tasks/${id}/gold/ANSWER.md`, "ChargeAsync now skips cancelled and non-positive amounts, retries transient failures three times, and records a payment id so a duplicate charge is not sent to the gateway.\n");
  manifest({
    id,
    title: "Test-driven payment service",
    tier: 1,
    category: "implementation",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "Visible tests describe the happy path and retries. Hidden tests cover null, duplicates, zero, and large amounts.",
    symptom: "ChargeAsync throws NotImplementedException.",
    rootCause: "The service has not been implemented.",
    correctFix: "Implement the gateway loop, cancellation skip, and idempotent ledger.",
    hiddenCopy: [{ from: "PaymentHiddenTests.cs", to: "tests/Payments.Tests/PaymentHiddenTests.cs" }],
    checks: {
      initial: { dotnetTest: [{ project: "Payments.sln", expect: "fail" }] },
      final: {
        dotnetTest: [
          { project: "Payments.sln", expect: "pass" },
          { project: "Payments.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 3 },
  });
}

function paymentTypes(done) {
  const body = done
    ? `ArgumentNullException.ThrowIfNull(order);
        if (order.Status == OrderStatus.Cancelled || order.Amount <= 0)
            return PaymentResult.Skipped();
        if (_ledger.Has(order.PaymentId))
            return PaymentResult.Skipped();
        Exception? last = null;
        for (var attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                await _gateway.ChargeAsync(order.PaymentId, order.Amount, ct);
                _ledger.Record(order.PaymentId);
                return PaymentResult.Charged(attempt);
            }
            catch (TransientPaymentException ex)
            {
                last = ex;
            }
        }
        return PaymentResult.Failed(last!);`
    : `throw new NotImplementedException();`;
  return `namespace Payments;

public enum OrderStatus { Open, Cancelled }

public sealed class Order
{
    public string PaymentId { get; init; } = "";
    public OrderStatus Status { get; init; }
    public decimal Amount { get; init; }
}

public sealed class TransientPaymentException : Exception
{
    public TransientPaymentException() { }
    public TransientPaymentException(string message) : base(message) { }
}

public interface IPaymentGateway
{
    Task ChargeAsync(string paymentId, decimal amount, CancellationToken ct);
}

public interface IPaymentLedger
{
    bool Has(string paymentId);
    void Record(string paymentId);
}

public sealed class PaymentResult
{
    public bool ChargedSuccessfully { get; init; }
    public int Attempts { get; init; }
    public static PaymentResult Charged(int attempts) => new() { ChargedSuccessfully = true, Attempts = attempts };
    public static PaymentResult Skipped() => new();
    public static PaymentResult Failed(Exception error) => new() { Attempts = 3 };
}

public sealed class PaymentService
{
    private readonly IPaymentGateway _gateway;
    private readonly IPaymentLedger _ledger;
    public PaymentService(IPaymentGateway gateway, IPaymentLedger ledger)
    {
        _gateway = gateway;
        _ledger = ledger;
    }

    public async Task<PaymentResult> ChargeAsync(Order order, CancellationToken ct = default)
    {
        ${body}
    }
}
`;
}

function visiblePaymentTests() {
  return `namespace Payments.Tests;

public class PaymentTests
{
    [Fact]
    public async Task Should_not_charge_cancelled_order()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "p1", Status = Payments.OrderStatus.Cancelled, Amount = 10 });
        Assert.False(result.ChargedSuccessfully);
        Assert.Empty(gateway.Calls);
    }

    [Fact]
    public async Task Should_retry_payment_three_times()
    {
        var gateway = new FakeGateway { FailuresBeforeSuccess = 3 };
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "p2", Amount = 10 });
        Assert.False(result.ChargedSuccessfully);
        Assert.Equal(3, gateway.Calls.Count);
    }

    [Fact]
    public async Task Should_charge_a_normal_order()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "p3", Amount = 12.5m });
        Assert.True(result.ChargedSuccessfully);
        Assert.Equal(new[] { "p3" }, gateway.Calls);
    }
}

public sealed class FakeGateway : Payments.IPaymentGateway
{
    public int FailuresBeforeSuccess { get; init; }
    public List<string> Calls { get; } = new();
    public Task ChargeAsync(string paymentId, decimal amount, CancellationToken ct)
    {
        Calls.Add(paymentId);
        if (Calls.Count <= FailuresBeforeSuccess) throw new Payments.TransientPaymentException("down");
        return Task.CompletedTask;
    }
}

public sealed class Ledger : Payments.IPaymentLedger
{
    private readonly HashSet<string> _ids = new();
    public bool Has(string paymentId) => _ids.Contains(paymentId);
    public void Record(string paymentId) => _ids.Add(paymentId);
}
`;
}

function hiddenPaymentTests() {
  return `namespace Payments.Tests;

public class PaymentHiddenTests
{
    [Fact]
    public async Task Null_order_is_rejected()
    {
        var service = new Payments.PaymentService(new FakeGateway(), new Ledger());
        await Assert.ThrowsAsync<ArgumentNullException>(() => service.ChargeAsync(null!));
    }

    [Fact]
    public async Task Duplicate_payment_id_is_not_charged_twice()
    {
        var gateway = new FakeGateway();
        var ledger = new Ledger();
        var service = new Payments.PaymentService(gateway, ledger);
        var order = new Payments.Order { PaymentId = "dup", Amount = 4 };
        await service.ChargeAsync(order);
        await service.ChargeAsync(order);
        Assert.Single(gateway.Calls);
    }

    [Fact]
    public async Task Zero_amount_is_not_charged()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        await service.ChargeAsync(new Payments.Order { PaymentId = "z", Amount = 0 });
        Assert.Empty(gateway.Calls);
    }

    [Fact]
    public async Task Large_amount_is_charged()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "big", Amount = 1000000.50m });
        Assert.True(result.ChargedSuccessfully);
    }
}
`;
}

function spec003() {
  const id = "SPEC-003";
  prompt(id, "Where is account deletion authorized?", `Where is the authorization decision for deleting an account made? Explain the call chain.

Do not modify the code. Similar type names, a generated client, and a legacy class are not necessarily the decision. Write the call chain and the rule in ANSWER.md.`);
  rubric(id, `# SPEC-003

Real chain: AccountsController.Delete -> AccountDeletionService.DeleteAsync -> AccountDeletionAuthorizationHandler. The handler denies non-owners who are not SupportAdmin, and denies an open billing dispute. InactiveAccountCleanupJob deletes without that decision.`);
  const api = guid();
  add(`tasks/${id}/workspace/Helpdesk.sln`, sln("Helpdesk", [
    { name: "Acme.Helpdesk", path: "src/Acme.Helpdesk/Acme.Helpdesk.csproj", guid: api },
    { name: "Acme.Helpdesk.Tests", path: "tests/Acme.Helpdesk.Tests/Acme.Helpdesk.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Acme.Helpdesk/Acme.Helpdesk.csproj`, webproj());
  helpdeskFiles(id);
  add(`tasks/${id}/workspace/tests/Acme.Helpdesk.Tests/Acme.Helpdesk.Tests.csproj`, testproj(["../../src/Acme.Helpdesk/Acme.Helpdesk.csproj"]));
  add(`tasks/${id}/workspace/tests/Acme.Helpdesk.Tests/LegacyAccountDeletionTests.cs`, `namespace Acme.Helpdesk.Tests;

public class LegacyAccountDeletionTests
{
    [Fact]
    public void Legacy_helper_checks_authentication_only()
    {
        Assert.False(Acme.Helpdesk.Legacy.LegacyAccountEndpoints.CanDelete(false));
        Assert.True(Acme.Helpdesk.Legacy.LegacyAccountEndpoints.CanDelete(true));
    }
}
`);
  add(`tasks/${id}/workspace/tests/Acme.Helpdesk.Tests/HandlerTests.cs`, `using System.Security.Claims;
using Acme.Helpdesk.Authorization;
using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Tests;

public class HandlerTests
{
    [Fact]
    public async Task Open_dispute_blocks_deletion()
    {
        var handler = new AccountDeletionAuthorizationHandler(new AlwaysDisputed());
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "owner") }, "test"));
        var decision = await handler.AuthorizeAsync(user, new Account { Id = Guid.NewGuid(), OwnerUserId = "owner" }, CancellationToken.None);
        Assert.False(decision.Allowed);
        Assert.Contains("dispute", decision.Reason, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class AlwaysDisputed : IDisputeQuery
    {
        public Task<bool> HasOpenDisputeAsync(Guid accountId, CancellationToken ct) => Task.FromResult(true);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, `# Account deletion authorization

The user-facing call chain is:

1. AccountsController.Delete checks only that the caller is authenticated. The comment there is not the decision.
2. AccountDeletionService.DeleteAsync loads the account and calls IAccountDeletionAuthorizer.
3. AccountDeletionAuthorizationHandler makes the decision: the caller must be the owner or a SupportAdmin, and the account must not have an open billing dispute.

InactiveAccountCleanupJob deletes inactive accounts as a system job. It is not the authorization decision for a user deleting an account. LegacyAccountEndpoints and the generated AccountClient are not on this call chain.
`);
  manifest({
    id,
    title: "Find the account-deletion authorization chain",
    tier: 3,
    category: "exploration",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "Explain the real authorization call chain. Do not modify the repository.",
    symptom: "Several types look like they authorize deletion.",
    rootCause: "The decision is AccountDeletionAuthorizationHandler, reached through AccountDeletionService from AccountsController.",
    correctFix: "Explain the chain and distinguish the cleanup job and legacy types. Do not edit code.",
    checks: {
      initial: { dotnetTest: [{ project: "Helpdesk.sln", expect: "pass" }] },
      final: {
        unchangedExcept: ["ANSWER.md"],
        answerGroups: [
          { id: "controller", patterns: ["AccountsController"] },
          { id: "service", patterns: ["AccountDeletionService"] },
          { id: "handler", patterns: ["AccountDeletionAuthorizationHandler"] },
          { id: "dispute", patterns: ["billing dispute", "BillingDispute", "open dispute"] },
          { id: "cleanup", patterns: ["InactiveAccountCleanupJob[\\s\\S]{0,120}(not the|system|background)"] },
        ],
      },
    },
    scoring: {},
  });
}

function helpdeskFiles(id) {
  const root = `tasks/${id}/workspace/src/Acme.Helpdesk`;
  add(`${root}/Program.cs`, `using Acme.Helpdesk.Authorization;
using Acme.Helpdesk.Infrastructure;
using Acme.Helpdesk.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IAccountRepository, InMemoryAccountRepository>();
builder.Services.AddSingleton<IDisputeQuery, InMemoryDisputeQuery>();
builder.Services.AddSingleton<IAccountDeletionAuthorizer, AccountDeletionAuthorizationHandler>();
builder.Services.AddSingleton<AccountDeletionService>();
builder.Services.AddSingleton<AccountAccessPolicy>();
var app = builder.Build();
app.MapControllers();
app.Run();
`);
  add(`${root}/Domain/Account.cs`, `namespace Acme.Helpdesk.Domain;

public sealed class Account
{
    public Guid Id { get; init; }
    public string OwnerUserId { get; init; } = "";
    public string Name { get; init; } = "";
    public AccountStatus Status { get; init; } = AccountStatus.Active;
}

public enum AccountStatus { Active, Suspended, Closed }
`);
  add(`${root}/Domain/BillingDispute.cs`, `namespace Acme.Helpdesk.Domain;

public sealed class BillingDispute
{
    public Guid Id { get; init; }
    public Guid AccountId { get; init; }
    public bool IsOpen { get; init; }
}
`);
  add(`${root}/Domain/Ticket.cs`, `namespace Acme.Helpdesk.Domain;

public sealed class Ticket
{
    public Guid Id { get; init; }
    public Guid AccountId { get; init; }
    public string Subject { get; init; } = "";
}
`);
  add(`${root}/Domain/Agent.cs`, `namespace Acme.Helpdesk.Domain;

public sealed class Agent
{
    public string Id { get; init; } = "";
    public string Role { get; init; } = "Agent";
}
`);
  add(`${root}/Domain/AllowAllAccountGuard.cs`, `namespace Acme.Helpdesk.Domain;

public sealed class AllowAllAccountGuard
{
    public bool CanDelete(Guid accountId) => true;
}
`);
  add(`${root}/Authorization/IAccountDeletionAuthorizer.cs`, `using System.Security.Claims;
using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Authorization;

public interface IAccountDeletionAuthorizer
{
    Task<AuthorizationDecision> AuthorizeAsync(ClaimsPrincipal user, Account account, CancellationToken ct);
}

public sealed record AuthorizationDecision(bool Allowed, string Reason)
{
    public static AuthorizationDecision Allow() => new(true, "");
    public static AuthorizationDecision Deny(string reason) => new(false, reason);
}
`);
  add(`${root}/Authorization/AccountDeletionAuthorizationHandler.cs`, `using System.Security.Claims;
using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Authorization;

public sealed class AccountDeletionAuthorizationHandler : IAccountDeletionAuthorizer
{
    private readonly IDisputeQuery _disputes;
    public AccountDeletionAuthorizationHandler(IDisputeQuery disputes) => _disputes = disputes;

    public async Task<AuthorizationDecision> AuthorizeAsync(ClaimsPrincipal user, Account account, CancellationToken ct)
    {
        var isOwner = user.FindFirstValue(ClaimTypes.NameIdentifier) == account.OwnerUserId;
        var isSupportAdmin = user.IsInRole("SupportAdmin");
        if (!isOwner && !isSupportAdmin)
            return AuthorizationDecision.Deny("Only the owner or a SupportAdmin can delete an account.");
        if (await _disputes.HasOpenDisputeAsync(account.Id, ct))
            return AuthorizationDecision.Deny("Accounts with an open billing dispute cannot be deleted.");
        return AuthorizationDecision.Allow();
    }
}

public interface IDisputeQuery
{
    Task<bool> HasOpenDisputeAsync(Guid accountId, CancellationToken ct);
}
`);
  add(`${root}/Authorization/AccountAccessPolicy.cs`, `namespace Acme.Helpdesk.Authorization;

public sealed class AccountAccessPolicy
{
    public bool CanRead(string role) => role is "Agent" or "SupportAdmin" or "Owner";
}
`);
  add(`${root}/Services/AccountDeletionService.cs`, `using System.Security.Claims;
using Acme.Helpdesk.Authorization;
using Acme.Helpdesk.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Helpdesk.Services;

public sealed class AccountDeletionService
{
    private readonly IAccountRepository _repository;
    private readonly IAccountDeletionAuthorizer _authorizer;
    public AccountDeletionService(IAccountRepository repository, IAccountDeletionAuthorizer authorizer)
    {
        _repository = repository;
        _authorizer = authorizer;
    }

    public async Task<IActionResult> DeleteAsync(Guid id, ClaimsPrincipal user, CancellationToken ct)
    {
        var account = await _repository.FindAsync(id, ct);
        if (account is null) return new NotFoundResult();
        var decision = await _authorizer.AuthorizeAsync(user, account, ct);
        if (!decision.Allowed) return new ObjectResult(decision.Reason) { StatusCode = StatusCodes.Status403Forbidden };
        await _repository.DeleteAsync(id, ct);
        return new NoContentResult();
    }
}

public interface IAccountRepository
{
    Task<Account?> FindAsync(Guid id, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}
`);
  add(`${root}/Services/InactiveAccountCleanupJob.cs`, `using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Services;

public sealed class InactiveAccountCleanupJob
{
    private readonly IAccountRepository _repository;
    public InactiveAccountCleanupJob(IAccountRepository repository) => _repository = repository;

    public async Task DeleteInactiveAsync(Guid id, CancellationToken ct)
    {
        var account = await _repository.FindAsync(id, ct);
        if (account?.Status == AccountStatus.Suspended)
            await _repository.DeleteAsync(id, ct);
    }
}
`);
  add(`${root}/Controllers/AccountsController.cs`, `using Acme.Helpdesk.Services;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Helpdesk.Controllers;

[ApiController]
[Route("api/accounts")]
public sealed class AccountsController : ControllerBase
{
    private readonly AccountDeletionService _deletion;
    public AccountsController(AccountDeletionService deletion) => _deletion = deletion;

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        // authorization decision
        if (User.Identity?.IsAuthenticated != true) return Unauthorized();
        return await _deletion.DeleteAsync(id, User, ct);
    }
}
`);
  add(`${root}/Legacy/LegacyAccountEndpoints.cs`, `namespace Acme.Helpdesk.Legacy;

public static class LegacyAccountEndpoints
{
    public static bool CanDelete(bool isAuthenticated) => isAuthenticated;
}
`);
  add(`${root}/Generated/AccountClient.cs`, `namespace Acme.Helpdesk.Generated;

public sealed class AccountClient
{
    public Task DeleteAsync(Guid id, CancellationToken ct)
    {
        // authorizes the caller before calling the server
        return Task.CompletedTask;
    }
}
`);
  add(`${root}/Infrastructure/InMemoryAccountRepository.cs`, `using Acme.Helpdesk.Domain;
using Acme.Helpdesk.Services;

namespace Acme.Helpdesk.Infrastructure;

public sealed class InMemoryAccountRepository : IAccountRepository
{
    private readonly Dictionary<Guid, Account> _accounts = new();
    public Task<Account?> FindAsync(Guid id, CancellationToken ct) => Task.FromResult(_accounts.GetValueOrDefault(id));
    public Task DeleteAsync(Guid id, CancellationToken ct)
    {
        _accounts.Remove(id);
        return Task.CompletedTask;
    }
}
`);
  add(`${root}/Infrastructure/InMemoryDisputeQuery.cs`, `using Acme.Helpdesk.Authorization;

namespace Acme.Helpdesk.Infrastructure;

public sealed class InMemoryDisputeQuery : IDisputeQuery
{
    public Task<bool> HasOpenDisputeAsync(Guid accountId, CancellationToken ct) => Task.FromResult(false);
}
`);
  const fillers = ["Invoice", "Comment", "Attachment", "SlaPolicy", "Tag", "Macro", "Queue", "Shift", "Holiday", "Webhook"];
  for (const name of fillers) {
    add(`${root}/Domain/${name}.cs`, `namespace Acme.Helpdesk.Domain;

public sealed class ${name}
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "${name}";
}
`);
  }
}

function spec004() {
  const id = "SPEC-004";
  prompt(id, "Implement the empty-cart requirement", `README.md is the current requirement: an empty shopping cart returns 200 and an empty array.

An existing test still expects 400. That test is outdated. Implement the README requirement and update the conflicting test. Do not try to satisfy both contradictory expectations.

Run \`dotnet test\`.`);
  rubric(id, "# SPEC-004\n\nREADME is authoritative. The visible test and the controller still return 400. Gold returns 200 and updates the test. Hidden test checks the body.\n");
  const api = guid();
  add(`tasks/${id}/workspace/Cart.sln`, sln("Cart", [
    { name: "Cart.Api", path: "src/Cart.Api/Cart.Api.csproj", guid: api },
    { name: "Cart.Tests", path: "tests/Cart.Tests/Cart.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/README.md`, `# Cart API

An empty shopping cart should return 200 and an empty JSON array.

GET /api/carts/{id}
`);
  add(`tasks/${id}/workspace/src/Cart.Api/Cart.Api.csproj`, webproj());
  add(`tasks/${id}/workspace/src/Cart.Api/Program.cs`, `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
public partial class Program;
`);
  add(`tasks/${id}/workspace/src/Cart.Api/CartsController.cs`, cartController(false));
  add(`tasks/${id}/gold/src/Cart.Api/CartsController.cs`, cartController(true));
  add(`tasks/${id}/workspace/tests/Cart.Tests/Cart.Tests.csproj`, testproj(["../../src/Cart.Api/Cart.Api.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.11" />
    <PackageReference Include="System.Net.Http.Json" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Cart.Tests/CartTests.cs`, cartTest(false));
  add(`tasks/${id}/gold/tests/Cart.Tests/CartTests.cs`, cartTest(true));
  add(`tasks/${id}/hidden/EmptyCartHiddenTests.cs`, `using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Cart.Tests;

public class EmptyCartHiddenTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public EmptyCartHiddenTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Empty_cart_body_is_an_array()
    {
        var response = await _factory.CreateClient().GetAsync("/api/carts/empty");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("[]", (await response.Content.ReadAsStringAsync()).Trim());
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "README requires 200 for an empty cart. The existing test expected 400 and the controller followed that outdated test. Both now follow the README.\n");
  manifest({
    id,
    title: "Conflicting test versus README",
    tier: 3,
    category: "implementation",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "The README says empty carts return 200. A test and the controller still say 400.",
    symptom: "The visible test and the requirement disagree.",
    rootCause: "The test was not updated when the requirement changed.",
    correctFix: "Return 200 with an empty array and update the outdated test.",
    hiddenCopy: [{ from: "EmptyCartHiddenTests.cs", to: "tests/Cart.Tests/EmptyCartHiddenTests.cs" }],
    checks: {
      initial: {
        dotnetTest: [
          { project: "Cart.sln", expect: "pass" },
          { project: "Cart.sln", expect: "fail", includeHidden: true },
        ],
      },
      final: {
        dotnetTest: [
          { project: "Cart.sln", expect: "pass" },
          { project: "Cart.sln", expect: "pass", includeHidden: true },
        ],
      },
    },
    scoring: { precisionMode: "max-files", maxChangedFiles: 3 },
  });
}

function cartController(fixed) {
  return `using Microsoft.AspNetCore.Mvc;

namespace Cart.Api;

[ApiController]
[Route("api/carts")]
public sealed class CartsController : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(string id)
    {
        if (id == "empty")
        {
            ${fixed ? "return Ok(Array.Empty<object>());" : "return BadRequest(new { error = \"cart is empty\" });"}
        }
        return Ok(new[] { new { sku = "pen", quantity = 1 } });
    }
}
`;
}

function cartTest(fixed) {
  return `using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Cart.Tests;

public class CartTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public CartTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Empty_cart_status()
    {
        var response = await _factory.CreateClient().GetAsync("/api/carts/empty");
        Assert.Equal(${fixed ? "HttpStatusCode.OK" : "HttpStatusCode.BadRequest"}, response.StatusCode);
    }

    [Fact]
    public async Task Stocked_cart_is_ok()
    {
        var response = await _factory.CreateClient().GetAsync("/api/carts/stocked");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
`;
}

function spec005() {
  const id = "SPEC-005";
  prompt(id, "Add a password reset feature", `Add a password reset feature to this API.

The request is intentionally incomplete. Do not start coding until the behavioral and security questions are settled. Write the questions in ANSWER.md. Do not change application code in this pass.`);
  rubric(id, `# SPEC-005

A strong result asks about token lifetime, existing sessions, unknown emails, rate limiting, password rules, and the email that is sent. Implementing immediately scores poorly because the code must stay unchanged.`);
  const api = guid();
  add(`tasks/${id}/workspace/Auth.sln`, sln("Auth", [
    { name: "Auth.Api", path: "src/Auth.Api/Auth.Api.csproj", guid: api },
    { name: "Auth.Tests", path: "tests/Auth.Tests/Auth.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Auth.Api/Auth.Api.csproj`, webproj());
  add(`tasks/${id}/workspace/src/Auth.Api/Program.cs`, `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<Auth.Api.UserDirectory>();
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
public partial class Program;
`);
  add(`tasks/${id}/workspace/src/Auth.Api/LoginController.cs`, `using Microsoft.AspNetCore.Mvc;

namespace Auth.Api;

public sealed class UserDirectory
{
    public bool Exists(string email) => email == "ada@example.com";
}

[ApiController]
[Route("api/session")]
public sealed class LoginController : ControllerBase
{
    private readonly UserDirectory _users;
    public LoginController(UserDirectory users) => _users = users;

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (!_users.Exists(request.Email) || request.Password != "correct-password") return Unauthorized();
        return Ok(new { token = "session-token" });
    }
}

public sealed record LoginRequest(string Email, string Password);
`);
  add(`tasks/${id}/workspace/tests/Auth.Tests/Auth.Tests.csproj`, testproj(["../../src/Auth.Api/Auth.Api.csproj"], `  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.11" />
    <PackageReference Include="System.Net.Http.Json" Version="8.0.0" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/tests/Auth.Tests/LoginTests.cs`, `using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Auth.Tests;

public class LoginTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public LoginTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Known_user_can_log_in()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/session/login", new { email = "ada@example.com", password = "correct-password" });
        response.EnsureSuccessStatusCode();
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, `# Questions before implementing password reset

- What is the reset token lifetime, and is it single-use?
- Do existing sessions remain valid after a reset, or are they invalidated?
- What email is sent, and what should the message contain?
- Is there a rate limit on reset requests?
- What password requirements apply to the new password?
- What happens if the email does not exist? The response must not enable account enumeration.
`);
  manifest({
    id,
    title: "Ambiguous password-reset request",
    tier: 5,
    category: "ambiguous",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "The request is only 'add password reset'. A strong agent asks before coding.",
    symptom: "Token lifetime, sessions, enumeration, rate limits, and password rules are unspecified.",
    rootCause: "The requirement is ambiguous, especially around security behavior.",
    correctFix: "Write clarifying questions and do not change code.",
    checks: {
      initial: { dotnetTest: [{ project: "Auth.sln", expect: "pass" }] },
      final: {
        unchangedExcept: ["ANSWER.md"],
        answerGroups: [
          { id: "lifetime", patterns: ["lifetime", "expir", "ttl"] },
          { id: "session", patterns: ["session"] },
          { id: "email", patterns: ["email"] },
          { id: "rate", patterns: ["rate limit", "throttl"] },
          { id: "password", patterns: ["password requirement", "password rule", "complexity"] },
          { id: "missing", patterns: ["does not exist", "enumeration", "unknown email"] },
        ],
      },
    },
    scoring: {},
  });
}
