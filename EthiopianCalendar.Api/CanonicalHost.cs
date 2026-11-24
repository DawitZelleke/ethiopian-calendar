namespace EthiopianCalendar.Api;

/// <summary>
/// Sends every visitor to one address (e.g. 13thmonth.ca). Requests that arrive on another
/// host, such as thirteenthmonth.ca, a www. address or the old onrender.com address, get a
/// permanent redirect that keeps the path and query, so shared links and calendar
/// subscriptions keep working.
///
/// Off unless the CanonicalHost setting is set, so it can't redirect visitors to a
/// domain that isn't connected yet. The health check and local development are never redirected.
/// </summary>
public static class CanonicalHost
{
    public static IApplicationBuilder UseCanonicalHost(this IApplicationBuilder app, string? canonicalHost)
    {
        if (string.IsNullOrWhiteSpace(canonicalHost))
            return app;

        return app.Use(async (context, next) =>
        {
            var request = context.Request;
            string host = request.Host.Host;

            bool isLocal = host is "localhost" or "127.0.0.1";
            bool isHealthCheck = request.Path.StartsWithSegments("/api/health");

            if (isLocal || isHealthCheck || string.Equals(host, canonicalHost, StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }

            context.Response.Redirect($"https://{canonicalHost}{request.PathBase}{request.Path}{request.QueryString}", permanent: true);
        });
    }
}
