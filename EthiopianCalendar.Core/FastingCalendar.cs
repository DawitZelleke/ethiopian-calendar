namespace EthiopianCalendar.Core;

/// <summary>A named fast that runs every day from Start to End, inclusive.</summary>
public sealed record FastPeriod(string Id, string Name, EthiopianDate Start, EthiopianDate End)
{
    public bool Contains(EthiopianDate date)
    {
        int day = date.ToJulianDayNumber();
        return day >= Start.ToJulianDayNumber() && day <= End.ToJulianDayNumber();
    }

    public int LengthInDays => End.ToJulianDayNumber() - Start.ToJulianDayNumber() + 1;

    /// <summary>1 on the first day of the fast, LengthInDays on the last.</summary>
    public int DayNumberOf(EthiopianDate date) => date.ToJulianDayNumber() - Start.ToJulianDayNumber() + 1;
}

/// <summary>One fast in effect on a given day, with progress: "Day 3 of 44".</summary>
public sealed record FastDay(string Id, string Name, int DayNumber, int TotalDays);

/// <summary>
/// Fixed feasts and the full fasting calendar for an Ethiopian year.
///
/// Rules (confirmed against my family's practice):
/// 1. Named fasts (Nineveh, Abiy Tsom, Hawaryat, Nebiyat, Filseta, Gehad) are fast
///    days on every day of their period. No exceptions.
/// 2. Outside named fasts, every Wednesday and Friday is a fast day (Tsome Dihnet), except:
///    a. the 50 days from Fasika to Paraclete, and
///    b. when Genna or Timkat falls on a Wednesday or Friday.
/// </summary>
public static class FastingCalendar
{
    public const string WeeklyFastId = "tsome-dihnet";
    public const string WeeklyFastName = "Wednesday and Friday fast (Tsome Dihnet)";

    private const int Tahsas = 4, Tir = 5, Hamle = 11, Nehase = 12, Hidar = 3, Meskerem = 1;

    /// <summary>
    /// Genna is Tahsas 29, or Tahsas 28 in the year after a leap year,
    /// because the extra Pagume day shifts it. Either way it falls on January 7.
    /// </summary>
    public static EthiopianDate Genna(int year) =>
        new(year, Tahsas, EthiopianDate.IsLeapYear(year - 1) ? 28 : 29);

    public static EthiopianDate Timkat(int year) => new(year, Tir, 11);

    public static IReadOnlyList<Observance> FixedFeasts(int year) =>
    [
        new("enkutatash", "Enkutatash (New Year)", ObservanceKind.Feast, new EthiopianDate(year, Meskerem, 1)),
        new("meskel", "Meskel (Finding of the True Cross)", ObservanceKind.Feast, new EthiopianDate(year, Meskerem, 17)),
        new("hidar-tsion", "Hidar Tsion (St. Mary of Zion)", ObservanceKind.SaintsDay, new EthiopianDate(year, Hidar, 21)),
        new("genna", "Genna (Christmas)", ObservanceKind.Feast, Genna(year)),
        new("timkat", "Timkat (Epiphany)", ObservanceKind.Feast, Timkat(year)),
        new("peter-and-paul", "Feast of Peter and Paul", ObservanceKind.Feast, new EthiopianDate(year, Hamle, 5)),
        new("filseta", "Filseta (Assumption of Mary)", ObservanceKind.Feast, new EthiopianDate(year, Nehase, 16)),
    ];

    public static IReadOnlyList<FastPeriod> FastPeriods(int year)
    {
        var nineveh = BahireHasab.Compute(year).Nineveh;

        return
        [
            new("tsome-nebiyat", "Tsome Nebiyat (Fast of the Prophets)", new EthiopianDate(year, Hidar, 15), Genna(year).AddDays(-1)),
            new("gehad-timkat", "Gehad of Timkat", Timkat(year).AddDays(-1), Timkat(year).AddDays(-1)),
            new("tsome-nenewe", "Tsome Nenewe (Fast of Nineveh)", nineveh, nineveh.AddDays(2)),
            new("abiy-tsom", "Abiy Tsom (Great Lent)", nineveh.AddDays(14), nineveh.AddDays(MoveableFeasts.FasikaOffset - 1)),
            new("tsome-hawaryat", "Tsome Hawaryat (Fast of the Apostles)", nineveh.AddDays(119), new EthiopianDate(year, Hamle, 4)),
            new("tsome-filseta", "Tsome Filseta (Fast of the Assumption)", new EthiopianDate(year, Nehase, 1), new EthiopianDate(year, Nehase, 15)),
        ];
    }

    /// <summary>Every fast in effect on this date, with progress. Empty means it is not a fast day.</summary>
    public static IReadOnlyList<FastDay> FastDaysOn(EthiopianDate date)
    {
        var named = FastPeriods(date.Year)
            .Where(p => p.Contains(date))
            .Select(p => new FastDay(p.Id, p.Name, p.DayNumberOf(date), p.LengthInDays))
            .ToList();

        if (named.Count > 0)
            return named;

        return IsWeeklyFastDay(date) ? [new FastDay(WeeklyFastId, WeeklyFastName, 1, 1)] : [];
    }

    /// <summary>The names of every fast in effect on this date.</summary>
    public static IReadOnlyList<string> FastsOn(EthiopianDate date) =>
        FastDaysOn(date).Select(f => f.Name).ToList();

    public static bool IsFastDay(EthiopianDate date) => FastDaysOn(date).Count > 0;

    private static bool IsWeeklyFastDay(EthiopianDate date)
    {
        if (date.DayOfWeek is not (DayOfWeek.Wednesday or DayOfWeek.Friday))
            return false;

        // Exception a: no fasting in the 50 days from Fasika to Paraclete.
        var nineveh = BahireHasab.Compute(date.Year).Nineveh;
        var fiftyDays = new FastPeriod("fifty-days", "Fifty days", nineveh.AddDays(MoveableFeasts.FasikaOffset), nineveh.AddDays(118));
        if (fiftyDays.Contains(date))
            return false;

        // Exception b: Genna and Timkat override the weekly fast.
        if (date == Genna(date.Year) || date == Timkat(date.Year))
            return false;

        return true;
    }
}
