using EthiopianCalendar.Core;

namespace EthiopianCalendar.Api;

// DTOs: the shapes the API returns. Kept separate from the Core types so the
// library can change internally without breaking anyone who calls the API.

public sealed record EthiopianDateDto(
    int Year, int Month, int Day, string MonthName, string Display, DateOnly Gregorian)
{
    public static EthiopianDateDto From(EthiopianDate date) =>
        new(date.Year, date.Month, date.Day, date.MonthName, date.ToString(), date.ToGregorian());
}

public sealed record ObservanceDto(string Id, string Name, ObservanceKind Kind, EthiopianDateDto Date)
{
    public static ObservanceDto From(Observance o) => new(o.Id, o.Name, o.Kind, EthiopianDateDto.From(o.Date));
}

public sealed record FastDayDto(string Id, string Name, int DayNumber, int TotalDays)
{
    public static FastDayDto From(FastDay f) => new(f.Id, f.Name, f.DayNumber, f.TotalDays);
}

public sealed record FastPeriodDto(string Id, string Name, EthiopianDateDto Start, EthiopianDateDto End, int LengthInDays)
{
    public static FastPeriodDto From(FastPeriod p) =>
        new(p.Id, p.Name, EthiopianDateDto.From(p.Start), EthiopianDateDto.From(p.End), p.LengthInDays);
}

public sealed record CommemorationDto(string Id, string Name, string NameAmharic)
{
    public static CommemorationDto From(MonthlyCommemoration c) => new(c.Id, c.Name, c.NameAmharic);
}

public sealed record DayDto(
    EthiopianDateDto Date,
    DayOfWeek DayOfWeek,
    bool IsFastDay,
    IReadOnlyList<FastDayDto> Fasts,
    IReadOnlyList<ObservanceDto> Observances,
    IReadOnlyList<CommemorationDto> Commemorations)
{
    /// <summary>Everything about one day: its date, its fasts (with progress), and its feasts.</summary>
    public static DayDto For(EthiopianDate date) => new(
        EthiopianDateDto.From(date),
        date.DayOfWeek,
        FastingCalendar.IsFastDay(date),
        FastingCalendar.FastDaysOn(date).Select(FastDayDto.From).ToList(),
        ChurchCalendar.ObservancesOn(date).Select(ObservanceDto.From).ToList(),
        MonthlyCommemorations.On(date).Select(CommemorationDto.From).ToList());
}

public sealed record MonthDto(int Year, int Month, string MonthName, IReadOnlyList<DayDto> Days);

public sealed record YearDto(
    int Year,
    IReadOnlyList<ObservanceDto> Observances,
    IReadOnlyList<FastPeriodDto> FastPeriods);

public sealed record BahireHasabDto(
    int Year,
    int AmeteAlem,
    int Wenber,
    int Abekte,
    int Metqi,
    EthiopianDateDto BealeMetqi,
    int Tewsak,
    int MebajaHamer,
    EthiopianDateDto Nineveh,
    EthiopianDateDto Fasika,
    Evangelist Evangelist)
{
    public static BahireHasabDto From(BahireHasabResult r) => new(
        r.Year, r.AmeteAlem, r.Wenber, r.Abekte, r.Metqi,
        EthiopianDateDto.From(r.BealeMetqi), r.Tewsak, r.MebajaHamer,
        EthiopianDateDto.From(r.Nineveh),
        EthiopianDateDto.From(r.Nineveh.AddDays(MoveableFeasts.FasikaOffset)),
        BahireHasab.EvangelistOf(r.Year));
}

public sealed record OccurrenceDto(
    string Id,
    string Name,
    EthiopianDateDto Start,
    EthiopianDateDto End,
    int LengthInDays,
    bool InProgress,
    int? DayNumber)
{
    public static OccurrenceDto From(Occurrence o, EthiopianDate today)
    {
        bool inProgress = o.IsInProgressOn(today);
        return new(
            o.Id, o.Name, EthiopianDateDto.From(o.Start), EthiopianDateDto.From(o.End), o.LengthInDays,
            inProgress,
            inProgress ? today.ToJulianDayNumber() - o.Start.ToJulianDayNumber() + 1 : null);
    }
}
