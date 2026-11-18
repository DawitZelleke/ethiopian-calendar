using EthiopianCalendar.Core;

namespace EthiopianCalendar.Tests;

public class FastingCalendarTests
{
    private static EthiopianDate Eth(int gy, int gm, int gd) =>
        EthiopianDate.FromGregorian(new DateOnly(gy, gm, gd));

    // Genna is fixed to the Julian calendar, which drifts against the Gregorian one.
    // It falls on January 7 only from 1901 to 2100 (January 6 in 1900, January 8 from 2101).
    [Fact]
    public void Genna_IsAlwaysJanuary7_From1901To2100()
    {
        for (int gregorianYear = 1901; gregorianYear <= 2100; gregorianYear++)
        {
            var genna = FastingCalendar.Genna(gregorianYear - 8).ToGregorian();

            Assert.Equal(new DateOnly(gregorianYear, 1, 7), genna);
        }
    }

    [Fact]
    public void Genna_Was_January6_In1900_And_Is_January8_In2101()
    {
        Assert.Equal(new DateOnly(1900, 1, 6), FastingCalendar.Genna(1892).ToGregorian());
        Assert.Equal(new DateOnly(2101, 1, 8), FastingCalendar.Genna(2093).ToGregorian());
    }

    [Theory]
    [InlineData(2024, 1, 20)]   // the year after an Ethiopian leap year
    [InlineData(2025, 1, 19)]
    [InlineData(2026, 1, 19)]
    public void Timkat_FallsOnJanuary19Or20(int gy, int gm, int gd)
    {
        Assert.Equal(new DateOnly(gy, gm, gd), FastingCalendar.Timkat(gy - 8).ToGregorian());
    }

    [Theory]
    [InlineData(2026, 2, 4, "Tsome Nenewe")]     // Wednesday inside Nineveh
    [InlineData(2026, 3, 7, "Abiy Tsom")]        // Saturday inside Abiy Tsom: no exceptions
    [InlineData(2026, 3, 8, "Abiy Tsom")]        // Sunday inside Abiy Tsom: no exceptions
    [InlineData(2026, 4, 11, "Abiy Tsom")]       // the Saturday before Fasika is the last day
    [InlineData(2026, 1, 6, "Tsome Nebiyat")]    // the day before Genna
    [InlineData(2026, 1, 18, "Gehad of Timkat")] // a Sunday, but Gehad is still a fast
    [InlineData(2026, 6, 1, "Tsome Hawaryat")]   // Monday after Paraclete
    [InlineData(2026, 7, 11, "Tsome Hawaryat")]  // Hamle 4, the last day
    [InlineData(2026, 8, 10, "Tsome Filseta")]
    [InlineData(2025, 10, 1, "Wednesday and Friday")]
    public void FastDays_AreNamedCorrectly(int gy, int gm, int gd, string expectedPrefix)
    {
        var fasts = FastingCalendar.FastsOn(Eth(gy, gm, gd));

        Assert.Contains(fasts, name => name.StartsWith(expectedPrefix));
    }

    [Theory]
    [InlineData(2025, 10, 2)]   // an ordinary Thursday
    [InlineData(2026, 4, 12)]   // Fasika
    [InlineData(2026, 4, 15)]   // Wednesday in the fifty days after Fasika
    [InlineData(2026, 5, 29)]   // Friday in the fifty days after Fasika
    [InlineData(2026, 1, 7)]    // Genna on a Wednesday: the feast wins
    [InlineData(2029, 1, 19)]   // Timkat on a Friday: the feast wins
    [InlineData(2026, 7, 12)]   // Feast of Peter and Paul, the day after Hawaryat ends
    public void NonFastDays_AreNotFastDays(int gy, int gm, int gd)
    {
        Assert.False(FastingCalendar.IsFastDay(Eth(gy, gm, gd)));
    }

    [Fact]
    public void AbiyTsom_Is55Days_And_Nineveh_Is3Days_EveryYear()
    {
        for (int year = 1890; year <= 2100; year++)
        {
            var periods = FastingCalendar.FastPeriods(year);

            Assert.Equal(55, periods.Single(p => p.Name.StartsWith("Abiy Tsom")).LengthInDays);
            Assert.Equal(3, periods.Single(p => p.Name.StartsWith("Tsome Nenewe")).LengthInDays);
        }
    }

    [Fact]
    public void TsomeHawaryat_AlwaysHasAtLeastTwoWeeks()
    {
        for (int year = 1890; year <= 2100; year++)
        {
            var hawaryat = FastingCalendar.FastPeriods(year).Single(p => p.Name.StartsWith("Tsome Hawaryat"));

            Assert.True(hawaryat.LengthInDays >= 14, $"Year {year}: {hawaryat.LengthInDays} days");
        }
    }

    [Fact]
    public void FixedFeasts_2018_HaveExpectedGregorianDates()
    {
        var feasts = FastingCalendar.FixedFeasts(2018);

        DateOnly Of(string prefix) => feasts.Single(f => f.Name.StartsWith(prefix)).Date.ToGregorian();

        Assert.Equal(new DateOnly(2025, 9, 11), Of("Enkutatash"));
        Assert.Equal(new DateOnly(2025, 9, 27), Of("Meskel"));
        Assert.Equal(new DateOnly(2026, 1, 7), Of("Genna"));
        Assert.Equal(new DateOnly(2026, 1, 19), Of("Timkat"));
    }

    [Fact]
    public void HidarTsion_2019_IsNovember30_2026()
    {
        var hidarTsion = FastingCalendar.FixedFeasts(2019).Single(f => f.Id == "hidar-tsion");

        Assert.Equal(new DateOnly(2026, 11, 30), hidarTsion.Date.ToGregorian());
        Assert.Equal(ObservanceKind.SaintsDay, hidarTsion.Kind);
    }

    [Theory]
    [InlineData(2026, 11, 24, 1)]    // first day of Tsome Nebiyat
    [InlineData(2026, 11, 30, 7)]    // Hidar Tsion falls inside the fast
    [InlineData(2027, 1, 6, 44)]     // last day, the eve of Genna
    public void FastDaysOn_Nebiyat_ReportsDayXOf44(int gy, int gm, int gd, int expectedDay)
    {
        var fast = Assert.Single(FastingCalendar.FastDaysOn(Eth(gy, gm, gd)));

        Assert.Equal("tsome-nebiyat", fast.Id);
        Assert.Equal(expectedDay, fast.DayNumber);
        Assert.Equal(44, fast.TotalDays);
    }

    [Fact]
    public void FastDaysOn_WeeklyFast_IsDay1Of1()
    {
        var fast = Assert.Single(FastingCalendar.FastDaysOn(Eth(2025, 10, 1)));

        Assert.Equal(FastingCalendar.WeeklyFastId, fast.Id);
        Assert.Equal(1, fast.TotalDays);
    }

    [Fact]
    public void ObservanceIds_AreUniqueWithinAYear()
    {
        var ids = ChurchCalendar.Observances(2019).Select(o => o.Id).ToList();

        Assert.Equal(ids.Count, ids.Distinct().Count());
    }
}
