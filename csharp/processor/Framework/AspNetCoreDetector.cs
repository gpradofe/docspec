// @docspec:module {
//   id: "docspec-csharp-aspnetcore-detector",
//   name: "ASP.NET Core Detector",
//   description: "Detects ASP.NET Core framework usage and identifies controller base classes without requiring compile-time framework dependencies.",
//   since: "3.0.0"
// }

using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Framework;

/// <summary>Detect ASP.NET Core framework usage.</summary>
// [DocBoundary("framework detection without compile deps")]
// [DocIntentional("Detect ASP.NET Core presence by checking referenced assembly names")]
public class AspNetCoreDetector
{
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool Detect(Compilation compilation)
    {
        return compilation.ReferencedAssemblyNames.Any(r => r.Name.StartsWith("Microsoft.AspNetCore"));
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string? DetectControllerBase(INamedTypeSymbol type)
    {
        var baseType = type.BaseType;
        while (baseType != null)
        {
            var name = baseType.ToDisplayString();
            if (name.Contains("ControllerBase") || name.Contains("Controller"))
                return "controller";
            baseType = baseType.BaseType;
        }
        return null;
    }
}
