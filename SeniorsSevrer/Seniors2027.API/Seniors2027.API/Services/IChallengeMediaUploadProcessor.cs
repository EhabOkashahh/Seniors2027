using Microsoft.AspNetCore.Http;

namespace Seniors2027.API.Services;

public interface IChallengeMediaUploadProcessor
{
    Task<string> SaveChallengeMediaAsync(
        IFormFile file,
        string expectedUploadType,
        CancellationToken cancellationToken = default);
}
