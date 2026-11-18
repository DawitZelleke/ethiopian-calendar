namespace EthiopianCalendar.Core;

/// <summary>
/// One occurrence of a fast or feast. Feasts are a single day (Start == End);
/// fasts run from Start to End inclusive.
/// </summary>
public sealed record Occurrence(string Id, string Name, EthiopianDate Start, EthiopianDate End)
{
    public int LengthInDays => End.ToJulianDayNumber() - Start.ToJulianDayNumber() + 1;

    public bool IsInProgressOn(EthiopianDate date) =>
        date.ToJulianDayNumber() >= Start.ToJulianDayNumber() && date.ToJulianDayNumber() <= End.ToJulianDayNumber();
}

/// <summary>Combines fixed and moveable observances into one calendar for a year.</summary>
public static class ChurchCalendar
{
    /// <summary>Every fixed and moveable observance in an Ethiopian year, in date order.</summary>
    public static IReadOnlyList<Observance> Observances(int year) =>
        FastingCalendar.FixedFeasts(year)
            .Concat(BahireHasab.MoveableObservances(year))
            .OrderBy(o => o.Date.ToJulianDayNumber())
            .ToList();

    /// <summary>
    /// The current or next occurrence of a fast or feast, on or after a date.
    /// A fast that has already started counts as current. Returns null for an unknown id.
    /// </summary>
    public static Occurrence? NextOccurrence(string id, EthiopianDate from)
    {
        int fromDay = from.ToJulianDayNumber();

        return new[] { from.Year, from.Year + 1 }
            .SelectMany(OccurrencesIn)
            .Where(o => o.Id == id && o.End.ToJulianDayNumber() >= fromDay)
            .OrderBy(o => o.Start.ToJulianDayNumber())
            .ThenByDescending(o => o.LengthInDays) // a fast period beats the one-day "fast begins" marker
            .FirstOrDefault();
    }

    private static IEnumerable<Occurrence> OccurrencesIn(int year) =>
        FastingCalendar.FastPeriods(year).Select(p => new Occurrence(p.Id, p.Name, p.Start, p.End))
            .Concat(Observances(year).Select(o => new Occurrence(o.Id, o.Name, o.Date, o.Date)));

    /// <summary>The observances that fall on one specific date.</summary>
    public static IReadOnlyList<Observance> ObservancesOn(EthiopianDate date) =>
        Observances(date.Year).Where(o => o.Date == date).ToList();
}
