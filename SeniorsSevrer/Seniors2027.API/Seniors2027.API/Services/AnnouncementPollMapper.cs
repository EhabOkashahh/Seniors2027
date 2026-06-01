using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Services;

public static class AnnouncementPollMapper
{
    public static AnnouncementDto ToAnnouncementDto(
        Announcement announcement,
        IReadOnlyList<AnnouncementPollVote> votes,
        int? currentUserId = null)
    {
        var parsed = AnnouncementPollParser.Parse(announcement.Body);
        var poll = BuildPollDto(parsed.Poll, votes, currentUserId);

        return new AnnouncementDto
        {
            Id = announcement.Id,
            Title = announcement.Title,
            Body = parsed.Body,
            PhotoUrl = NormalizePhotoUrl(announcement.PhotoUrl),
            CreatedAt = announcement.CreatedAt,
            CreatedByUsername = announcement.CreatedByUser.Username,
            Poll = poll
        };
    }

    private static AnnouncementPollDto? BuildPollDto(
        ParsedAnnouncementPollDefinition? parsedPoll,
        IReadOnlyList<AnnouncementPollVote> votes,
        int? currentUserId)
    {
        if (parsedPoll == null) return null;

        var optionDtos = new List<AnnouncementPollOptionDto>(parsedPoll.Options.Count);

        var votesByOption = votes
            .GroupBy(v => v.Option, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderBy(v => v.User.Username, StringComparer.OrdinalIgnoreCase).ThenBy(v => v.UpdatedAt).ToList());

        foreach (var option in parsedPoll.Options)
        {
            var optionVotes = votesByOption.TryGetValue(option, out var v) ? v : [];

            var voters = optionVotes
                .Select(voter => new AnnouncementPollVoterDto
                {
                    Username = voter.User.Username,
                    PhotoUrl = NormalizePhotoUrl(voter.User.PhotoUrl),
                    VotedAt = voter.UpdatedAt,
                    IsCurrentUser = currentUserId.HasValue && voter.UserId == currentUserId.Value
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
