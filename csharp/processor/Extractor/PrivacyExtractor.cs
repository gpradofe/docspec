// @docspec:module {
//   id: "docspec-csharp-privacy-extractor",
//   name: "Privacy Extractor",
//   description: "Detects [DocPII] and [DocSensitive] attributes on fields and properties to track personally identifiable information and sensitive data.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects <c>[DocPII]</c> and <c>[DocSensitive]</c> attributes on fields
/// and properties, and populates the privacy section of the DocSpec output.
/// Mirrors the Java <c>PrivacyExtractor</c>.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Scan type members for PII and sensitivity annotations to populate the privacy section")]
public class PrivacyExtractor : IDocSpecExtractor
{
    private const string DocPIIAttribute = "DocSpec.Annotations.DocPIIAttribute";
    private const string DocSensitiveAttribute = "DocSpec.Annotations.DocSensitiveAttribute";

    public string ExtractorName => "privacy";

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        return compilation.GetTypeByMetadataName(DocPIIAttribute) is not null;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Scan type members for DocPII and DocSensitive attributes to populate privacy metadata")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        string ownerQualified = type.ToDisplayString();
        var privacyFields = new List<PrivacyFieldInfo>();

        foreach (var member in type.GetMembers())
        {
            // Support both fields and properties (C# convention uses properties more)
            string? memberName = member switch
            {
                IFieldSymbol f => f.Name,
                IPropertySymbol p => p.Name,
                _ => null
            };

            if (memberName is null) continue;

            foreach (var attr in member.GetAttributes())
            {
                string? attrName = attr.AttributeClass?.ToDisplayString();

                if (attrName == DocPIIAttribute)
                {
                    var pf = new PrivacyFieldInfo
                    {
                        Field = ownerQualified + "." + memberName
                    };

                    // Constructor arg: piiType
                    if (attr.ConstructorArguments.Length > 0 &&
                        attr.ConstructorArguments[0].Value is string piiType)
                    {
                        pf.PiiType = piiType;
                    }

                    // Named arguments
                    foreach (var namedArg in attr.NamedArguments)
                    {
                        switch (namedArg.Key)
                        {
                            case "Retention":
                                pf.Retention = namedArg.Value.Value as string;
                                break;
                            case "GdprBasis":
                                pf.GdprBasis = namedArg.Value.Value as string;
                                break;
                            case "Encrypted":
                                if (namedArg.Value.Value is bool enc) pf.Encrypted = enc;
                                break;
                            case "NeverLog":
                                if (namedArg.Value.Value is bool nl) pf.NeverLog = nl;
                                break;
                            case "NeverReturn":
                                if (namedArg.Value.Value is bool nr) pf.NeverReturn = nr;
                                break;
                        }
                    }

                    privacyFields.Add(pf);
                }
                else if (attrName == DocSensitiveAttribute)
                {
                    var pf = new PrivacyFieldInfo
                    {
                        Field = ownerQualified + "." + memberName,
                        PiiType = "other",
                        NeverLog = true
                    };
                    privacyFields.Add(pf);
                }
            }
        }

        if (privacyFields.Count > 0)
        {
            output.Privacy.AddRange(privacyFields);
        }
    }
}

public class PrivacyFieldInfo
{
    public string Field { get; set; } = "";
    public string? PiiType { get; set; }
    public string? Retention { get; set; }
    public string? GdprBasis { get; set; }
    public bool? Encrypted { get; set; }
    public bool? NeverLog { get; set; }
    public bool? NeverReturn { get; set; }
}
