using Seniors2027.DAL.Data;
using Seniors2027.DAL.Interfaces;

namespace Seniors2027.DAL.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private Dictionary<string, object>? _repositories;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IGenericRepository<T> Repository<T>() where T : class
    {
        _repositories ??= [];

        var type = typeof(T).Name;

        if (!_repositories.TryGetValue(type, out var repository))
        {
            var repositoryType = typeof(GenericRepository<>);
            var repositoryInstance = Activator.CreateInstance(repositoryType.MakeGenericType(typeof(T)), _context)!;

            _repositories[type] = repositoryInstance;
            repository = repositoryInstance;
        }

        return (IGenericRepository<T>)repository;
    }

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
