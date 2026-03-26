using DocSpec.Annotations;

namespace DocSpec.Examples.CSharpMinimal;

/// <summary>
/// Tier 1 DocSpec example: minimal annotations in C#.
/// Demonstrates [DocModule] for grouping and [DocHidden] for excluding internals.
/// </summary>

/// <summary>
/// Service that manages file uploads and downloads from object storage.
/// </summary>
[DocModule("csharp-minimal", Name = "Storage Service", Description = "Manages file uploads, downloads, and metadata in object storage")]
public class StorageService
{
    private readonly string _bucketName;
    private readonly Dictionary<string, FileMetadata> _index = new();

    public StorageService(string bucketName)
    {
        _bucketName = bucketName;
    }

    /// <summary>
    /// Upload a file to object storage.
    /// </summary>
    /// <param name="key">The storage key (path) for the file.</param>
    /// <param name="content">The file content as a byte array.</param>
    /// <param name="contentType">The MIME type of the file.</param>
    /// <returns>Metadata about the stored file.</returns>
    public FileMetadata Upload(string key, byte[] content, string contentType = "application/octet-stream")
    {
        var normalized = NormalizeKey(key);
        var checksum = ComputeChecksum(content);

        var metadata = new FileMetadata
        {
            Key = normalized,
            Bucket = _bucketName,
            SizeBytes = content.Length,
            ContentType = contentType,
            Checksum = checksum,
            UploadedAt = DateTime.UtcNow
        };

        _index[normalized] = metadata;
        return metadata;
    }

    /// <summary>
    /// Download a file from object storage.
    /// </summary>
    /// <param name="key">The storage key of the file to download.</param>
    /// <returns>The file content as a byte array.</returns>
    /// <exception cref="KeyNotFoundException">Thrown when the key does not exist.</exception>
    public byte[] Download(string key)
    {
        var normalized = NormalizeKey(key);
        if (!_index.ContainsKey(normalized))
            throw new KeyNotFoundException($"File not found: {normalized}");

        return Array.Empty<byte>();
    }

    /// <summary>
    /// Retrieve metadata for a stored file.
    /// </summary>
    /// <param name="key">The storage key of the file.</param>
    /// <returns>The file metadata, or null if not found.</returns>
    public FileMetadata? GetMetadata(string key)
    {
        var normalized = NormalizeKey(key);
        return _index.GetValueOrDefault(normalized);
    }

    /// <summary>
    /// Delete a file from object storage.
    /// </summary>
    /// <param name="key">The storage key of the file to delete.</param>
    /// <returns>True if the file was deleted, false if it did not exist.</returns>
    public bool Delete(string key)
    {
        var normalized = NormalizeKey(key);
        return _index.Remove(normalized);
    }

    /// <summary>
    /// List all file keys in the bucket with an optional prefix filter.
    /// </summary>
    /// <param name="prefix">Optional prefix to filter keys.</param>
    /// <returns>An enumerable of matching file keys.</returns>
    public IEnumerable<string> ListKeys(string? prefix = null)
    {
        var keys = _index.Keys.AsEnumerable();
        if (prefix is not null)
            keys = keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal));
        return keys.OrderBy(k => k);
    }

    [DocHidden]
    private string NormalizeKey(string key)
    {
        return key.TrimStart('/').Replace("//", "/");
    }

    [DocHidden]
    private string ComputeChecksum(byte[] data)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var hash = sha.ComputeHash(data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    [DocHidden]
    private void EvictExpiredEntries()
    {
        // Internal cache maintenance — not part of the public API
    }
}

/// <summary>
/// Metadata describing a stored file.
/// </summary>
public class FileMetadata
{
    /// <summary>The storage key (path) of the file.</summary>
    public required string Key { get; set; }

    /// <summary>The bucket name where the file is stored.</summary>
    public required string Bucket { get; set; }

    /// <summary>The file size in bytes.</summary>
    public long SizeBytes { get; set; }

    /// <summary>The MIME content type of the file.</summary>
    public required string ContentType { get; set; }

    /// <summary>SHA-256 checksum of the file content.</summary>
    public required string Checksum { get; set; }

    /// <summary>When the file was uploaded.</summary>
    public DateTime UploadedAt { get; set; }
}
