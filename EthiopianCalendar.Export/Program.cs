// Writes the calendar as static files, for the embeddable widget and the static calendar feed.
//
// Usage: dotnet run --project EthiopianCalendar.Export -- <output folder> [site url] [parishes folder]
//
// Output:
//   data/<year>.json             every day of the Ethiopian years around today: fasts (with "day X of Y") and feasts
//   calendar.ics                 iCalendar feed of every fast and feast for three years
//   parishes/<id>.json           each parish's own days (tabots), for the widget's data-parish option
//   parishes/<id>/calendar.ics   that parish's feed: everything above plus its tabot days
//
// Static files never sleep and cost nothing to serve. A monthly GitHub Action reruns
// this, so the files always cover the current year and the next ones.

using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using EthiopianCalendar.Core;
using EthiopianCalendar.Core.Ics;

string outDir = args.Length > 0 ? args[0] : "out";
string siteUrl = (args.Length > 1 ? args[1] : "https://ethiopian-calendar.onrender.com").TrimEnd('/');
string parishesDir = args.Length > 2 ? args[2] : "parishes";

var today = EthiopianDate.FromGregorian(DateOnly.FromDateTime(DateTime.UtcNow));

// Last year (so the start of the current year is always covered) through two years ahead.
int firstYear = today.Year - 1;
int lastYear = today.Year + 2;

Directory.CreateDirectory(Path.Combine(outDir, "data"));
var json = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    // Keep Amharic readable in the published files instead of \u12A6-style escapes.
    Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
};

for (int year = firstYear; year <= lastYear; year++)
{
    var file = Path.Combine(outDir, "data", $"{year}.json");
    File.WriteAllText(file, JsonSerializer.Serialize(YearData(year), json));
    Console.WriteLine($"Wrote {file}");
}

var events = CalendarFeed.Events(today.Year, years: 3, siteUrl);
File.WriteAllText(Path.Combine(outDir, "calendar.ics"),
    IcsWriter.Write(CalendarFeed.CalendarName, events, DateTimeOffset.UtcNow));
Console.WriteLine($"Wrote calendar.ics ({events.Count} events)");

if (Directory.Exists(parishesDir))
{
    foreach (var file in Directory.GetFiles(parishesDir, "*.json"))
    {
        // Load validates the profile, so a bad date fails the build instead of reaching the site.
        var parish = ParishProfile.Load(file);
        var parishDir = Path.Combine(outDir, "parishes", parish.Id);
        Directory.CreateDirectory(parishDir);

        File.WriteAllText(Path.Combine(outDir, "parishes", $"{parish.Id}.json"), JsonSerializer.Serialize(parish, json));

        var parishEvents = CalendarFeed.Events(today.Year, years: 3, siteUrl, parish);
        File.WriteAllText(Path.Combine(parishDir, "calendar.ics"),
            IcsWriter.Write(CalendarFeed.CalendarNameFor(parish), parishEvents, DateTimeOffset.UtcNow));
        Console.WriteLine($"Wrote parish {parish.Id} ({parish.Tabots.Count} tabot days, {parishEvents.Count} feed events)");
    }
}

static YearFile YearData(int year) => new(
    year,
    BahireHasab.EvangelistOf(year).ToString(),
    Enumerable.Range(1, 13).Select(month =>
    {
        var first = new EthiopianDate(year, month, 1);
        var days = Enumerable.Range(0, EthiopianDate.DaysInMonth(year, month))
            .Select(i => DayData(first.AddDays(i)))
            .ToList();
        return new MonthData(month, first.MonthName, days);
    }).ToList());

static DayData DayData(EthiopianDate date) => new(
    date.Day,
    date.ToGregorian().ToString("yyyy-MM-dd"),
    (int)date.DayOfWeek,
    FastingCalendar.FastDaysOn(date).Select(f => new FastData(f.Id, f.Name, f.DayNumber, f.TotalDays)).ToList(),
    ChurchCalendar.ObservancesOn(date).Select(o => new FeastData(o.Id, o.Name, o.Kind.ToString())).ToList(),
    MonthlyCommemorations.On(date).Select(c => new CommemorationData(c.Id, c.Name, c.NameAmharic)).ToList());

record YearFile(int Year, string Evangelist, List<MonthData> Months);
record MonthData(int Month, string Name, List<DayData> Days);
record DayData(int Day, string Gregorian, int Weekday, List<FastData> Fasts, List<FeastData> Feasts, List<CommemorationData> Commemorations);
record CommemorationData(string Id, string Name, string NameAmharic);
record FastData(string Id, string Name, int Day, int Total);
record FeastData(string Id, string Name, string Kind);
