using System.Text.Json;
using System.Text.Json.Serialization;

namespace EthiopianCalendar.Core;

/// <summary>
/// One day each year when a parish brings out a tabot, e.g. St. Michael's on Hidar 12.
/// Source records who confirmed it, because these dates differ between parishes and
/// must come from the parish itself, never from a guess.
/// </summary>
public sealed record TabotDay(
    string Id,
    string Saint,
    string SaintAmharic,
    string Occasion,
    int Month,
    int Day,
    string Source);

/// <summary>
/// The parts of the calendar that belong to one parish rather than the whole church:
/// which tabots it brings out and when. The universal calendar (Bahire Hasab, fasts,
/// major feasts) is the same everywhere; a profile adds one parish's own days to it.
/// </summary>
public sealed record ParishProfile(
    string Id,
    string Name,
    string NameAmharic,
    IReadOnlyList<TabotDay> Tabots)
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    /// <summary>Parses and validates a profile. Throws with a clear message if anything is wrong.</summary>
    public static ParishProfile FromJson(string json)
    {
        var profile = JsonSerializer.Deserialize<ParishProfile>(json, Json)
            ?? throw new InvalidDataException("The parish profile is empty.");

        Require(!string.IsNullOrWhiteSpace(profile.Id), "The parish profile needs an id.");
        Require(!string.IsNullOrWhiteSpace(profile.Name), $"Parish '{profile.Id}' needs a name.");

        foreach (var t in profile.Tabots ?? [])
        {
            string where = $"Parish '{profile.Id}', tabot '{t.Id}'";
            Require(!string.IsNullOrWhiteSpace(t.Id) && !string.IsNullOrWhiteSpace(t.Saint), $"{where}: needs an id and a saint.");
            Require(!string.IsNullOrWhiteSpace(t.Source), $"{where}: needs a source (who confirmed this date).");
            // Pagume 6 only exists in leap years, so a yearly date must exist every year.
            Require(t.Month is >= 1 and <= 13 && t.Day >= 1 && t.Day <= (t.Month == 13 ? 5 : 30),
                $"{where}: {t.Month}/{t.Day} is not a date that occurs every year.");
        }

        return profile with { Tabots = profile.Tabots ?? [] };
    }

    public static ParishProfile Load(string path) => FromJson(File.ReadAllText(path));

    private static void Require(bool condition, string message)
    {
        if (!condition)
            throw new InvalidDataException(message);
    }
}

/// <summary>A parish's own days, combined with the universal church calendar.</summary>
public static class ParishCalendar
{
    /// <summary>The parish's tabot days in an Ethiopian year, as observances.</summary>
    public static IReadOnlyList<Observance> TabotDays(ParishProfile parish, int year) =>
        parish.Tabots
            .Select(t => new Observance(t.Id, $"{t.Occasion}: {t.Saint} tabot", ObservanceKind.Tabot, new EthiopianDate(year, t.Month, t.Day)))
            .OrderBy(o => o.Date.ToJulianDayNumber())
            .ToList();

    /// <summary>Every universal observance plus the parish's tabot days, in date order.</summary>
    public static IReadOnlyList<Observance> Observances(ParishProfile parish, int year) =>
        ChurchCalendar.Observances(year)
            .Concat(TabotDays(parish, year))
            .OrderBy(o => o.Date.ToJulianDayNumber())
            .ToList();

    public static IReadOnlyList<Observance> ObservancesOn(ParishProfile parish, EthiopianDate date) =>
        Observances(parish, date.Year).Where(o => o.Date == date).ToList();
}
