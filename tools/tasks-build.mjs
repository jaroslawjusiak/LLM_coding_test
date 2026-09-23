import { add, csproj, guid, manifest, prompt, reactConfig, reactPackage, rubric, sln, testproj, webproj } from "./lib.mjs";

export function buildTasks() {
  bld001();
  bld002();
  bld003();
  bld004();
  bld005();
}

function bld001() {
  const id = "BLD-001";
  prompt(id, "Fix the build", "Build the project and fix the issue preventing it from building. There is one root cause. Do not change behavior. Run `dotnet test`.");
  rubric(id, "# BLD-001\n\nB1. CustomerRepository names the type `Custmer`. The single CS0246 is the whole failure.\n");
  const lib = guid();
  add(`tasks/${id}/workspace/OneError.sln`, sln("OneError", [
    { name: "OneError", path: "src/OneError/OneError.csproj", guid: lib },
    { name: "OneError.Tests", path: "tests/OneError.Tests/OneError.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/OneError/OneError.csproj`, csproj());
  add(`tasks/${id}/workspace/tests/OneError.Tests/OneError.Tests.csproj`, testproj(["../../src/OneError/OneError.csproj"]));
  add(`tasks/${id}/workspace/src/OneError/Customer.cs`, `namespace OneError;

public sealed class Customer
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
}
`);
  add(`tasks/${id}/workspace/src/OneError/CustomerRepository.cs`, repo(false));
  add(`tasks/${id}/gold/src/OneError/CustomerRepository.cs`, repo(true));
  add(`tasks/${id}/workspace/tests/OneError.Tests/CustomerTests.cs`, `namespace OneError.Tests;

public class CustomerTests
{
    [Fact]
    public void Finds_the_seeded_customer()
    {
        var customer = new OneError.CustomerRepository().Find(7);
        Assert.NotNull(customer);
        Assert.Equal("Ada", customer.Name);
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "CustomerRepository returned Custmer, a type that does not exist. Renamed it to Customer. No other behavior changed.\n");
  manifest({
    id,
    title: "One build error",
    tier: 2,
    category: "build",
    difficulty: "easy",
    languages: ["csharp"],
    summary: "A single mistyped type name prevents the build.",
    symptom: "CS0246 for Custmer.",
    rootCause: "The repository names a type that was never declared.",
    correctFix: "Use Customer.",
    checks: {
      initial: { dotnetBuild: [{ project: "OneError.sln", expect: "fail", minErrors: 1, errorPattern: "CS" }] },
      final: {
        dotnetBuild: [{ project: "OneError.sln", expect: "pass" }],
        dotnetTest: [{ project: "OneError.sln", expect: "pass" }],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0 },
  });
}

function repo(fixed) {
  return `namespace OneError;

public sealed class CustomerRepository
{
    public ${fixed ? "Customer" : "Custmer"}? Find(int id)
    {
        if (id != 7) return null;
        return new Customer { Id = 7, Name = "Ada" };
    }
}
`;
}

function bld002() {
  const id = "BLD-002";
  prompt(
    id,
    "Fix three independent build errors",
    `Build the solution and fix every issue preventing it from building. There are three independent root causes:

- a project reference is missing
- a type is in the wrong namespace
- a generated partial file is missing

Fix each root cause. Do not paper over a missing type by deleting the caller. Run \`dotnet test\`.`,
  );
  rubric(id, "# BLD-002\n\nB2. Api is missing a ProjectReference to Application. EmailSender is in Acme.Mail instead of Acme.Infrastructure.Email. UserMapper.Address.cs was not generated.\n");
  const domain = guid();
  const app = guid();
  const api = guid();
  const tests = guid();
  add(`tasks/${id}/workspace/ThreeErrors.sln`, sln("ThreeErrors", [
    { name: "Acme.Domain", path: "src/Acme.Domain/Acme.Domain.csproj", guid: domain },
    { name: "Acme.Application", path: "src/Acme.Application/Acme.Application.csproj", guid: app },
    { name: "Acme.Api", path: "src/Acme.Api/Acme.Api.csproj", guid: api },
    { name: "Acme.Tests", path: "tests/Acme.Tests/Acme.Tests.csproj", guid: tests },
  ]));
  add(`tasks/${id}/workspace/src/Acme.Domain/Acme.Domain.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Acme.Domain/User.cs`, `namespace Acme.Domain;

public sealed class User
{
    public string Name { get; init; } = "";
    public string City { get; init; } = "";
}
`);
  add(`tasks/${id}/workspace/src/Acme.Application/Acme.Application.csproj`, csproj(`  <ItemGroup>
    <ProjectReference Include="../Acme.Domain/Acme.Domain.csproj" />
  </ItemGroup>
`));
  add(`tasks/${id}/workspace/src/Acme.Application/EmailSender.cs`, `namespace Acme.Mail;

public sealed class EmailSender
{
    public string Send(string to, string body) => $"sent:{to}:{body}";
}
`);
  add(`tasks/${id}/workspace/src/Acme.Application/OrderAppService.cs`, `using Acme.Infrastructure.Email;

namespace Acme.Application;

public sealed class OrderAppService
{
    private readonly EmailSender _email = new();

    public string Notify(string to) => _email.Send(to, "order-ready");
}
`);
  add(`tasks/${id}/workspace/src/Acme.Application/UserMapper.cs`, `using Acme.Domain;

namespace Acme.Application;

public partial class UserMapper
{
    public string Map(User user) => MapAddress(user);
}
`);
  add(`tasks/${id}/workspace/src/Acme.Api/Acme.Api.csproj`, csproj());
  add(`tasks/${id}/workspace/src/Acme.Api/EntryPoint.cs`, `using Acme.Application;

namespace Acme.Api;

public static class EntryPoint
{
    public static string Run() => new OrderAppService().Notify("ada@example.com");
}
`);
  add(`tasks/${id}/workspace/tests/Acme.Tests/Acme.Tests.csproj`, testproj(["../../src/Acme.Application/Acme.Application.csproj", "../../src/Acme.Api/Acme.Api.csproj"]));
  add(`tasks/${id}/workspace/tests/Acme.Tests/BuildFixesTests.cs`, `using Acme.Application;
using Acme.Domain;

namespace Acme.Tests;

public class BuildFixesTests
{
    [Fact]
    public void Notification_and_address_mapping_work()
    {
        Assert.Equal("sent:ada@example.com:order-ready", new OrderAppService().Notify("ada@example.com"));
        Assert.Equal("Ada, Lublin", new UserMapper().Map(new User { Name = "Ada", City = "Lublin" }));
    }
}
`);
  add(`tasks/${id}/gold/src/Acme.Application/EmailSender.cs`, `namespace Acme.Infrastructure.Email;

public sealed class EmailSender
{
    public string Send(string to, string body) => $"sent:{to}:{body}";
}
`);
  add(`tasks/${id}/gold/src/Acme.Application/UserMapper.Address.cs`, `using Acme.Domain;

namespace Acme.Application;

public partial class UserMapper
{
    public string MapAddress(User user) => $"{user.Name}, {user.City}";
}
`);
  add(`tasks/${id}/gold/src/Acme.Api/Acme.Api.csproj`, csproj(`  <ItemGroup>
    <ProjectReference Include="../Acme.Application/Acme.Application.csproj" />
  </ItemGroup>
`));
  add(`tasks/${id}/gold/ANSWER.md`, "Three independent causes: Api.csproj did not reference Application, EmailSender was in namespace Acme.Mail, and the UserMapper address partial had not been generated.\n");
  manifest({
    id,
    title: "Three independent build errors",
    tier: 2,
    category: "build",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "Missing project reference, wrong namespace, and a missing generated partial.",
    symptom: "The solution build reports errors in three projects.",
    rootCause: "Api lacks a project reference; EmailSender's namespace does not match its callers; UserMapper.Address.cs is absent.",
    correctFix: "Add the project reference, move the namespace, and restore the partial.",
    checks: {
      initial: { dotnetBuild: [{ project: "ThreeErrors.sln", expect: "fail", minErrors: 3, errorPattern: "CS" }] },
      final: {
        dotnetBuild: [{ project: "ThreeErrors.sln", expect: "pass" }],
        dotnetTest: [{ project: "ThreeErrors.sln", expect: "pass" }],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0 },
  });
}

function bld003() {
  const id = "BLD-003";
  prompt(
    id,
    "Fix the dependency failures",
    `Build the project and fix every dependency issue that prevents the build.

Inspect the restore errors, change the package references, build again, and repeat until the build is clean. Do not remove a package that the code uses. Do not upgrade the target framework.

Run \`dotnet test\` when the build succeeds.`,
  );
  rubric(
    id,
    `# BLD-003

B3. Newtonsoft.Json 99.0.0 does not exist (NU1102). After that is corrected, Microsoft.AspNetCore.Mvc.NewtonsoftJson 8.0.0 cannot reconcile with a hard pin of Newtonsoft.Json 13.0.1. Gold uses Newtonsoft.Json 13.0.3, which satisfies the ASP.NET Core 8 package.`,
  );
  const lib = guid();
  add(`tasks/${id}/workspace/Deps.sln`, sln("Deps", [
    { name: "Deps", path: "src/Deps/Deps.csproj", guid: lib },
    { name: "Deps.Tests", path: "tests/Deps.Tests/Deps.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/Deps/Deps.csproj`, depProj(false));
  add(`tasks/${id}/gold/src/Deps/Deps.csproj`, depProj(true));
  add(`tasks/${id}/workspace/src/Deps/AuditJson.cs`, `using Newtonsoft.Json;

namespace Deps;

public static class AuditJson
{
    public static string Write(object value) => JsonConvert.SerializeObject(value);
}
`);
  add(`tasks/${id}/workspace/tests/Deps.Tests/Deps.Tests.csproj`, testproj(["../../src/Deps/Deps.csproj"]));
  add(`tasks/${id}/workspace/tests/Deps.Tests/AuditJsonTests.cs`, `namespace Deps.Tests;

public class AuditJsonTests
{
    [Fact]
    public void Serializes_a_payload()
    {
        Assert.Contains("Ada", Deps.AuditJson.Write(new { Name = "Ada" }));
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "Newtonsoft.Json 99.0.0 is not a real version. Pinning 13.0.1 also conflicts with Microsoft.AspNetCore.Mvc.NewtonsoftJson 8.0.0, which needs Newtonsoft.Json 13.0.3. The code was left on the same API.\n");
  manifest({
    id,
    title: "Dependency version conflict",
    tier: 2,
    category: "build",
    difficulty: "medium",
    languages: ["csharp"],
    summary: "A package version does not exist. The next restore then reports a version conflict.",
    symptom: "Restore fails, and a second conflict appears after the missing version is replaced.",
    rootCause: "Newtonsoft.Json 99.0.0 does not exist, and 13.0.1 is too low for the ASP.NET Core 8 Newtonsoft integration package.",
    correctFix: "Reference Newtonsoft.Json 13.0.3 and leave the call site on JsonConvert.",
    checks: {
      initial: { dotnetBuild: [{ project: "Deps.sln", expect: "fail", minErrors: 1, errorPattern: "NU" }] },
      final: {
        dotnetBuild: [{ project: "Deps.sln", expect: "pass" }],
        dotnetTest: [{ project: "Deps.sln", expect: "pass" }],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0, rootCausePatterns: ["99\\.0\\.0", "13\\.0\\.3"] },
  });
}

function depProj(fixed) {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="${fixed ? "13.0.3" : "99.0.0"}" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.NewtonsoftJson" Version="8.0.0" />
  </ItemGroup>
</Project>
`;
}

function bld004() {
  const id = "BLD-004";
  prompt(
    id,
    "Upgrade WidgetKit to v2",
    `WidgetKit in \`libs/WidgetKit\` is already v2. The application still calls the v1 API, and its package reference does not restore.

Read \`docs/widgetkit-v2.md\`. Upgrade the application to v2, fix the package reference, and make the build and tests pass.

Do not change files under \`libs/WidgetKit\`. Do not take the target framework backwards.`,
  );
  rubric(id, "# BLD-004\n\nCombines a missing package version with a local breaking API upgrade. The v2 contract is documented in the workspace so the model does not need the public internet to learn the new API.\n");
  const kit = guid();
  const app = guid();
  add(`tasks/${id}/workspace/Upgrade.sln`, sln("Upgrade", [
    { name: "WidgetKit", path: "libs/WidgetKit/WidgetKit.csproj", guid: kit },
    { name: "Upgrade.App", path: "src/Upgrade.App/Upgrade.App.csproj", guid: app },
    { name: "Upgrade.Tests", path: "tests/Upgrade.Tests/Upgrade.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/libs/WidgetKit/WidgetKit.csproj`, csproj());
  add(`tasks/${id}/workspace/libs/WidgetKit/WidgetFactory.cs`, `namespace WidgetKit.Core;

public sealed class WidgetOptions
{
    public string Name { get; init; } = "";
}

public sealed class Widget
{
    public string Name { get; }
    public Widget(string name) => Name = name;
    public Task<string> ExecuteAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult($"ran:{Name}");
    }
}

public static class WidgetFactory
{
    public static Widget Create(WidgetOptions options) => new(options.Name);
}

public sealed class WidgetFaultException : Exception
{
    public WidgetFaultException(string message) : base(message) { }
}
`);
  add(`tasks/${id}/workspace/docs/widgetkit-v2.md`, `# WidgetKit 2.0

Breaking changes from 1.4:

- Namespace \`WidgetKit\` moved to \`WidgetKit.Core\`.
- \`Widget.Create(string name)\` was removed. Use \`WidgetFactory.Create(new WidgetOptions { Name = name })\`.
- \`widget.Run()\` was removed. Use \`await widget.ExecuteAsync(cancellationToken)\`.
- \`WidgetException\` was renamed to \`WidgetFaultException\`.
- Newtonsoft.Json 13.0.3 remains the supported serializer. Version 99.0.0 was never published.
`);
  add(`tasks/${id}/workspace/src/Upgrade.App/Upgrade.App.csproj`, upgradeProj(false));
  add(`tasks/${id}/gold/src/Upgrade.App/Upgrade.App.csproj`, upgradeProj(true));
  add(`tasks/${id}/workspace/src/Upgrade.App/MeterJob.cs`, meter(false));
  add(`tasks/${id}/gold/src/Upgrade.App/MeterJob.cs`, meter(true));
  add(`tasks/${id}/workspace/tests/Upgrade.Tests/Upgrade.Tests.csproj`, testproj(["../../src/Upgrade.App/Upgrade.App.csproj"]));
  add(`tasks/${id}/workspace/tests/Upgrade.Tests/MeterTests.cs`, `namespace Upgrade.Tests;

public class MeterTests
{
    [Fact]
    public async Task Runs_the_named_widget()
    {
        Assert.Equal("ran:meter", await new Upgrade.MeterJob().RunAsync("meter"));
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "The app still called Widget.Create and Run from the v1 namespace, and it referenced Newtonsoft.Json 99.0.0. Call sites now use WidgetFactory and ExecuteAsync in WidgetKit.Core. The library project was not modified.\n");
  manifest({
    id,
    title: "Dependency upgrade with breaking API changes",
    tier: 4,
    category: "build",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "A package version does not exist and the local WidgetKit v2 API no longer matches the call sites.",
    symptom: "Restore fails, then the v1 WidgetKit calls fail to compile.",
    rootCause: "Newtonsoft.Json 99.0.0 plus application code that was not moved to the documented v2 API.",
    correctFix: "Reference Newtonsoft.Json 13.0.3 and adapt call sites using docs/widgetkit-v2.md. Do not edit libs/WidgetKit.",
    checks: {
      initial: { dotnetBuild: [{ project: "Upgrade.sln", expect: "fail", minErrors: 1, errorPattern: "NU" }] },
      final: {
        dotnetBuild: [{ project: "Upgrade.sln", expect: "pass" }],
        dotnetTest: [{ project: "Upgrade.sln", expect: "pass" }],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0, rootCausePatterns: ["WidgetFactory", "99\\.0\\.0"] },
  });
}

function upgradeProj(fixed) {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../../libs/WidgetKit/WidgetKit.csproj" />
    <PackageReference Include="Newtonsoft.Json" Version="${fixed ? "13.0.3" : "99.0.0"}" />
  </ItemGroup>
</Project>
`;
}

function meter(fixed) {
  if (!fixed) {
    return `using Newtonsoft.Json;
using WidgetKit;

namespace Upgrade;

public sealed class MeterJob
{
    public string Run(string name)
    {
        var widget = Widget.Create(name);
        var body = JsonConvert.SerializeObject(new { widget = name });
        try
        {
            return widget.Run() + body.Length;
        }
        catch (WidgetException ex)
        {
            return ex.Message;
        }
    }
}
`;
  }
  return `using Newtonsoft.Json;
using WidgetKit.Core;

namespace Upgrade;

public sealed class MeterJob
{
    public async Task<string> RunAsync(string name)
    {
        var widget = WidgetFactory.Create(new WidgetOptions { Name = name });
        var body = JsonConvert.SerializeObject(new { widget = name });
        try
        {
            var ran = await widget.ExecuteAsync(CancellationToken.None);
            return ran;
        }
        catch (WidgetFaultException ex)
        {
            return ex.Message;
        }
        finally
        {
            _ = body.Length;
        }
    }
}
`;
}

function bld005() {
  const id = "BLD-005";
  prompt(
    id,
    "Fix the misleading build cascade",
    `Build the solution and fix the issues preventing it from building.

The compiler reports many missing-type errors. They are cascading. Find the root cause instead of adding a using directive to every file. Run \`dotnet test\` after the build succeeds.`,
  );
  rubric(id, "# BLD-005\n\nB5. GlobalUsings.cs is excluded by Compile Remove. Adding per-file usings makes the build pass but is not the root-cause fix. Gold deletes that one item group.\n");
  const lib = guid();
  add(`tasks/${id}/workspace/CascadeBuild.sln`, sln("CascadeBuild", [
    { name: "CascadeBuild", path: "src/CascadeBuild/CascadeBuild.csproj", guid: lib },
    { name: "CascadeBuild.Tests", path: "tests/CascadeBuild.Tests/CascadeBuild.Tests.csproj", guid: guid() },
  ]));
  add(`tasks/${id}/workspace/src/CascadeBuild/CascadeBuild.csproj`, cascadeProj(false));
  add(`tasks/${id}/gold/src/CascadeBuild/CascadeBuild.csproj`, cascadeProj(true));
  add(`tasks/${id}/workspace/src/CascadeBuild/GlobalUsings.cs`, `global using System;
global using System.Collections.Generic;
global using System.IO;
global using System.Linq;
global using System.Threading.Tasks;
`);
  for (let i = 1; i <= 8; i++) {
    add(`tasks/${id}/workspace/src/CascadeBuild/Worker${i}.cs`, worker(i));
  }
  add(`tasks/${id}/workspace/tests/CascadeBuild.Tests/CascadeBuild.Tests.csproj`, testproj(["../../src/CascadeBuild/CascadeBuild.csproj"]));
  add(`tasks/${id}/workspace/tests/CascadeBuild.Tests/WorkerTests.cs`, `namespace CascadeBuild.Tests;

public class WorkerTests
{
    [Fact]
    public void Workers_sum_their_slots()
    {
        Assert.Equal(3, new CascadeBuild.Worker1().Total(new List<int> { 1, 2 }));
        Assert.Equal(8, new CascadeBuild.Worker8().Total(new List<int> { 3, 5 }));
    }
}
`);
  add(`tasks/${id}/gold/ANSWER.md`, "GlobalUsings.cs was excluded with Compile Remove, so every file lost System, collections, IO, LINQ, and tasks. Removing that exclusion fixes the cascade. Per-file usings would hide the project defect.\n");
  manifest({
    id,
    title: "Misleading cascading project errors",
    tier: 2,
    category: "build",
    difficulty: "hard",
    languages: ["csharp"],
    summary: "Dozens of missing-type errors come from one csproj exclusion.",
    symptom: "Many CS0246 errors across Worker files.",
    rootCause: "Compile Remove excludes GlobalUsings.cs.",
    correctFix: "Remove the Compile Remove item. Do not add usings to every file.",
    checks: {
      initial: { dotnetBuild: [{ project: "CascadeBuild.sln", expect: "fail", minErrors: 15 }] },
      final: {
        dotnetBuild: [{ project: "CascadeBuild.sln", expect: "pass" }],
        dotnetTest: [{ project: "CascadeBuild.sln", expect: "pass" }],
        answerFile: "ANSWER.md",
        answerGroups: [{ id: "cause", patterns: ["Compile Remove", "GlobalUsings"] }],
      },
    },
    scoring: { precisionMode: "touch-list", maxUnnecessaryFiles: 0, rootCausePatterns: ["GlobalUsings"] },
  });
}

function cascadeProj(fixed) {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>disable</ImplicitUsings>
    <Nullable>disable</Nullable>
  </PropertyGroup>
${fixed ? "" : `  <ItemGroup>
    <Compile Remove="GlobalUsings.cs" />
  </ItemGroup>
`}</Project>
`;
}

function worker(i) {
  return `namespace CascadeBuild;

public sealed class Worker${i}
{
    public int Total(List<int> values)
    {
        var rows = new List<string>();
        foreach (var value in values.Where(v => v > 0))
        {
            rows.Add(value.ToString());
        }
        return values.Sum();
    }

    public Task<string> ReadLabelAsync()
    {
        var path = Path.Combine("labels", "w${i}.txt");
        return Task.FromResult(path);
    }
}
`;
}
