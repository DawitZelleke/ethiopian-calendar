namespace EthiopianCalendar.Core;

public enum Evangelist
{
    Matthew,
    Mark,
    Luke,
    John,
}

/// <summary>
/// The intermediate values of the Bahire Hasab computation for one Ethiopian year.
/// Kept as a record so the UI can show the working, not just the answer.
/// </summary>
public sealed record BahireHasabResult(
    int Year,
    int AmeteAlem,
    int Wenber,
    int Abekte,
    int Metqi,
    EthiopianDate BealeMetqi,
    int Tewsak,
    int MebajaHamer,
    EthiopianDate Nineveh);

/// <summary>
/// Bahire Hasab: the traditional Ethiopian Orthodox computation of the moveable feasts.
/// Every moveable feast is a fixed number of days after Nineveh.
/// </summary>
public static class BahireHasab
{
    private const int AmeteAlemOffset = 5500;

    public static BahireHasabResult Compute(int year)
    {
        int ameteAlem = year + AmeteAlemOffset;
        int wenber = (ameteAlem - 1) % 19;
        int abekte = wenber * 11 % 30;

        // Once every 19 years Metqi comes out as 0. It must be treated as 30,
        // otherwise Fasika lands about a month late (e.g. Ethiopian year 1987).
        int metqi = wenber * 19 % 30;
        if (metqi == 0)
            metqi = 30;

        bool metqiInMeskerem = metqi > 14;
        var bealeMetqi = new EthiopianDate(year, metqiInMeskerem ? 1 : 2, metqi);

        int tewsak = TewsakFor(bealeMetqi.DayOfWeek);
        int mebajaHamer = metqi + tewsak;

        int ninevehMonth = metqiInMeskerem ? 5 : 6; // Tir : Yekatit
        if (mebajaHamer > 30)
        {
            mebajaHamer -= 30;
            ninevehMonth++;
        }

        var nineveh = new EthiopianDate(year, ninevehMonth, mebajaHamer);

        return new BahireHasabResult(
            year, ameteAlem, wenber, abekte, metqi, bealeMetqi, tewsak, mebajaHamer, nineveh);
    }

    /// <summary>
    /// Each year is dedicated to an Evangelist, in a four-year cycle: Matthew, Mark, Luke, John.
    /// The year of Luke is the leap year (the one with Pagume 6).
    /// </summary>
    public static Evangelist EvangelistOf(int year) => (year % 4) switch
    {
        1 => Evangelist.Matthew,
        2 => Evangelist.Mark,
        3 => Evangelist.Luke,
        _ => Evangelist.John,
    };

    /// <summary>Tewsak: a fixed number per weekday of Beale Metqi.</summary>
    public static int TewsakFor(DayOfWeek day) => day switch
    {
        DayOfWeek.Sunday => 7,
        DayOfWeek.Monday => 6,
        DayOfWeek.Tuesday => 5,
        DayOfWeek.Wednesday => 4,
        DayOfWeek.Thursday => 3,
        DayOfWeek.Friday => 2,
        DayOfWeek.Saturday => 8,
        _ => throw new ArgumentOutOfRangeException(nameof(day)),
    };

    public static IReadOnlyList<Observance> MoveableObservances(int year)
    {
        var nineveh = Compute(year).Nineveh;

        return MoveableFeasts.All
            .Select(f => new Observance(f.Id, f.Name, f.Kind, nineveh.AddDays(f.DaysAfterNineveh)))
            .ToList();
    }

    public static EthiopianDate Fasika(int year) =>
        Compute(year).Nineveh.AddDays(MoveableFeasts.FasikaOffset);
}
