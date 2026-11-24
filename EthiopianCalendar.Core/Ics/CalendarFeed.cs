namespace EthiopianCalendar.Core.Ics;

/// <summary>
/// Turns the church calendar into iCalendar events: every named fast and feast,
/// plus every Wednesday and Friday fast (with its exceptions).
/// </summary>
public static class CalendarFeed
{
    public const string CalendarName = "Ethiopian Orthodox Calendar";

    /// <param name="fromYear">The first Ethiopian year to include.</param>
    /// <param name="years">How many Ethiopian years to include.</param>
    /// <param name="siteUrl">Base URL for links to each observance's page, e.g. https://example.com</param>
    /// <param name="parish">Optional: also include this parish's own tabot days.</param>
    public static IReadOnlyList<CalendarEvent> Events(int fromYear, int years, string siteUrl, ParishProfile? parish = null)
    {
        var events = new List<CalendarEvent>();

        for (int year = fromYear; year < fromYear + years; year++)
        {
            events.AddRange(ChurchCalendar.Occurrences(year).Select(o => ToEvent(o, siteUrl)));

            // Always included: the Wednesday and Friday fasts shape daily life as much as the named fasts do.
            events.AddRange(WeeklyFasts(year, siteUrl));

            if (parish is not null)
                events.AddRange(ParishCalendar.TabotDays(parish, year).Select(t => TabotEvent(t, parish, siteUrl)));
        }

        return events.OrderBy(e => e.Start).ToList();
    }

    /// <summary>The calendar name for a parish's feed, e.g. "St. Teklehaimanot ..., Ottawa".</summary>
    public static string CalendarNameFor(ParishProfile parish) => $"{parish.Name}: {CalendarName}";

    private static CalendarEvent TabotEvent(Observance tabot, ParishProfile parish, string siteUrl) => new(
        // The parish id keeps UIDs unique if a subscriber follows two parishes' feeds.
        Uid: $"{parish.Id}-{tabot.Id}-{IcsWriter.FormatDate(tabot.Date.ToGregorian())}@ethiopian-calendar",
        Summary: tabot.Name,
        Start: tabot.Date.ToGregorian(),
        EndInclusive: tabot.Date.ToGregorian(),
        Description: $"{tabot.Date}\n\nTabot procession at {parish.Name}.",
        Url: siteUrl);

    private static CalendarEvent ToEvent(Occurrence o, string siteUrl)
    {
        string when = o.LengthInDays == 1
            ? o.Start.ToString()
            : $"{o.Start} to {o.End} ({o.LengthInDays} days)";

        string url = $"{siteUrl}/{o.Id}";

        return new CalendarEvent(
            Uid: Uid(o.Id, o.Start),
            Summary: o.Name,
            Start: o.Start.ToGregorian(),
            EndInclusive: o.End.ToGregorian(),
            Description: $"{when}\n\nComputed with Bahire Hasab.\n{url}",
            Url: url);
    }

    private static IEnumerable<CalendarEvent> WeeklyFasts(int year, string siteUrl)
    {
        var first = new EthiopianDate(year, 1, 1);
        int days = EthiopianDate.IsLeapYear(year) ? 366 : 365;

        for (int i = 0; i < days; i++)
        {
            var date = first.AddDays(i);
            if (FastingCalendar.FastDaysOn(date).Any(f => f.Id == FastingCalendar.WeeklyFastId))
            {
                yield return new CalendarEvent(
                    Uid: Uid(FastingCalendar.WeeklyFastId, date),
                    Summary: $"{date.DayOfWeek} fast (Tsome Dihnet)",
                    Start: date.ToGregorian(),
                    EndInclusive: date.ToGregorian(),
                    Description: $"{date}\n\nWednesday and Friday fast.",
                    Url: $"{siteUrl}/{FastingCalendar.WeeklyFastId}");
            }
        }
    }

    /// <summary>
    /// Stable across requests, so calendar apps update existing events instead of
    /// adding duplicates every time they refresh.
    /// </summary>
    private static string Uid(string id, EthiopianDate start) =>
        $"{id}-{IcsWriter.FormatDate(start.ToGregorian())}@ethiopian-calendar";
}
