using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace EthiopianCalendar.Tests;

public class CanonicalHostTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private HttpClient ClientFor(string host, string? canonicalHost = "13thmonth.ca") =>
        factory
            .WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?> { ["CanonicalHost"] = canonicalHost })))
            .CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
                BaseAddress = new Uri($"https://{host}"),
            });

    [Theory]
    [InlineData("thirteenthmonth.ca")]
    [InlineData("www.13thmonth.ca")]
    [InlineData("ethiopian-calendar.onrender.com")]
    public async Task OtherHosts_RedirectPermanently_KeepingPathAndQuery(string host)
    {
        var response = await ClientFor(host).GetAsync("/tsome-nebiyat?from=video");

        Assert.Equal(HttpStatusCode.MovedPermanently, response.StatusCode);
        Assert.Equal("https://13thmonth.ca/tsome-nebiyat?from=video", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task CanonicalHost_IsServedNormally()
    {
        var response = await ClientFor("13thmonth.ca").GetAsync("/api/days/2026-11-24");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task HealthCheck_IsNeverRedirected()
    {
        // The hosting platform checks health on its own address; a redirect would look like an outage.
        var response = await ClientFor("ethiopian-calendar.onrender.com").GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task WithoutTheSetting_NothingIsRedirected()
    {
        var response = await ClientFor("thirteenthmonth.ca", canonicalHost: null).GetAsync("/api/days/2026-11-24");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Localhost_IsNeverRedirected()
    {
        var response = await ClientFor("localhost").GetAsync("/api/days/2026-11-24");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
