using System.Text;
using System.Text.Json;

namespace Seniors2027.API.Services;

public static class AnnouncementPollParser
{
    private const string PollMarkerPrefix = "[[SENIORS2027_POLL::";
    private const string PollMarkerSuffix = "]]";

    public static ParsedAnnouncementPollResult Parse(string? rawBody)
    {
        var source = rawBody ?? string.Empty;
        var markerStart = source.LastIndexOf(PollMarkerPrefix, StringComparison.Ordinal);
        var markerEnd = source.LastIndexOf(PollMarkerSuffix, StringComparison.Ordinal);

        if (markerStart < 0 || markerEnd < 0 || markerEnd < markerStart)
        {
            return new ParsedAnnouncementPollResult
            {
                Body = source,
                Poll = null
            };
        }

        var encodedPayload = source
            .Substring(markerStart + PollMarkerPrefix.Length, markerEnd - (markerStart + PollMarkerPrefix.Length))
            .Trim();
        var body = source[..markerStart].TrimEnd();

        if (string.IsNullOrWhiteSpace(encodedPayload))
        {
            return new ParsedAnnouncementPollResult
            {
                Body = body,
                Poll = null
            };
        }

        string decodedPayload;
        try
        {
            var bytes = Convert.FromBase64String(encodedPayload);
            decodedPayload = Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return new ParsedAnnouncementPollResult
            {
                Body = body,
                Poll = null
            };
        }

        try
        {
            using var document = JsonDocument.Parse(decodedPayload);
            var root = document.RootElement;
            if (!root.TryGetProperty("question", out var questionElement) || questionElement.ValueKind != JsonValueKind.String)
            {
                return new ParsedAnnouncementPollResult
                {
                    Body = body,
                    Poll = null
                };
            }

            if (!root.TryGetProperty("options", out var optionsElement) || optionsElement.ValueKind != JsonValueKind.Array)
            {
                return new ParsedAnnouncementPollResult
                {
                    Body = body,
                    Poll = null
                };
            }

            var question = NormalizeSingleLine(questionElement.GetString());
            if (string.IsNullOrWhiteSpace(question))
            {
                return new ParsedAnnouncementPollResult
                {
                    Body = body,
                    Poll = null
                };
            }

            var options = new List<string>();
            var duplicateGuard = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var optionElement in optionsElement.EnumerateArray())
            {
                if (optionElement.ValueKind != JsonValueKind.String) continue;
                var option = NormalizeSingleLine(optionElement.GetString());
                if (string.IsNullOrWhiteSpace(option)) continue;
                if (!duplicateGuard.Add(option)) continue;
                options.Add(option);
            }

            if (options.Count < 2)
            {
                return new ParsedAnnouncementPollResult
                {
                    Body = body,
                    Poll = null
                };
            }

            return new ParsedAnnouncementPollResult
            {
                Body = body,
                Poll = new ParsedAnnouncementPollDefinition
                {
                    Question = question,
                    Options = options
                }
            };
        }
        catch
        {
            return new ParsedAnnouncementPollResult
            {
                Body = body,
                Poll = null
            };
        }
    }

    private static string NormalizeSingleLine(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).Trim();
    }
}

public sealed class ParsedAnnouncementPollResult
{
    public string Body { get; init; } = string.Empty;
    public ParsedAnnouncementPollDefinition? Poll { get; init; }
}

public sealed class ParsedAnnouncementPollDefinition
{
    public string Question { get; init; } = string.Empty;
    public IReadOnlyList<string> Options { get; init; } = Array.Empty<string>();
}
