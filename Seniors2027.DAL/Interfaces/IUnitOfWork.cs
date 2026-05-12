namespace Seniors2027.DAL.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IGenericRepository<T> Repository<T>() where T : class;
    Task<int> CompleteAsync();
}
