using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;

namespace Seniors2027.BLL.Services;

public class JoinRequestService(IUnitOfWork unitOfWork) : IJoinRequestService
{
    private readonly IUnitOfWork _unitOfWork = unitOfWork;

    public async Task<JoinRequestDto> EnsurePendingRequestAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;

        var existingPendingRequest = _unitOfWork.Repository<JoinRequest>()
            .Find(x => x.Email.ToLower() == normalizedEmail && x.Status == JoinRequestStatus.Pending)
            .OrderByDescending(x => x.RequestedAt)
            .FirstOrDefault();

        JoinRequest request;
        if (existingPendingRequest == null)
        {
            request = new JoinRequest
            {
                Email = normalizedEmail,
                Status = JoinRequestStatus.Pending,
                RequestedAt = now
            };
            await _unitOfWork.Repository<JoinRequest>().AddAsync(request);
        }
        else
        {
            request = existingPendingRequest;
            request.RequestedAt = now;
            _unitOfWork.Repository<JoinRequest>().Update(request);
        }

        await _unitOfWork.CompleteAsync();
        return MapToDto(request);
    }

    public Task<IReadOnlyList<JoinRequestDto>> GetJoinRequestsAsync(JoinRequestStatus? status = null)
    {
        var query = _unitOfWork.Repository<JoinRequest>()
            .Find(x => !status.HasValue || x.Status == status.Value)
            .OrderByDescending(x => x.RequestedAt)
            .ToList();

        var items = new List<JoinRequestDto>(query.Count);
        foreach (var item in query)
        {
            items.Add(MapToDto(item));
        }

        return Task.FromResult<IReadOnlyList<JoinRequestDto>>(items);
    }

    public async Task<JoinRequestDto> ReviewJoinRequestAsync(int requestId, JoinRequestDecision decision, int reviewerUserId)
    {
        var reviewer = _unitOfWork.Repository<User>().Find(x => x.Id == reviewerUserId).FirstOrDefault();
        if (reviewer == null)
        {
            throw new Exception("Reviewer account was not found.");
        }

        if (reviewer.Role != UserRole.Admin)
        {
            throw new Exception("Only admins can review join requests.");
        }

        var request = _unitOfWork.Repository<JoinRequest>()
            .Find(x => x.Id == requestId)
            .FirstOrDefault();

        if (request == null)
        {
            throw new Exception("Join request was not found.");
        }

        if (request.Status != JoinRequestStatus.Pending)
        {
            throw new Exception("This join request has already been reviewed.");
        }

        request.ReviewedAt = DateTime.UtcNow;
        request.ReviewedByUserId = reviewerUserId;

        if (decision == JoinRequestDecision.Accept)
        {
            request.Status = JoinRequestStatus.Accepted;

            var existingUser = _unitOfWork.Repository<User>()
                .Find(x => x.Email.ToLower() == request.Email.ToLower())
                .FirstOrDefault();

            if (existingUser == null)
            {
                existingUser = new User
                {
                    Email = request.Email.ToLower(),
                    Username = string.Empty,
                    Gender = Gender.Unknown,
                    PhotoUrl = null,
                    Description = null,
                    Role = UserRole.Member,
                    IsLocked = false,
                    LockedAtUtc = null
                };

                await _unitOfWork.Repository<User>().AddAsync(existingUser);
                await _unitOfWork.CompleteAsync();
            }

            request.ApprovedUserId = existingUser.Id;
        }
        else
        {
            request.Status = JoinRequestStatus.Declined;
        }

        _unitOfWork.Repository<JoinRequest>().Update(request);
        await _unitOfWork.CompleteAsync();

        return MapToDto(request);
    }

    private static JoinRequestDto MapToDto(JoinRequest request)
    {
        return new JoinRequestDto
        {
            Id = request.Id,
            Name = BuildRequestDisplayName(request.Email),
            Email = request.Email,
            Status = request.Status,
            RequestedAt = request.RequestedAt
        };
    }

    private static string BuildRequestDisplayName(string email)
    {
        var localPart = email.Split('@')[0];
        if (string.IsNullOrWhiteSpace(localPart))
        {
            return "Unknown";
        }

        var normalized = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ');
        var words = normalized
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => char.ToUpperInvariant(x[0]) + x[1..].ToLowerInvariant());

        var displayName = string.Join(' ', words).Trim();
        return string.IsNullOrWhiteSpace(displayName) ? "Unknown" : displayName;
    }
}
