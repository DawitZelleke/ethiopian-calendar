namespace EthiopianCalendar.Core;

/// <summary>Combines fixed and moveable observances into one calendar for a year.</summary>
public static class ChurchCalendar
{
    /// <summary>Every fixed and moveable observance in an Ethiopian year, in date order.</summary>
    public static IReadOnlyList<Observance> Observances(int year) =>
        FastingCalendar.FixedFeasts(year)
            .Concat(BahireHasab.MoveableObservances(year))
            .OrderBy(o => o.Date.ToJulianDayNumber())
            .ToList();

    /// <summary>The observances that fall on one specific date.</summary>
    public static IReadOnlyList<Observance> ObservancesOn(EthiopianDate date) =>
        Observances(date.Year).Where(o => o.Date == date).ToList();
}
