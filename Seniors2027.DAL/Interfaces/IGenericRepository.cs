using System.Linq.Expressions;

namespace Seniors2027.DAL.Interfaces;

public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(object id);
    Task<IEnumerable<T>> GetAllAsync();
    IEnumerable<T> Find(Expression<Func<T, bool>> expression);
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
}
