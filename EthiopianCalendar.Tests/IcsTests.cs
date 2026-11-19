using System.Text;
using EthiopianCalendar.Core;
using EthiopianCalendar.Core.Ics;

namespace EthiopianCalendar.Tests;

public class IcsWriterTests
{
    private static string Unfold(string folded) => folded.Replace("\r\n ", "").TrimEnd('\r', '\n');

    private static IEnumerable<string> PhysicalLines(string ics) =>
        ics.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);

    [Theory]
    [InlineData("Peter, Paul", "Peter\\, Paul")]
    [InlineData("a;b", "a\\;b")]
    [InlineData("back\\slash", "back\\\\slash")]
    [InlineData("line one\nline two", "line one\\nline two")]
    public void EscapeText_EscapesSpecialCharacters(string input, string expected)
    {
        Assert.Equal(expected, IcsWriter.EscapeText(input));
    }

    [Fact]
    public void Fold_LongAsciiLine_SplitsAt75BytesAndUnfoldsBack()
    {
        string line = "DESCRIPTION:" + new string('x', 200);

        string folded = IcsWriter.Fold(line);

        Assert.All(PhysicalLines(folded), l => Assert.True(Encoding.UTF8.GetByteCount(l) <= 75));
        Assert.StartsWith(" ", PhysicalLines(folded).ElementAt(1));
        Assert.Equal(line, Unfold(folded));
    }

    [Fact]
    public void Fold_GeezText_NeverSplitsACharacter()
    {
        // Ge'ez letters are 3 bytes each in UTF-8, so a byte-based fold can land mid-character.
        string line = "SUMMARY:" + string.Concat(Enumerable.Repeat("ጾመ ነቢያት ", 12));

        string folded = IcsWriter.Fold(line);

        Assert.All(PhysicalLines(folded), l =>
        {
            Assert.True(Encoding.UTF8.GetByteCount(l) <= 75);
            Assert.DoesNotContain('�', l); // no corrupted characters
        });
        Assert.Equal(line, Unfold(folded));
    }

    [Fact]
    public void Write_UsesCrlfAndExclusiveEndDates()
    {
        var genna = new CalendarEvent("genna-20270107@test", "Genna", new DateOnly(2027, 1, 7), new DateOnly(2027, 1, 7));

        string ics = IcsWriter.Write("Test", [genna], DateTimeOffset.UnixEpoch);

        Assert.DoesNotContain("\n", ics.Replace("\r\n", ""));      // every newline is CRLF
        Assert.Contains("DTSTART;VALUE=DATE:20270107\r\n", ics);
        Assert.Contains("DTEND;VALUE=DATE:20270108\r\n", ics);     // DTEND is the day after
        Assert.StartsWith("BEGIN:VCALENDAR\r\n", ics);
        Assert.EndsWith("END:VCALENDAR\r\n", ics);
    }
}

public class CalendarFeedTests
{
    private static IReadOnlyList<CalendarEvent> Feed() =>
        CalendarFeed.Events(2019, years: 1, siteUrl: "https://example.com");

    [Fact]
    public void Nebiyat_IsOneMultiDayEvent()
    {
        var nebiyat = Feed().Single(e => e.Uid.StartsWith("tsome-nebiyat-"));

        Assert.Equal(new DateOnly(2026, 11, 24), nebiyat.Start);
        Assert.Equal(new DateOnly(2027, 1, 6), nebiyat.EndInclusive);
        Assert.Equal("https://example.com/tsome-nebiyat", nebiyat.Url);
    }

    [Fact]
    public void AbiyTsom_AppearsOnce_AsTheFull55DayFast()
    {
        var abiyTsom = Assert.Single(Feed(), e => e.Uid.StartsWith("abiy-tsom-"));

        Assert.Equal(55, abiyTsom.EndInclusive.DayNumber - abiyTsom.Start.DayNumber + 1);
    }

    [Fact]
    public void Uids_AreUnique_AndStable()
    {
        var uids = Feed().Select(e => e.Uid).ToList();

        Assert.Equal(uids.Count, uids.Distinct().Count());
        Assert.Equal(uids, Feed().Select(e => e.Uid)); // same input, same UIDs
    }

    [Fact]
    public void WeeklyFasts_AreAlwaysIncluded_AndAreWednesdaysOrFridays()
    {
        var weekly = Feed().Where(e => e.Uid.StartsWith(FastingCalendar.WeeklyFastId + "-2")).ToList();

        Assert.True(weekly.Count > 50, $"only {weekly.Count} weekly fasts in a year");
        Assert.All(weekly, e => Assert.Contains(e.Start.DayOfWeek, new[] { DayOfWeek.Wednesday, DayOfWeek.Friday }));
    }

    [Fact]
    public void WeeklyFasts_SkipTheFiftyDaysAfterFasika()
    {
        // Fasika 2027 is May 2 and Paraclete is June 20: no Wednesday or Friday fasts in between.
        var fasika = new DateOnly(2027, 5, 2);
        var paraclete = new DateOnly(2027, 6, 20);

        Assert.DoesNotContain(Feed(), e =>
            e.Summary.EndsWith("fast (Tsome Dihnet)") && e.Start >= fasika && e.Start <= paraclete);
    }

    [Fact]
    public void WeeklyFasts_SkipGenna_WhenItFallsOnAWednesday()
    {
        // Genna 2026 (January 7) was a Wednesday. The feast overrides the weekly fast.
        var events = CalendarFeed.Events(2018, years: 1, siteUrl: "https://example.com");

        Assert.DoesNotContain(events, e => e.Summary.EndsWith("fast (Tsome Dihnet)") && e.Start == new DateOnly(2026, 1, 7));
    }
}
