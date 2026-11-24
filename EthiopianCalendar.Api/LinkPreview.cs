using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using System.Text.RegularExpressions;
using EthiopianCalendar.Core;

namespace EthiopianCalendar.Api;

/// <summary>
/// Link previews for shared pages. WhatsApp, iMessage, Instagram and search engines read
/// the HTML's title and Open Graph tags without running JavaScript, so a React page alone
/// would always preview as the generic home page. For each fast and feast page, the server
/// rewrites those tags in index.html before sending it.
/// </summary>
public static partial class LinkPreview
{
    public const string SiteName = "13th Month";

    // Escapes <, >, ", ' and & but leaves readable text (·, Ge'ez letters) as is.
    private static readonly HtmlEncoder Encoder = HtmlEncoder.Create(UnicodeRanges.All);

    public sealed record Preview(string Title, string Description, string Url);

    /// <summary>The preview for an observance page, or null if the id isn't a known fast or feast.</summary>
    public static Preview? For(string id, EthiopianDate today, string siteUrl)
    {
        var o = ChurchCalendar.NextOccurrence(id, today);
        if (o is null)
            return null;

        string description;
        if (o.IsInProgressOn(today) && o.LengthInDays > 1)
        {
            int day = today.ToJulianDayNumber() - o.Start.ToJulianDayNumber() + 1;
            description = $"Happening now: day {day} of {o.LengthInDays}, until {Format(o.End)}.";
        }
        else if (o.IsInProgressOn(today))
        {
            description = $"Today, {o.Start}.";
        }
        else if (o.LengthInDays > 1)
        {
            description = $"Begins {Format(o.Start)} · {o.LengthInDays} days.";
        }
        else
        {
            description = $"{Format(o.Start)} ({o.Start}).";
        }

        return new Preview(
            Title: $"{o.Name} · {SiteName}",
            Description: $"{description} Computed with Bahire Hasab.",
            Url: $"{siteUrl}/{id}");
    }

    /// <summary>
    /// Rewrites the title, description and Open Graph tags in index.html.
    /// Every value is HTML-encoded: text placed into HTML must never be able to close
    /// the tag it sits in, even when it comes from our own data.
    /// </summary>
    public static string Apply(string html, Preview preview)
    {
        string title = Encoder.Encode(preview.Title);
        string description = Encoder.Encode(preview.Description);
        string url = Encoder.Encode(preview.Url);

        // MatchEvaluators (not replacement strings), so a "$" in the text can't be read as a regex substitution.
        html = TitleTag().Replace(html, _ => $"<title>{title}</title>", 1);
        html = MetaContent("name", "description").Replace(html, m => m.Groups["before"].Value + description + "\"", 1);
        html = MetaContent("property", "og:title").Replace(html, m => m.Groups["before"].Value + title + "\"", 1);
        html = MetaContent("property", "og:description").Replace(html, m => m.Groups["before"].Value + description + "\"", 1);

        return html.Replace("</head>", $"    <meta property=\"og:url\" content=\"{url}\" />\n  </head>");
    }

    private static string Format(EthiopianDate date) =>
        date.ToGregorian().ToString("dddd, MMMM d, yyyy", CultureInfo.InvariantCulture);

    [GeneratedRegex("<title>.*?</title>", RegexOptions.Singleline)]
    private static partial Regex TitleTag();

    private static Regex MetaContent(string attribute, string name) =>
        new($"(?<before><meta {attribute}=\"{Regex.Escape(name)}\" content=\")[^\"]*\"");
}
