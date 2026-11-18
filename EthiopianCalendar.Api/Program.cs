using System.Text.Json.Serialization;
using EthiopianCalendar.Api;
using EthiopianCalendar.Core;

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

var api = app.MapGroup("/api");

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

// Conversions in both directions.
api.MapGet("/convert/to-ethiopian/{date}", (DateOnly date) =>
    Handle(() => EthiopianDateDto.From(EthiopianDate.FromGregorian(date))));

api.MapGet("/convert/to-gregorian/{year:int}/{month:int}/{day:int}", (int year, int month, int day) =>
    Handle(() => EthiopianDateDto.From(new EthiopianDate(year, month, day))));

app.Run();

// Core throws ArgumentOutOfRangeException for any impossible date (Pagume 6 in a
// non-leap year, month 14, a year out of range). That is the caller's mistake, so
// it becomes a 400 Bad Request with a readable message instead of a 500 error.
static IResult Handle<T>(Func<T> action)
{
    try
    {
        return TypedResults.Ok(action());
    }
    catch (ArgumentOutOfRangeException ex)
    {
        return TypedResults.Problem(
            title: "Invalid date",
            detail: ex.Message,
            statusCode: StatusCodes.Status400BadRequest);
    }
}

// Lets the integration tests start this app in memory.
public partial class Program;
