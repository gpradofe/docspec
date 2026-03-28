// @docspec:module {
//   id: "docspec-csharp-datastore-extractor",
//   name: "Data Store Extractor",
//   description: "Detects EF Core DbContext/DbSet, IDistributedCache, IMemoryCache, and StackExchange.Redis usage to populate the data stores section.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects data store usage in .NET projects:
/// <list type="bullet">
///   <item>EF Core <c>DbContext</c> subclasses and <c>DbSet&lt;T&gt;</c> properties (RDBMS)</item>
///   <item><c>IDistributedCache</c> / <c>IMemoryCache</c> usage (cache)</item>
///   <item>StackExchange.Redis <c>IConnectionMultiplexer</c> / <c>IDatabase</c> (Redis)</item>
///   <item>MassTransit / RabbitMQ / Azure Service Bus patterns (message broker)</item>
/// </list>
/// Populates the data stores section of the DocSpec output.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Auto-detect data store types from referenced assemblies and field/property types")]
public class DataStoreExtractor : IDocSpecExtractor
{
    private const string DbContextType = "Microsoft.EntityFrameworkCore.DbContext";
    private const string DbSetType = "Microsoft.EntityFrameworkCore.DbSet`1";
    private const string IDistributedCache = "Microsoft.Extensions.Caching.Distributed.IDistributedCache";
    private const string IMemoryCache = "Microsoft.Extensions.Caching.Memory.IMemoryCache";
    private const string RedisConnectionMultiplexer = "StackExchange.Redis.IConnectionMultiplexer";
    private const string RedisDatabase = "StackExchange.Redis.IDatabase";

    public string ExtractorName => "data-store";

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        return compilation.GetTypeByMetadataName(DbContextType) is not null
            || compilation.GetTypeByMetadataName(IDistributedCache) is not null;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Detect DbContext subclasses, cache, and Redis field types to populate data stores")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        // Check if type extends DbContext
        if (IsDbContext(type))
        {
            ExtractDbContextTables(type, output);
            return;
        }

        // Check fields/properties/constructor params for data store types
        bool hasCache = false;
        bool hasRedis = false;

        foreach (var member in type.GetMembers())
        {
            ITypeSymbol? memberType = member switch
            {
                IFieldSymbol f => f.Type,
                IPropertySymbol p => p.Type,
                _ => null
            };

            if (memberType is null) continue;
            string memberTypeName = memberType.ToDisplayString();

            // Distributed / memory cache
            if (memberTypeName == IDistributedCache || memberTypeName == IMemoryCache)
            {
                hasCache = true;
            }

            // Redis
            if (memberTypeName == RedisConnectionMultiplexer || memberTypeName == RedisDatabase)
            {
                hasRedis = true;
            }
        }

        // Also check constructor parameters (common DI pattern)
        foreach (var ctor in type.Constructors)
        {
            foreach (var param in ctor.Parameters)
            {
                string paramTypeName = param.Type.ToDisplayString();
                if (paramTypeName == IDistributedCache || paramTypeName == IMemoryCache)
                    hasCache = true;
                if (paramTypeName == RedisConnectionMultiplexer || paramTypeName == RedisDatabase)
                    hasRedis = true;
            }
        }

        if (hasCache)
        {
            AddDataStoreIfAbsent(output, "cache", "Application Cache", "cache");
        }

        if (hasRedis)
        {
            AddDataStoreIfAbsent(output, "redis", "Redis", "cache");
        }
    }

    // --- Private helpers ---

    // [DocDeterministic]
    private static bool IsDbContext(INamedTypeSymbol type)
    {
        var baseType = type.BaseType;
        while (baseType is not null)
        {
            if (baseType.ToDisplayString() == DbContextType)
                return true;
            baseType = baseType.BaseType;
        }
        return false;
    }

    // [DocIntentional("Extract DbSet<T> properties from a DbContext to discover RDBMS table and entity names")]
    private void ExtractDbContextTables(INamedTypeSymbol dbContextType, DocSpecOutput output)
    {
        var rdbms = AddDataStoreIfAbsent(output, "rdbms", "Primary Database", "rdbms");

        foreach (var member in dbContextType.GetMembers().OfType<IPropertySymbol>())
        {
            if (member.Type is not INamedTypeSymbol propType) continue;

            string constructedFrom = propType.ConstructedFrom?.ToDisplayString() ?? "";
            if (constructedFrom != DbSetType) continue;

            if (propType.TypeArguments.Length > 0)
            {
                string entityName = propType.TypeArguments[0].Name;
                // Derive table name from entity name or DbSet property name
                string tableName = member.Name;
                if (!rdbms.Tables.Contains(tableName))
                {
                    rdbms.Tables.Add(tableName);
                }
                if (!rdbms.Entities.Contains(entityName))
                {
                    rdbms.Entities.Add(entityName);
                }
            }
        }
    }

    // [DocPreserves("No duplicate data store entries in the output")]
    private static DataStoreInfo AddDataStoreIfAbsent(DocSpecOutput output, string id, string name, string type)
    {
        var existing = output.DataStores.Find(ds => ds.Id == id);
        if (existing is not null) return existing;

        var store = new DataStoreInfo { Id = id, Name = name, Type = type };
        output.DataStores.Add(store);
        return store;
    }
}

public class DataStoreInfo
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public List<string> Tables { get; set; } = new();
    public List<string> Entities { get; set; } = new();
    public List<DataStoreTopicInfo> Topics { get; set; } = new();
}

public class DataStoreTopicInfo
{
    public string Name { get; set; } = "";
}
