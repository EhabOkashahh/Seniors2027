using System.Text.Json;
using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Services;

public static class ChallengeMapper
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static ChallengeDto ToChallengeDto(Challenge challenge)
    {
        return new ChallengeDto
        {
            Id = challenge.Id,
            Type = string.IsNullOrWhiteSpace(challenge.Type) ? "tiktok" : challenge.Type,
            CreatedAt = challenge.CreatedAt,
            TitleSvgDataUrl = challenge.TitleSvgDataUrl,
            Description = challenge.Description,
            Mode = challenge.Mode,
            StartDateUtc = challenge.StartDateUtc,
            EndDateUtc = challenge.EndDateUtc,
            IsBroadcasted = challenge.IsBroadcasted,
            RedirectAction = DeserializeOrFallback(challenge.RedirectActionJson, Array.Empty<ChallengeRedirectActionItemDto>()),
            AttachmentButtons = DeserializeOrFallback(challenge.AttachmentButtonsJson, Array.Empty<ChallengeAttachmentButtonDto>()),
            QuizAction = string.IsNullOrWhiteSpace(challenge.QuizActionJson)
                ? null
                : DeserializeOrFallback<ChallengeQuizActionDto?>(challenge.QuizActionJson, null)
        };
    }

    public static Challenge ToChallengeEntity(CreateChallengeDto dto)
    {
        return new Challenge
        {
            Type = NormalizeType(dto.Type),
            Mode = dto.Mode,
            TitleSvgDataUrl = dto.TitleSvgDataUrl,
            Description = dto.Description,
            StartDateUtc = dto.StartDateUtc,
            EndDateUtc = dto.EndDateUtc,
            IsBroadcasted = dto.IsBroadcasted,
            RedirectActionJson = JsonSerializer.Serialize(dto.RedirectAction ?? Array.Empty<ChallengeRedirectActionItemDto>(), JsonOptions),
            AttachmentButtonsJson = JsonSerializer.Serialize(dto.AttachmentButtons ?? Array.Empty<ChallengeAttachmentButtonDto>(), JsonOptions),
            QuizActionJson = dto.QuizAction == null ? null : JsonSerializer.Serialize(dto.QuizAction, JsonOptions),
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string NormalizeType(string? type)
    {
        var trimmed = type?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? "tiktok" : trimmed;
    }

    private static T DeserializeOrFallback<T>(string? json, T fallback)
    {
        if (string.IsNullOrWhiteSpace(json)) return fallback;
        try
        {
            var parsed = JsonSerializer.Deserialize<T>(json, JsonOptions);
            return parsed ?? fallback;
        }
        catch
        {
            return fallback;
        }
    }
}
