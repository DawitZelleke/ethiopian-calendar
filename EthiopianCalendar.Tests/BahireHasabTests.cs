using EthiopianCalendar.Core;

namespace EthiopianCalendar.Tests;

public class BahireHasabTests
{
    [Fact]
    public void Compute_2018_MatchesSpecWorkedExample()
    {
        var result = BahireHasab.Compute(2018);

        Assert.Equal(7518, result.AmeteAlem);
        Assert.Equal(12, result.Wenber);
        Assert.Equal(18, result.Metqi);
        Assert.Equal(new EthiopianDate(2018, 1, 18), result.BealeMetqi);
        Assert.Equal(7, result.Tewsak);
        Assert.Equal(new EthiopianDate(2018, 5, 25), result.Nineveh);
    }

    // Published Fasika dates (Gregorian). Ethiopian year = Gregorian year - 8 for spring dates.
    [Theory]
    [InlineData(2015, 4, 12)]
    [InlineData(2016, 5, 1)]
    [InlineData(2017, 4, 16)]
    [InlineData(2018, 4, 8)]
    [InlineData(2019, 4, 28)]
    [InlineData(2020, 4, 19)]
    [InlineData(2021, 5, 2)]
    [InlineData(2022, 4, 24)]
    [InlineData(2023, 4, 16)]
    [InlineData(2024, 5, 5)]
    [InlineData(2025, 4, 20)]
    [InlineData(2026, 4, 12)]
    [InlineData(2027, 5, 2)]
    [InlineData(2028, 4, 16)]
    [InlineData(2029, 4, 8)]
    [InlineData(2030, 4, 28)]
    [InlineData(1995, 4, 23)]   // Metqi = 0 year: the edge case
    public void Fasika_MatchesPublishedDate(int gy, int gm, int gd)
    {
        var fasika = BahireHasab.Fasika(gy - 8);

        Assert.Equal(new DateOnly(gy, gm, gd), fasika.ToGregorian());
    }

    [Fact]
    public void Compute_MetqiZeroYear_UsesThirty()
    {
        var result = BahireHasab.Compute(1987);

        Assert.Equal(0, result.Wenber);
        Assert.Equal(30, result.Metqi);
    }

    [Fact]
    public void Fasika_AgreesWithJulianComputus_From1900To2099()
    {
        // Two unrelated algorithms must agree for 200 years.
        for (int gregorianYear = 1900; gregorianYear <= 2099; gregorianYear++)
        {
            var expected = JulianComputus.OrthodoxEaster(gregorianYear);
            var actual = BahireHasab.Fasika(gregorianYear - 8).ToGregorian();

            Assert.True(expected == actual,
                $"{gregorianYear}: Bahire Hasab gave {actual}, Julian computus gave {expected}");
        }
    }

    [Fact]
    public void Nineveh_IsAlwaysMonday_AndFasikaAlwaysSunday()
    {
        for (int year = 1890; year <= 2100; year++)
        {
            var result = BahireHasab.Compute(year);

            Assert.Equal(DayOfWeek.Monday, result.Nineveh.DayOfWeek);
            Assert.Equal(DayOfWeek.Sunday, BahireHasab.Fasika(year).DayOfWeek);
        }
    }

    [Fact]
    public void MoveableObservances_2018_ContainsExpectedDates()
    {
        var observances = BahireHasab.MoveableObservances(2018);

        DateOnly Of(string prefix) =>
            observances.Single(o => o.Name.StartsWith(prefix)).Date.ToGregorian();

        Assert.Equal(new DateOnly(2026, 2, 2), Of("Tsome Nenewe"));
        Assert.Equal(new DateOnly(2026, 2, 16), Of("Abiy Tsom"));
        Assert.Equal(new DateOnly(2026, 4, 10), Of("Siklet"));
        Assert.Equal(new DateOnly(2026, 4, 12), Of("Fasika"));
        Assert.Equal(new DateOnly(2026, 5, 21), Of("Erget"));
        Assert.Equal(new DateOnly(2026, 5, 31), Of("Paraclete"));
    }
}

/// <summary>
/// Independent check: Meeus' Julian-calendar Easter algorithm, shifted to Gregorian.
/// The 13-day Julian/Gregorian gap is valid from March 1900 to February 2100.
/// </summary>
internal static class JulianComputus
{
    public static DateOnly OrthodoxEaster(int year)
    {
        int a = year % 4;
        int b = year % 7;
        int c = year % 19;
        int d = (19 * c + 15) % 30;
        int e = (2 * a + 4 * b - d + 34) % 7;
        int month = (d + e + 114) / 31;
        int day = (d + e + 114) % 31 + 1;

        return new DateOnly(year, month, day).AddDays(13);
    }
}
