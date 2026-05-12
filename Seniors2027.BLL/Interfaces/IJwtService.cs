using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Interfaces;

public interface IJwtService
{
    string CreateToken(User user);
}
