using System.Text.Json.Serialization;
using EthiopianCalendar.Api;
using EthiopianCalendar.Core;
using EthiopianCalendar.Core.Ics;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

// Input the framework can't parse (e.g. "/api/days/not-a-date") is the caller's
// mistake: answer 400 Bad Request, not 500 Internal Server Error.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = ex => ex is BadHttpRequestException bad
        ? bad.StatusCode
        : StatusCodes.Status500InternalServerError,
});
app.UseStatusCodePages();

// Serve the React site (built into wwwroot by `npm run build` in /web).
app.UseDefaultFiles();
app.UseStaticFiles();

var api = app.MapGroup("/api");

// Health check for the hosting platform: confirms the app started and the engine works.
api.MapGet("/health", () => TypedResults.Ok(new
{
    status = "ok",
    today = EthiopianDateDto.From(EthiopianDate.FromGregorian(DateOnly.FromDateTime(DateTime.UtcNow))).Display,
}));

// One day: its Ethiopian date, whether it is a fast day and why, and any feasts.
api.MapGet("/days/{date}", (DateOnly date) => Handle(() =>
{
    var ethiopian = EthiopianDate.FromGregorian(date);

    return new DayDto(
        EthiopianDateDto.From(ethiopian),
        ethiopian.DayOfWeek,
        FastingCalendar.IsFastDay(ethiopian),
        FastingCalendar.FastDaysOn(ethiopian).Select(FastDayDto.From).ToList(),
        ChurchCalendar.ObservancesOn(ethiopian).Select(ObservanceDto.From).ToList());
}));

// A whole Ethiopian year: every feast and every fast period.
api.MapGet("/years/{year:int}", (int year) => Handle(() => new YearDto(
    year,
    ChurchCalendar.Observances(year).Select(ObservanceDto.From).ToList(),
    FastingCalendar.FastPeriods(year).Select(FastPeriodDto.From).ToList())));

// The Bahire Hasab working for a year, step by step.
api.MapGet("/years/{year:int}/bahire-hasab", (int year) =>
    Handle(() => BahireHasabDto.From(BahireHasab.Compute(year))));

// The current or next occurrence of one fast or feast, e.g. /api/observances/tsome-nebiyat/next?from=2026-11-18
api.MapGet("/observances/{id}/next", (string id, DateOnly? from) => HandleResult(() =>
{
    var today = EthiopianDate.FromGregorian(from ?? DateOnly.FromDateTime(DateTime.UtcNow));
    var occurrence = ChurchCalendar.NextOccurrence(id, today);

    return occurrence is null
        ? TypedResults.NotFound()
        : (IResult)TypedResults.Ok(OccurrenceDto.From(occurrence, today));
}));

// Conversions in both directions.
api.MapGet("/convert/to-ethiopian/{date}", (DateOnly date) =>
    Handle(() => EthiopianDateDto.From(EthiopianDate.FromGregorian(date))));

api.MapGet("/convert/to-gregorian/{year:int}/{month:int}/{day:int}", (int year, int month, int day) =>
    Handle(() => EthiopianDateDto.From(new EthiopianDate(year, month, day))));

// Calendar subscription feed for Google, Apple and Outlook calendars.
// /calendar.ics has every fast and feast for three years; ?weekly=true adds Wednesday and Friday fasts.
// HEAD too: some calendar apps (Outlook among them) check the feed with HEAD before subscribing.
app.MapMethods("/calendar.ics", ["GET", "HEAD"], (HttpContext http, IConfiguration config, bool? weekly) =>
{
    var today = EthiopianDate.FromGregorian(DateOnly.FromDateTime(DateTime.UtcNow));
    var events = CalendarFeed.Events(today.Year, years: 3, weekly ?? false, SiteUrl(http, config));

    http.Response.Headers.CacheControl = "public, max-age=3600";
    return TypedResults.Text(
        IcsWriter.Write(CalendarFeed.CalendarName, events, DateTimeOffset.UtcNow),
        "text/calendar; charset=utf-8");
});

// Unknown /api routes are a 404, not the website.
api.MapFallback(() => TypedResults.NotFound());

// Any other path (/, /record/2026-11-24) is a page in the React app.
app.MapFallbackToFile("index.html");

app.Run();

// Core throws ArgumentOutOfRangeException for any impossible date (Pagume 6 in a
// non-leap year, month 14, a year out of range). That is the caller's mistake, so
// it becomes a 400 Bad Request with a readable message instead of a 500 error.
static IResult Handle<T>(Func<T> action) => HandleResult(() => TypedResults.Ok(action()));

static IResult HandleResult(Func<IResult> action)
{
    try
    {
        return action();
    }
    catch (ArgumentOutOfRangeException ex)
    {
        return TypedResults.Problem(
            title: "Invalid date",
            detail: ex.Message,
            statusCode: StatusCodes.Status400BadRequest);
    }
}

// The public address used in links (e.g. inside calendar events). Set SiteUrl in production,
// because behind a hosting proxy the request itself may look like plain http.
static string SiteUrl(HttpContext http, IConfiguration config) =>
    config["SiteUrl"]?.TrimEnd('/') ?? $"{http.Request.Scheme}://{http.Request.Host}";

// Lets the integration tests start this app in memory.
public partial class Program;
