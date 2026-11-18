namespace EthiopianCalendar.Core;

public enum ObservanceKind
{
    Feast,
    FastBegins,
}

/// <summary>A named observance on a specific date.</summary>
public sealed record Observance(string Name, ObservanceKind Kind, EthiopianDate Date);

/// <summary>A moveable observance defined as an offset in days from Nineveh.</summary>
public sealed record MoveableFeast(string Name, ObservanceKind Kind, int DaysAfterNineveh);

/// <summary>
/// The moveable observances as data, not code. Adding one is a one-line change.
/// </summary>
public static class MoveableFeasts
{
    public const int FasikaOffset = 69;

    public static readonly IReadOnlyList<MoveableFeast> All =
    [
        new("Tsome Nenewe (Fast of Nineveh)", ObservanceKind.FastBegins, 0),
        new("Abiy Tsom (Great Lent)", ObservanceKind.FastBegins, 14),
        new("Debre Zeit", ObservanceKind.Feast, 41),
        new("Hosanna", ObservanceKind.Feast, 62),
        new("Siklet (Good Friday)", ObservanceKind.Feast, 67),
        new("Fasika (Easter)", ObservanceKind.Feast, FasikaOffset),
        new("Rikbe Kahnat", ObservanceKind.Feast, 93),
        new("Erget (Ascension)", ObservanceKind.Feast, 108),
        new("Paraclete (Pentecost)", ObservanceKind.Feast, 118),
        new("Tsome Hawaryat (Fast of the Apostles)", ObservanceKind.FastBegins, 119),
        new("Tsome Dihnet (Wednesday and Friday fasts resume)", ObservanceKind.FastBegins, 121),
    ];
}
