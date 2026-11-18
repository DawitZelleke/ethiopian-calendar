using EthiopianCalendar.Core;

namespace EthiopianCalendar.Tests;

public class EthiopianDateTests
{
    [Theory]
    [InlineData(2019, 1, 1, 2026, 9, 11)]   // New Year, normal year
    [InlineData(2016, 1, 1, 2023, 9, 12)]   // New Year before a Gregorian leap year
    [InlineData(2018, 5, 25, 2026, 2, 2)]   // Nineveh 2018 (spec worked example)
    [InlineData(2019, 4, 29, 2027, 1, 7)]   // Genna 2019
    [InlineData(2019, 13, 6, 2027, 9, 11)]  // Pagume 6, the leap day
    public void ToGregorian_ReturnsKnownDate(int ey, int em, int ed, int gy, int gm, int gd)
    {
        var ethiopian = new EthiopianDate(ey, em, ed);

        Assert.Equal(new DateOnly(gy, gm, gd), ethiopian.ToGregorian());
    }

    [Theory]
    [InlineData(2026, 9, 11, 2019, 1, 1)]
    [InlineData(2027, 9, 11, 2019, 13, 6)]
    [InlineData(2027, 9, 12, 2020, 1, 1)]   // the day after the leap day is New Year
    [InlineData(2026, 4, 12, 2018, 8, 4)]   // Fasika 2026 = Miyazya 4
    public void FromGregorian_ReturnsKnownDate(int gy, int gm, int gd, int ey, int em, int ed)
    {
        var result = EthiopianDate.FromGregorian(new DateOnly(gy, gm, gd));

        Assert.Equal(new EthiopianDate(ey, em, ed), result);
    }

    [Fact]
    public void RoundTrip_EveryDayFrom1900To2100_ReturnsSameDate()
    {
        var start = new DateOnly(1900, 1, 1);
        var end = new DateOnly(2100, 12, 31);

        for (var day = start; day <= end; day = day.AddDays(1))
        {
            var ethiopian = EthiopianDate.FromGregorian(day);
            Assert.Equal(day, ethiopian.ToGregorian());
        }
    }

    [Theory]
    [InlineData(2015, true)]
    [InlineData(2019, true)]
    [InlineData(2016, false)]
    [InlineData(2018, false)]
    public void IsLeapYear_FollowsYearMod4Equals3(int year, bool expected)
    {
        Assert.Equal(expected, EthiopianDate.IsLeapYear(year));
    }

    [Fact]
    public void Pagume6_IsRejected_InNonLeapYear()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new EthiopianDate(2018, 13, 6));
    }

    [Fact]
    public void Pagume6_IsAllowed_InLeapYear()
    {
        var date = new EthiopianDate(2019, 13, 6); // 2019 % 4 == 3, so it's a leap year

        Assert.Equal(6, date.Day);
    }

    [Theory]
    [InlineData(2019, 0, 1)]    // month 0 doesn't exist
    [InlineData(2019, 14, 1)]   // there is no month 14
    [InlineData(2019, 1, 31)]   // every regular month has 30 days
    [InlineData(2019, 1, 0)]    // day 0 doesn't exist
    [InlineData(0, 1, 1)]       // year 0 doesn't exist
    public void InvalidDates_AreRejected(int year, int month, int day)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new EthiopianDate(year, month, day));
    }

    [Fact]
    public void ToString_UsesMonthName()
    {
        Assert.Equal("Meskerem 1, 2019", new EthiopianDate(2019, 1, 1).ToString());
    }
}
