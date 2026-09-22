using System.Net;
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
