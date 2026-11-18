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

public sealed record ObservanceDto(string Name, ObservanceKind Kind, EthiopianDateDto Date)
{
    public static ObservanceDto From(Observance o) => new(o.Name, o.Kind, EthiopianDateDto.From(o.Date));
}

public sealed record FastPeriodDto(string Name, EthiopianDateDto Start, EthiopianDateDto End, int LengthInDays)
{
    public static FastPeriodDto From(FastPeriod p) =>
        new(p.Name, EthiopianDateDto.From(p.Start), EthiopianDateDto.From(p.End), p.LengthInDays);
}

public sealed record DayDto(
    EthiopianDateDto Date,
    DayOfWeek DayOfWeek,
    bool IsFastDay,
    IReadOnlyList<string> Fasts,
    IReadOnlyList<ObservanceDto> Observances);

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
    EthiopianDateDto Fasika)
{
    public static BahireHasabDto From(BahireHasabResult r) => new(
        r.Year, r.AmeteAlem, r.Wenber, r.Abekte, r.Metqi,
        EthiopianDateDto.From(r.BealeMetqi), r.Tewsak, r.MebajaHamer,
        EthiopianDateDto.From(r.Nineveh),
        EthiopianDateDto.From(r.Nineveh.AddDays(MoveableFeasts.FasikaOffset)));
}
