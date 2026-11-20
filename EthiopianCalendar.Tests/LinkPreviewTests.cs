using System.Net;
using EthiopianCalendar.Api;
using EthiopianCalendar.Core;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.FileProviders;

namespace EthiopianCalendar.Tests;

public class LinkPreviewTests
{
    private const string Html = """
        <head>
            <meta name="description" content="Default description" />
            <meta property="og:title" content="Default title" />
            <meta property="og:description" content="Default description" />
            <title>Default title</title>
          </head>
        """;

    private static EthiopianDate Eth(int gy, int gm, int gd) => EthiopianDate.FromGregorian(new DateOnly(gy, gm, gd));

    [Fact]
    public void For_UpcomingFast_SaysWhenItBeginsAndHowLong()
    {
        var preview = LinkPreview.For("tsome-nebiyat", Eth(2026, 11, 20), "https://example.com");

        Assert.NotNull(preview);
        Assert.Equal("Tsome Nebiyat (Fast of the Prophets) · Ethiopian Orthodox Calendar", preview.Title);
        Assert.StartsWith("Begins Tuesday, November 24, 2026 · 44 days.", preview.Description);
        Assert.Equal("https://example.com/tsome-nebiyat", preview.Url);
    }

    [Fact]
    public void For_FastInProgress_SaysWhichDay()
    {
        var preview = LinkPreview.For("tsome-nebiyat", Eth(2026, 12, 1), "https://example.com");

        Assert.NotNull(preview);
        Assert.StartsWith("Happening now: day 8 of 44, until Wednesday, January 6, 2027.", preview.Description);
    }

    [Fact]
    public void For_UnknownId_ReturnsNull()
    {
        Assert.Null(LinkPreview.For("not-a-feast", Eth(2026, 11, 20), "https://example.com"));
    }

    [Fact]
    public void Apply_ReplacesTitleDescriptionAndOpenGraphTags_AndAddsUrl()
    {
        var html = LinkPreview.Apply(Html, new LinkPreview.Preview("Genna", "Christmas", "https://example.com/genna"));

        Assert.Contains("<title>Genna</title>", html);
        Assert.Contains("<meta name=\"description\" content=\"Christmas\"", html);
        Assert.Contains("<meta property=\"og:title\" content=\"Genna\"", html);
        Assert.Contains("<meta property=\"og:description\" content=\"Christmas\"", html);
        Assert.Contains("<meta property=\"og:url\" content=\"https://example.com/genna\"", html);
        Assert.DoesNotContain("Default", html);
    }

    [Fact]
    public void Apply_HtmlEncodesValues_SoTextCannotBreakOutOfTheTag()
    {
        var html = LinkPreview.Apply(Html, new LinkPreview.Preview("\"><script>alert(1)</script>", "a & b $1", "https://example.com/x"));

        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&quot;&gt;&lt;script&gt;", html);
        Assert.Contains("a &amp; b $1", html); // "$1" stays literal text
    }
}

/// <summary>Runs the real app against a small index.html in a temporary web root.</summary>
public class LinkPreviewEndpointTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly string _webRoot = Directory.CreateTempSubdirectory("ec-wwwroot").FullName;
    private readonly HttpClient _client;

    public LinkPreviewEndpointTests(WebApplicationFactory<Program> factory)
    {
        File.WriteAllText(Path.Combine(_webRoot, "index.html"), """
            <html><head>
            <meta name="description" content="Default" />
            <meta property="og:title" content="Default" />
            <meta property="og:description" content="Default" />
            <title>Ethiopian Orthodox Calendar</title>
            </head><body><div id="root"></div></body></html>
            """);

        _client = factory
            .WithWebHostBuilder(b => b.ConfigureServices((context, _) =>
                // Point the app at the temporary web root. Setting the file provider directly
                // works with minimal hosting, where the web root is fixed before tests can change settings.
                context.HostingEnvironment.WebRootFileProvider = new PhysicalFileProvider(_webRoot)))
            .CreateClient();
    }

    [Fact]
    public async Task ObservancePage_HasItsOwnTitleInTheHtml()
    {
        var html = await _client.GetStringAsync("/tsome-nebiyat");

        Assert.Contains("<title>Tsome Nebiyat (Fast of the Prophets) · Ethiopian Orthodox Calendar</title>", html);
        Assert.Contains("og:url", html);
    }

    [Fact]
    public async Task UnknownPage_StillGetsTheAppWithDefaultTags()
    {
        var response = await _client.GetAsync("/not-a-feast");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("<title>Ethiopian Orthodox Calendar</title>", html);
    }

    [Fact]
    public async Task CalendarFeedAndApi_AreNotCaughtByThePageRoute()
    {
        Assert.Equal("text/calendar", (await _client.GetAsync("/calendar.ics")).Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/nope")).StatusCode);
    }

    public void Dispose() => Directory.Delete(_webRoot, recursive: true);
}
