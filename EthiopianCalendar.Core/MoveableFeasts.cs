namespace EthiopianCalendar.Core;

public enum ObservanceKind
{
    Feast,
    FastBegins,
    SaintsDay,
    /// <summary>A parish brings out a tabot (e.g. St. Michael's on Hidar 12). Parish-specific.</summary>
    Tabot,
}

/// <summary>A named observance on a specific date.</summary>
/// <remarks>Id is a stable key (e.g. "tsome-nebiyat") used to look up written content.</remarks>
public sealed record Observance(string Id, string Name, ObservanceKind Kind, EthiopianDate Date);

/// <summary>A moveable observance defined as an offset in days from Nineveh.</summary>
public sealed record MoveableFeast(string Id, string Name, ObservanceKind Kind, int DaysAfterNineveh);

/// <summary>
/// The moveable observances as data, not code. Adding one is a one-line change.
/// </summary>
public static class MoveableFeasts
{
    public const int FasikaOffset = 69;

    public static readonly IReadOnlyList<MoveableFeast> All =
    [
        new("tsome-nenewe", "Tsome Nenewe (Fast of Nineveh)", ObservanceKind.FastBegins, 0),
        new("abiy-tsom", "Abiy Tsom (Great Lent)", ObservanceKind.FastBegins, 14),
        new("debre-zeit", "Debre Zeit", ObservanceKind.Feast, 41),
        new("hosanna", "Hosanna", ObservanceKind.Feast, 62),
        new("siklet", "Siklet (Good Friday)", ObservanceKind.Feast, 67),
        new("fasika", "Fasika (Easter)", ObservanceKind.Feast, FasikaOffset),
        new("rikbe-kahnat", "Rikbe Kahnat", ObservanceKind.Feast, 93),
        new("erget", "Erget (Ascension)", ObservanceKind.Feast, 108),
        new("paraclete", "Paraclete (Pentecost)", ObservanceKind.Feast, 118),
        new("tsome-hawaryat", "Tsome Hawaryat (Fast of the Apostles)", ObservanceKind.FastBegins, 119),
        new("tsome-dihnet", "Tsome Dihnet (Wednesday and Friday fasts resume)", ObservanceKind.FastBegins, 121),
    ];
}
