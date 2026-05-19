using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Interfaces;

public interface IJoinRequestService
{
    Task<JoinRequestDto> EnsurePendingRequestAsync(string email);
    Task<IReadOnlyList<JoinRequestDto>> GetJoinRequestsAsync(JoinRequestStatus? status = null);
    Task<JoinRequestDto> ReviewJoinRequestAsync(int requestId, JoinRequestDecision decision, int reviewerUserId);
}
