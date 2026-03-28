// @docspec:module {
//   id: "docspec-csharp-efcore-detector",
//   name: "EF Core Detector",
//   description: "Detects Entity Framework Core usage and identifies DbContext subclasses without requiring compile-time EF Core dependencies.",
//   since: "3.0.0"
// }

using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Framework;

/// <summary>Detect Entity Framework Core usage.</summary>
// [DocBoundary("framework detection without compile deps")]
// [DocIntentional("Detect EF Core presence and DbContext hierarchies by checking referenced assembly names")]
public class EfCoreDetector
{
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool Detect(Compilation compilation)
    {
        return compilation.ReferencedAssemblyNames.Any(r => r.Name.StartsWith("Microsoft.EntityFrameworkCore"));
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsDbContext(INamedTypeSymbol type)
    {
        var baseType = type.BaseType;
        while (baseType != null)
        {
            if (baseType.Name == "DbContext") return true;
            baseType = baseType.BaseType;
        }
        return false;
    }
}
