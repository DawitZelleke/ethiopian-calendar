namespace EthiopianCalendar.Core;

/// <summary>A feast kept on the same day of every month, e.g. St. Michael on the 12th.</summary>
public sealed record MonthlyCommemoration(int Day, string Id, string Name, string NameAmharic);

/// <summary>
/// The monthly feast days of the Ethiopian Orthodox Tewahedo Church. Unlike tabot days,
/// these are kept by the whole church, so they belong to the engine, not a parish profile.
/// </summary>
public static class MonthlyCommemorations
{
    /// <summary>Where these come from. Every universal date in the engine should be traceable.</summary>
    public const string Source =
        "Aymero W. and Joachim M., The Ethiopian Orthodox Church (Addis Ababa: Ethiopian Orthodox Mission, 1970), " +
        "as published at ethiopianorthodox.org/english/calendar.html";

    public static readonly IReadOnlyList<MonthlyCommemoration> All =
    [
        new(7, "monthly-selassie", "Holy Trinity", "ሥላሴ"),
        new(12, "monthly-mikael", "St. Michael the Archangel", "ቅዱስ ሚካኤል"),
        new(16, "monthly-kidane-mehret", "Kidane Mehret (Covenant of Mercy)", "ኪዳነ ምሕረት"),
        new(21, "monthly-mariam", "St. Mary", "ማርያም"),
        new(27, "monthly-medhane-alem", "Medhane Alem (Saviour of the World)", "መድኃኔ ዓለም"),
        new(29, "monthly-bale-wold", "Bale Wold (Feast of the Son)", "በዓለ ወልድ"),
    ];

    /// <summary>The monthly feasts that fall on a date. Pagume (5 or 6 days) has none.</summary>
    public static IReadOnlyList<MonthlyCommemoration> On(EthiopianDate date) =>
        date.Month == EthiopianDate.Pagume ? [] : All.Where(c => c.Day == date.Day).ToList();
}
