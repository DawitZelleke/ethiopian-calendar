using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EthiopianCalendar.Api;
using Microsoft.AspNetCore.Mvc.Testing;

namespace EthiopianCalendar.Tests;

/// <summary>
/// Integration tests: start the real API in memory and call it over HTTP,
/// exactly the way a browser or calendar app would.
/// </summary>
public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Day_Fasika2026_IsAFeastAndNotAFastDay()
    {
        var day = await _client.GetFromJsonAsync<DayDto>("/api/days/2026-04-12", Json);

        Assert.NotNull(day);
        Assert.Equal("Miyazya 4, 2018", day.Date.Display);
        Assert.False(day.IsFastDay);
        Assert.Contains(day.Observances, o => o.Name.StartsWith("Fasika"));
    }

    [Fact]
    public async Task Day_InAbiyTsom_ReportsTheFastByName()
    {
        var day = await _client.GetFromJsonAsync<DayDto>("/api/days/2026-03-07", Json);

        Assert.NotNull(day);
        Assert.True(day.IsFastDay);
        Assert.Contains(day.Fasts, f => f.Id == "abiy-tsom" && f.TotalDays == 55);
    }

    [Fact]
    public async Task Day_FirstDayOfNebiyat_ShowsProgress()
    {
        var day = await _client.GetFromJsonAsync<DayDto>("/api/days/2026-11-24", Json);

        Assert.NotNull(day);
        var nebiyat = Assert.Single(day.Fasts);
        Assert.Equal("tsome-nebiyat", nebiyat.Id);
        Assert.Equal(1, nebiyat.DayNumber);
        Assert.Equal(44, nebiyat.TotalDays);
    }

    [Fact]
    public async Task Year_2018_ListsObservancesInDateOrder()
    {
        var year = await _client.GetFromJsonAsync<YearDto>("/api/years/2018", Json);

        Assert.NotNull(year);
        var dates = year.Observances.Select(o => o.Date.Gregorian).ToList();
        Assert.Equal(dates.Order(), dates);
        Assert.Contains(year.Observances, o => o.Name.StartsWith("Genna"));
        Assert.Contains(year.FastPeriods, p => p.Name.StartsWith("Abiy Tsom") && p.LengthInDays == 55);
    }

    [Fact]
    public async Task BahireHasab_2018_ShowsTheWorking()
    {
        var result = await _client.GetFromJsonAsync<BahireHasabDto>("/api/years/2018/bahire-hasab", Json);

        Assert.NotNull(result);
        Assert.Equal(18, result.Metqi);
        Assert.Equal(new DateOnly(2026, 2, 2), result.Nineveh.Gregorian);
        Assert.Equal(new DateOnly(2026, 4, 12), result.Fasika.Gregorian);
    }

    [Fact]
    public async Task ConvertToGregorian_LeapDay_Works()
    {
        var date = await _client.GetFromJsonAsync<EthiopianDateDto>("/api/convert/to-gregorian/2019/13/6", Json);

        Assert.NotNull(date);
        Assert.Equal(new DateOnly(2027, 9, 11), date.Gregorian);
    }

    [Fact]
    public async Task ConvertToEthiopian_Works()
    {
        var date = await _client.GetFromJsonAsync<EthiopianDateDto>("/api/convert/to-ethiopian/2026-09-11", Json);

        Assert.NotNull(date);
        Assert.Equal("Meskerem 1, 2019", date.Display);
    }

    [Theory]
    [InlineData("/api/convert/to-gregorian/2018/13/6")]   // Pagume 6 in a non-leap year
    [InlineData("/api/convert/to-gregorian/2019/14/1")]   // month 14
    [InlineData("/api/days/not-a-date")]                  // not a date at all
    [InlineData("/api/years/0")]                          // year 0
    public async Task InvalidInput_Returns400(string url)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task NextOccurrence_BeforeNebiyat_ReturnsUpcomingFast()
    {
        var o = await _client.GetFromJsonAsync<OccurrenceDto>("/api/observances/tsome-nebiyat/next?from=2026-11-18", Json);

        Assert.NotNull(o);
        Assert.Equal(new DateOnly(2026, 11, 24), o.Start.Gregorian);
        Assert.Equal(new DateOnly(2027, 1, 6), o.End.Gregorian);
        Assert.Equal(44, o.LengthInDays);
        Assert.False(o.InProgress);
        Assert.Null(o.DayNumber);
    }

    [Fact]
    public async Task NextOccurrence_DuringNebiyat_ReturnsCurrentFastWithDayNumber()
    {
        var o = await _client.GetFromJsonAsync<OccurrenceDto>("/api/observances/tsome-nebiyat/next?from=2026-12-01", Json);

        Assert.NotNull(o);
        Assert.True(o.InProgress);
        Assert.Equal(8, o.DayNumber);
    }

    [Fact]
    public async Task NextOccurrence_AfterGenna_RollsToNextYear()
    {
        var o = await _client.GetFromJsonAsync<OccurrenceDto>("/api/observances/genna/next?from=2027-01-08", Json);

        Assert.NotNull(o);
        Assert.Equal(new DateOnly(2028, 1, 7), o.Start.Gregorian);
        Assert.Equal(1, o.LengthInDays);
    }

    [Fact]
    public async Task NextOccurrence_AbiyTsom_ReturnsTheFullFastNotTheOneDayMarker()
    {
        var o = await _client.GetFromJsonAsync<OccurrenceDto>("/api/observances/abiy-tsom/next?from=2026-11-18", Json);

        Assert.NotNull(o);
        Assert.Equal(new DateOnly(2027, 3, 8), o.Start.Gregorian);
        Assert.Equal(55, o.LengthInDays);
    }

    [Fact]
    public async Task NextOccurrence_UnknownId_Returns404()
    {
        var response = await _client.GetAsync("/api/observances/not-a-feast/next");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CalendarFeed_IsValidICalendarWithNebiyat()
    {
        var response = await _client.GetAsync("/calendar.ics");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/calendar", response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("BEGIN:VCALENDAR", body);
        Assert.Contains("SUMMARY:Tsome Nebiyat (Fast of the Prophets)", body);
    }

    [Fact]
    public async Task CalendarFeed_AnswersHeadRequests()
    {
        var response = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Head, "/calendar.ics"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/calendar", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task CalendarFeed_WeeklyOption_AddsWednesdayAndFridayFasts()
    {
        int Count(string ics) => ics.Split("BEGIN:VEVENT").Length - 1;

        string plain = await _client.GetStringAsync("/calendar.ics");
        string weekly = await _client.GetStringAsync("/calendar.ics?weekly=true");

        Assert.True(Count(weekly) > Count(plain) + 100);
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"status\":\"ok\"", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task UnknownApiRoute_Returns404()
    {
        var response = await _client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task InvalidDate_ReturnsReadableProblemDetails()
    {
        var response = await _client.GetAsync("/api/convert/to-gregorian/2018/13/6");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Pagume 2018 has 5 days", body);
    }
}
