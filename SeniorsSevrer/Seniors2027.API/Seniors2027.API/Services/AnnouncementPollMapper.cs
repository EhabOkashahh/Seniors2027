using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Services;

public static class AnnouncementPollMapper
{
    public static AnnouncementDto ToAnnouncementDto(
        Announcement announcement,
        IReadOnlyList<AnnouncementPollVote> votes)
    {
        var parsed = AnnouncementPollParser.Parse(announcement.Body);
        var poll = BuildPollDto(parsed.Poll, votes);

        return new AnnouncementDto
        {
            Id = announcement.Id,
            Title = announcement.Title,
            Body = parsed.Body,
            PhotoUrl = NormalizePhotoUrl(announcement.PhotoUrl),
            CreatedAt = announcement.CreatedAt,
            CreatedByUserId = announcement.CreatedByUserId,
            CreatedByUsername = announcement.CreatedByUser.Username,
            Poll = poll
        };
    }

    private static AnnouncementPollDto? BuildPollDto(
        ParsedAnnouncementPollDefinition? parsedPoll,
        IReadOnlyList<AnnouncementPollVote> votes)
    {
        if (parsedPoll == null) return null;

        var optionDtos = new List<AnnouncementPollOptionDto>(parsedPoll.Options.Count);
        foreach (var option in parsedPoll.Options)
        {
            var optionVotes = votes
                .Where(v => string.Equals(v.Option, option, StringComparison.OrdinalIgnoreCase))
                .OrderBy(v => v.User.Username, StringComparer.OrdinalIgnoreCase)
                .ThenBy(v => v.UserId)
                .ToList();

            var voters = optionVotes
                .Select(v => new AnnouncementPollVoterDto
                {
                    UserId = v.UserId,
                    Username = v.User.Username,
                    PhotoUrl = NormalizePhotoUrl(v.User.PhotoUrl)
                })
                .ToList();

            optionDtos.Add(new AnnouncementPollOptionDto
            {
                Label = option,
                VoteCount = voters.Count,
                Voters = voters
            });
        }

        return new AnnouncementPollDto
        {
            Question = parsedPoll.Question,
            Options = optionDtos
        };
    }

    private static string? NormalizePhotoUrl(string? photoUrl)
    {
        if (string.IsNullOrWhiteSpace(photoUrl)) return null;
        return photoUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ? null : photoUrl;
    }
}
