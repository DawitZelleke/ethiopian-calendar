namespace EthiopianCalendar.Core;

/// <summary>
/// A date in the Ethiopian calendar: 12 months of 30 days, then Pagume (5 or 6 days).
/// Always valid once constructed.
/// </summary>
public readonly record struct EthiopianDate
{
    // Julian Day Number of Meskerem 1, year 1 (Amete Mihret era).
    private const int EpochJdn = 1724221;

    // DateOnly.DayNumber counts days from Jan 1, 0001; JDN counts from 4713 BC.
    private const int DayNumberToJdnOffset = 1721426;

    public const int Pagume = 13;

    private static readonly string[] MonthNames =
    [
        "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
        "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
    ];

    public int Year { get; }
    public int Month { get; }
    public int Day { get; }

    public EthiopianDate(int year, int month, int day)
    {
        if (year < 1)
            throw new ArgumentOutOfRangeException(nameof(year), year, "Year must be 1 or later.");

        if (month < 1 || month > Pagume)
            throw new ArgumentOutOfRangeException(nameof(month), month, "Month must be between 1 and 13.");

        int daysInMonth = DaysInMonth(year, month);
        if (day < 1 || day > daysInMonth)
            throw new ArgumentOutOfRangeException(nameof(day), day,
                $"{MonthNames[month - 1]} {year} has {daysInMonth} days.");

        Year = year;
        Month = month;
        Day = day;
    }

    public string MonthName => MonthNames[Month - 1];

    public static bool IsLeapYear(int year) => year % 4 == 3;

    public static int DaysInMonth(int year, int month)
    {
        if (month < 1 || month > Pagume)
            throw new ArgumentOutOfRangeException(nameof(month), month, "Month must be between 1 and 13.");

        if (month < Pagume)
            return 30;

        return IsLeapYear(year) ? 6 : 5;
    }

    // ---- Conversion: everything goes through the Julian Day Number ----

    public int ToJulianDayNumber() =>
        EpochJdn + 365 * (Year - 1) + Year / 4 + 30 * (Month - 1) + Day - 1;

    public static EthiopianDate FromJulianDayNumber(int jdn)
    {
        int daysSinceEpoch = jdn - EpochJdn;
        if (daysSinceEpoch < 0)
            throw new ArgumentOutOfRangeException(nameof(jdn), jdn, "Date is before Ethiopian year 1.");

        // 1461 days = one 4-year cycle (3 x 365 + 366). The +1463 lines the
        // year boundaries up so the leap day (Pagume 6) stays in the right year.
        int year = (4 * daysSinceEpoch + 1463) / 1461;

        int dayOfYear = jdn - new EthiopianDate(year, 1, 1).ToJulianDayNumber();
        int month = dayOfYear / 30 + 1;
        int day = dayOfYear % 30 + 1;

        return new EthiopianDate(year, month, day);
    }

    public DateOnly ToGregorian() =>
        DateOnly.FromDayNumber(ToJulianDayNumber() - DayNumberToJdnOffset);

    public static EthiopianDate FromGregorian(DateOnly date) =>
        FromJulianDayNumber(date.DayNumber + DayNumberToJdnOffset);

    public DayOfWeek DayOfWeek => ToGregorian().DayOfWeek;

    public EthiopianDate AddDays(int days) => FromJulianDayNumber(ToJulianDayNumber() + days);

    public override string ToString() => $"{MonthName} {Day}, {Year}";
}
