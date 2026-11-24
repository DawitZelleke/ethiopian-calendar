using EthiopianCalendar.Core;
using EthiopianCalendar.Core.Ics;

namespace EthiopianCalendar.Tests;

public class ParishTests
{
    private const string Profile = """
        {
          // comments are allowed
          "id": "test-parish",
          "name": "Test Parish",
          "nameAmharic": "ቤተ ክርስቲያን",
          "tabots": [
            { "id": "hidar-mikael", "saint": "St. Michael the Archangel", "saintAmharic": "ቅዱስ ሚካኤል",
              "occasion": "Hidar Mikael", "month": 3, "day": 12, "source": "test" }
          ]
        }
        """;

    [Fact]
    public void HidarMikael_2019_IsSaturdayNovember21_2026()
    {
        var parish = ParishProfile.FromJson(Profile);

        var tabot = Assert.Single(ParishCalendar.TabotDays(parish, 2019));

        Assert.Equal(new DateOnly(2026, 11, 21), tabot.Date.ToGregorian());
        Assert.Equal(ObservanceKind.Tabot, tabot.Kind);
        Assert.Equal("Hidar Mikael: St. Michael the Archangel tabot", tabot.Name);
    }

    [Fact]
    public void ObservancesOn_IncludesTheParishTabot_AlongsideUniversalFeasts()
    {
        var parish = ParishProfile.FromJson(Profile);

        var onHidarMikael = ParishCalendar.ObservancesOn(parish, new EthiopianDate(2019, 3, 12));
        var onHidarTsion = ParishCalendar.ObservancesOn(parish, new EthiopianDate(2019, 3, 21));

        Assert.Contains(onHidarMikael, o => o.Id == "hidar-mikael");
        Assert.Contains(onHidarTsion, o => o.Id == "hidar-tsion"); // universal feasts still there
    }

    [Theory]
    [InlineData("\"month\": 14, \"day\": 1", "is not a date that occurs every year")]
    [InlineData("\"month\": 13, \"day\": 6", "is not a date that occurs every year")] // Pagume 6: leap years only
    [InlineData("\"month\": 3, \"day\": 31", "is not a date that occurs every year")]
    public void FromJson_RejectsDatesThatDontOccurEveryYear(string date, string expectedMessage)
    {
        string json = Profile.Replace("\"month\": 3, \"day\": 12", date);

        var e = Assert.Throws<InvalidDataException>(() => ParishProfile.FromJson(json));

        Assert.Contains(expectedMessage, e.Message);
    }

    [Fact]
    public void FromJson_RequiresASourceForEveryTabotDay()
    {
        string json = Profile.Replace("\"source\": \"test\"", "\"source\": \"\"");

        var e = Assert.Throws<InvalidDataException>(() => ParishProfile.FromJson(json));

        Assert.Contains("needs a source", e.Message);
    }

    [Fact]
    public void ParishFeed_IncludesTabotDays_WithParishSpecificUids()
    {
        var parish = ParishProfile.FromJson(Profile);

        var events = CalendarFeed.Events(2019, years: 1, "https://example.com", parish);
        var tabot = Assert.Single(events, e => e.Summary.StartsWith("Hidar Mikael"));

        Assert.Equal(new DateOnly(2026, 11, 21), tabot.Start);
        Assert.StartsWith("test-parish-hidar-mikael-", tabot.Uid);
        Assert.Equal(events.Count, events.Select(e => e.Uid).Distinct().Count());
    }

    [Fact]
    public void EveryParishProfileInTheRepo_IsValid()
    {
        // Walk up from the test output folder to the repository root.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "parishes")))
            dir = dir.Parent;
        Assert.NotNull(dir);

        var files = Directory.GetFiles(Path.Combine(dir.FullName, "parishes"), "*.json");
        Assert.NotEmpty(files);

        foreach (var file in files)
        {
            var parish = ParishProfile.Load(file);
            Assert.Equal(Path.GetFileNameWithoutExtension(file), parish.Id); // file name matches id
        }
    }
}
