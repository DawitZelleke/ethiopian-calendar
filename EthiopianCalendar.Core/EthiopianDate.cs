namespace EthiopianCalendar.Core;

public readonly record struct EthiopianDate
{
    public int Year { get; }
    public int Month { get; }
    public int Day { get; }

    public EthiopianDate(int year, int month, int day)
    {
        Year = year;
        Month = month;
        Day = day;
    }

    public DateOnly ToGregorian() => throw new NotImplementedException();
}