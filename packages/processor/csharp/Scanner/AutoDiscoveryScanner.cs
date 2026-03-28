// @docspec:module {
//   id: "docspec-csharp-auto-discovery",
//   name: "Auto-Discovery Scanner",
//   description: "Scans a Roslyn compilation to auto-discover all public types, extracting kind, namespace, and XML doc comments for Tier 0 documentation.",
//   since: "3.0.0"
// }

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace DocSpec.Analyzer.Scanner;

/// <summary>Auto-discover public types in a C# compilation.</summary>
// [DocIntentional("Walk all syntax trees in a compilation to discover public types for zero-config documentation")]
// [DocBoundary("Roslyn compilation traversal")]
public class AutoDiscoveryScanner
{
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public List<TypeDiscoveryInfo> Scan(Compilation compilation)
    {
        var types = new List<TypeDiscoveryInfo>();

        foreach (var tree in compilation.SyntaxTrees)
        {
            var root = tree.GetRoot();
            var model = compilation.GetSemanticModel(tree);

            foreach (var typeDecl in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (!typeDecl.Modifiers.Any(m => m.Text == "public")) continue;

                var symbol = model.GetDeclaredSymbol(typeDecl);
                if (symbol == null) continue;

                var kind = typeDecl switch
                {
                    ClassDeclarationSyntax => "class",
                    InterfaceDeclarationSyntax => "interface",
                    StructDeclarationSyntax => "struct",
                    EnumDeclarationSyntax => "enum",
                    RecordDeclarationSyntax => "record",
                    _ => "class"
                };

                var xmlComment = symbol.GetDocumentationCommentXml();
                string? summary = null;
                if (!string.IsNullOrEmpty(xmlComment))
                {
                    var summaryStart = xmlComment.IndexOf("<summary>");
                    var summaryEnd = xmlComment.IndexOf("</summary>");
                    if (summaryStart >= 0 && summaryEnd > summaryStart)
                    {
                        summary = xmlComment.Substring(summaryStart + 9, summaryEnd - summaryStart - 9).Trim();
                    }
                }

                types.Add(new TypeDiscoveryInfo
                {
                    Name = symbol.Name,
                    FullName = symbol.ToDisplayString(),
                    Kind = kind,
                    Namespace = symbol.ContainingNamespace?.ToDisplayString(),
                    XmlComment = summary,
                    Symbol = symbol
                });
            }
        }

        return types;
    }
}
