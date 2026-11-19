using System.Text;

namespace EthiopianCalendar.Core.Ics;

/// <summary>An all-day calendar event. EndInclusive is the last day it covers.</summary>
public sealed record CalendarEvent(
    string Uid,
    string Summary,
    DateOnly Start,
    DateOnly EndInclusive,
    string? Description = null,
    string? Url = null);

/// <summary>
/// Writes iCalendar (RFC 5545) files: the format Google, Apple and Outlook calendars subscribe to.
/// The format is strict about three things this class handles:
///   1. Lines end with CRLF, not just LF.
///   2. Lines longer than 75 bytes (not characters) are folded onto the next line, which starts with a space.
///   3. Commas, semicolons, backslashes and newlines in text must be escaped.
/// </summary>
public static class IcsWriter
{
    private const int MaxLineBytes = 75;

    public static string Write(string calendarName, IEnumerable<CalendarEvent> events, DateTimeOffset generatedAt)
    {
        var lines = new List<string>
        {
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//DawitZelleke//Ethiopian Calendar Engine//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            $"X-WR-CALNAME:{EscapeText(calendarName)}",
            // Ask calendar apps to check for updates once a day.
            "REFRESH-INTERVAL;VALUE=DURATION:P1D",
            "X-PUBLISHED-TTL:P1D",
        };

        string stamp = generatedAt.UtcDateTime.ToString("yyyyMMdd'T'HHmmss'Z'");

        foreach (var e in events)
        {
            lines.Add("BEGIN:VEVENT");
            lines.Add($"UID:{e.Uid}");
            lines.Add($"DTSTAMP:{stamp}");
            lines.Add($"DTSTART;VALUE=DATE:{FormatDate(e.Start)}");
            // DTEND is exclusive in iCalendar: a one-day event on Jan 7 ends on Jan 8.
            lines.Add($"DTEND;VALUE=DATE:{FormatDate(e.EndInclusive.AddDays(1))}");
            lines.Add($"SUMMARY:{EscapeText(e.Summary)}");
            if (e.Description is not null)
                lines.Add($"DESCRIPTION:{EscapeText(e.Description)}");
            if (e.Url is not null)
                lines.Add($"URL:{e.Url}");
            // All-day observances shouldn't block time in anyone's schedule.
            lines.Add("TRANSP:TRANSPARENT");
            lines.Add("END:VEVENT");
        }

        lines.Add("END:VCALENDAR");

        var output = new StringBuilder();
        foreach (var line in lines)
            output.Append(Fold(line));
        return output.ToString();
    }

    public static string FormatDate(DateOnly date) => date.ToString("yyyyMMdd");

    /// <summary>Escapes TEXT values: backslash, semicolon, comma and newline.</summary>
    public static string EscapeText(string text) => text
        .Replace("\\", "\\\\")
        .Replace(";", "\\;")
        .Replace(",", "\\,")
        .Replace("\r\n", "\\n")
        .Replace("\n", "\\n");

    /// <summary>
    /// Folds a line to at most 75 bytes per physical line, ending each with CRLF.
    /// Continuation lines start with a space, which counts toward their 75 bytes.
    /// Folding happens between characters, never inside one: Ge'ez letters are
    /// 3 bytes in UTF-8, and splitting one would corrupt the text.
    /// </summary>
    public static string Fold(string line)
    {
        var output = new StringBuilder();
        int lineBytes = 0;

        foreach (var rune in line.EnumerateRunes())
        {
            int size = rune.Utf8SequenceLength;
            if (lineBytes + size > MaxLineBytes)
            {
                output.Append("\r\n ");
                lineBytes = 1; // the leading space
            }

            output.Append(rune.ToString());
            lineBytes += size;
        }

        return output.Append("\r\n").ToString();
    }
}
