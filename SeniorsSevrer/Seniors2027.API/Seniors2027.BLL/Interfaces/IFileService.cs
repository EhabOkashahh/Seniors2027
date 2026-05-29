namespace Seniors2027.BLL.Interfaces;

public interface IFileService
{
    void DeleteFileIfExists(string absolutePath);
    string GetChallengeMediaDirectory();
}
