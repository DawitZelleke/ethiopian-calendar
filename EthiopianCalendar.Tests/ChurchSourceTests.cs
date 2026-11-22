using EthiopianCalendar.Core;

namespace EthiopianCalendar.Tests;

/// <summary>
/// Checks against the church's own published calendar rules
/// (Aymero and Joachim, The Ethiopian Orthodox Church, 1970; ethiopianorthodox.org/english/calendar.html).
/// </summary>
public class ChurchSourceTests
{
    // "The Easter Lent always begins on a Monday and can not come before the 1st of Yekatit nor after
    // the 5th of Megabit..." Each movable feast has a published earliest and latest date.
    // (month, day) pairs; Yekatit = 6, Megabit = 7, Miyazya = 8, Ginbot = 9, Sene = 10.
    public static TheoryData<string, DayOfWeek, int, int, int, int> PublishedWindows => new()
    {
        { "abiy-tsom", DayOfWeek.Monday, 6, 1, 7, 5 },
        { "debre-zeit", DayOfWeek.Sunday, 6, 28, 8, 2 },
        { "hosanna", DayOfWeek.Sunday, 7, 19, 8, 23 },
        { "fasika", DayOfWeek.Sunday, 7, 26, 8, 30 },
        { "rikbe-kahnat", DayOfWeek.Wednesday, 8, 20, 9, 24 },
        { "erget", DayOfWeek.Thursday, 9, 5, 10, 9 },
        { "paraclete", DayOfWeek.Sunday, 9, 15, 10, 19 },
    };

    [Theory]
    [MemberData(nameof(PublishedWindows))]
    public void MovableFeasts_StayWithinTheChurchsPublishedWindows_1892To2092(
        string id, DayOfWeek weekday, int earliestMonth, int earliestDay, int latestMonth, int latestDay)
    {
        for (int year = 1892; year <= 2092; year++)
        {
            var date = BahireHasab.MoveableObservances(year).Single(o => o.Id == id).Date;
            int position = date.Month * 100 + date.Day;

            Assert.True(position >= earliestMonth * 100 + earliestDay && position <= latestMonth * 100 + latestDay,
                $"{id} {year}: {date} is outside {earliestMonth}/{earliestDay} to {latestMonth}/{latestDay}");
            Assert.Equal(weekday, date.DayOfWeek);
        }
    }

    [Theory]
    [InlineData(2019, 3, 12, "monthly-mikael")]
    [InlineData(2019, 3, 21, "monthly-mariam")]
    [InlineData(2019, 1, 7, "monthly-selassie")]
    [InlineData(2019, 6, 16, "monthly-kidane-mehret")]
    [InlineData(2019, 4, 27, "monthly-medhane-alem")]
    [InlineData(2019, 4, 29, "monthly-bale-wold")]
    public void MonthlyCommemorations_FallOnTheirDayEveryMonth(int year, int month, int day, string id)
    {
        Assert.Contains(MonthlyCommemorations.On(new EthiopianDate(year, month, day)), c => c.Id == id);
    }

    [Fact]
    public void MonthlyCommemorations_SkipPagume_AndOrdinaryDays()
    {
        Assert.Empty(MonthlyCommemorations.On(new EthiopianDate(2019, 13, 6)));
        Assert.Empty(MonthlyCommemorations.On(new EthiopianDate(2019, 3, 13)));
    }

    [Fact]
    public void TirMikael_And_KidaneMehret_ShiftADayInTheYearAfterALeapYear()
    {
        // The source gives Ter 12 as January 20 and Yekatit 16 as February 24. Both are right, in
        // different years: after an Ethiopian leap year (Pagume 6), every date lands one Gregorian day later.
        DateOnly Of(int year, string id) => FastingCalendar.FixedFeasts(year).Single(f => f.Id == id).Date.ToGregorian();

        Assert.Equal(new DateOnly(2027, 1, 20), Of(2019, "tir-mikael"));
        Assert.Equal(new DateOnly(2027, 2, 23), Of(2019, "kidane-mehret"));
        Assert.Equal(new DateOnly(2028, 1, 21), Of(2020, "tir-mikael"));      // the year after the 2019 leap year
        Assert.Equal(new DateOnly(2028, 2, 24), Of(2020, "kidane-mehret"));   // matches the source's "Feb. 24"
    }

    [Theory]
    [InlineData(2017, Evangelist.Matthew)]
    [InlineData(2018, Evangelist.Mark)]
    [InlineData(2019, Evangelist.Luke)]
    [InlineData(2020, Evangelist.John)]
    public void Evangelist_CyclesMatthewMarkLukeJohn(int year, Evangelist expected)
    {
        Assert.Equal(expected, BahireHasab.EvangelistOf(year));
    }

    [Fact]
    public void YearOfLuke_IsAlwaysTheLeapYear()
    {
        // "The year of Luke is the Ethiopian Leap year."
        for (int year = 1890; year <= 2100; year++)
            Assert.Equal(BahireHasab.EvangelistOf(year) == Evangelist.Luke, EthiopianDate.IsLeapYear(year));
    }
}
