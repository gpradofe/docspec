// @docspec:module {
//   id: "docspec-csharp-xmldoc-reader",
//   name: "XML Doc Reader",
//   description: "Reads XML documentation comments from Roslyn symbols, parsing <summary>, <param>, <returns>, <exception>, and <example> tags.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Reader;

/// <summary>
/// Reads XML documentation comments from Roslyn symbols.
/// The C# equivalent of Java's <c>JavaDocReader</c>.
/// Parses <c>&lt;summary&gt;</c>, <c>&lt;param&gt;</c>, <c>&lt;returns&gt;</c>,
/// <c>&lt;exception&gt;</c>, and <c>&lt;example&gt;</c> tags from
/// the structured XML produced by <see cref="ISymbol.GetDocumentationCommentXml"/>.
/// </summary>
// [DocIntentional("Parse structured XML doc comments into plain-text descriptions and metadata for DocSpec output")]
// [DocDeterministic]
public class XmlDocReader
{
    /// <summary>
    /// Gets the <c>&lt;summary&gt;</c> text for a symbol.
    /// Returns null if no XML doc comment is present.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string? GetDescription(ISymbol symbol)
    {
        var xml = symbol.GetDocumentationCommentXml();
        if (string.IsNullOrEmpty(xml)) return null;

        var doc = TryParseXml(xml);
        if (doc is null) return null;

        var summary = doc.Descendants("summary").FirstOrDefault();
        if (summary is null) return null;

        string text = GetInnerText(summary).Trim();
        return text.Length == 0 ? null : text;
    }

    /// <summary>
    /// Gets all <c>&lt;param&gt;</c> descriptions, keyed by parameter name.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public Dictionary<string, string> GetParamDescriptions(ISymbol symbol)
    {
        var result = new Dictionary<string, string>();
        var xml = symbol.GetDocumentationCommentXml();
        if (string.IsNullOrEmpty(xml)) return result;

        var doc = TryParseXml(xml);
        if (doc is null) return result;

        foreach (var param in doc.Descendants("param"))
        {
            string? name = param.Attribute("name")?.Value;
            if (name is null) continue;

            string desc = GetInnerText(param).Trim();
            if (desc.Length > 0)
            {
                result[name] = desc;
            }
        }

        return result;
    }

    /// <summary>
    /// Gets the <c>&lt;returns&gt;</c> description.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string? GetReturnDescription(ISymbol symbol)
    {
        var xml = symbol.GetDocumentationCommentXml();
        if (string.IsNullOrEmpty(xml)) return null;

        var doc = TryParseXml(xml);
        if (doc is null) return null;

        var returns = doc.Descendants("returns").FirstOrDefault();
        if (returns is null) return null;

        string text = GetInnerText(returns).Trim();
        return text.Length == 0 ? null : text;
    }

    /// <summary>
    /// Gets all <c>&lt;exception&gt;</c> descriptions, keyed by exception type reference.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public Dictionary<string, string> GetExceptionDescriptions(ISymbol symbol)
    {
        var result = new Dictionary<string, string>();
        var xml = symbol.GetDocumentationCommentXml();
        if (string.IsNullOrEmpty(xml)) return result;

        var doc = TryParseXml(xml);
        if (doc is null) return result;

        foreach (var ex in doc.Descendants("exception"))
        {
            string? cref = ex.Attribute("cref")?.Value;
            if (cref is null) continue;

            // Remove "T:" prefix if present
            if (cref.StartsWith("T:")) cref = cref.Substring(2);

            string desc = GetInnerText(ex).Trim();
            if (desc.Length > 0)
            {
                result[cref] = desc;
            }
        }

        return result;
    }

    /// <summary>
    /// Gets the <c>&lt;example&gt;</c> block text, if any.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string? GetExampleText(ISymbol symbol)
    {
        var xml = symbol.GetDocumentationCommentXml();
        if (string.IsNullOrEmpty(xml)) return null;

        var doc = TryParseXml(xml);
        if (doc is null) return null;

        var example = doc.Descendants("example").FirstOrDefault();
        if (example is null) return null;

        // Prefer <code> block inside <example>
        var code = example.Descendants("code").FirstOrDefault();
        if (code is not null)
        {
            string codeText = code.Value.Trim();
            return codeText.Length == 0 ? null : codeText;
        }

        string text = GetInnerText(example).Trim();
        return text.Length == 0 ? null : text;
    }

    /// <summary>
    /// Gets the <c>&lt;remarks&gt;</c> text, if any.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string? GetRemarks(ISymbol symbol)
    {
        var xml = symbol.GetDocumentationCommentXml();
        if (string.IsNullOrEmpty(xml)) return null;

        var doc = TryParseXml(xml);
        if (doc is null) return null;

        var remarks = doc.Descendants("remarks").FirstOrDefault();
        if (remarks is null) return null;

        string text = GetInnerText(remarks).Trim();
        return text.Length == 0 ? null : text;
    }

    // --- Private helpers ---

    private static XDocument? TryParseXml(string xml)
    {
        try
        {
            return XDocument.Parse(xml);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Extracts the inner text from an XML element, resolving <c>&lt;see cref="..."&gt;</c>
    /// and <c>&lt;paramref name="..."&gt;</c> references into their readable names.
    /// </summary>
    private static string GetInnerText(XElement element)
    {
        var parts = new List<string>();

        foreach (var node in element.Nodes())
        {
            switch (node)
            {
                case XText text:
                    parts.Add(text.Value);
                    break;
                case XElement el when el.Name.LocalName == "see":
                    string? cref = el.Attribute("cref")?.Value;
                    if (cref is not null)
                    {
                        // Strip prefix like "T:", "M:", "P:" etc.
                        int colonIdx = cref.IndexOf(':');
                        string shortName = colonIdx >= 0 ? cref.Substring(colonIdx + 1) : cref;
                        // Use just the last segment
                        int dotIdx = shortName.LastIndexOf('.');
                        parts.Add(dotIdx >= 0 ? shortName.Substring(dotIdx + 1) : shortName);
                    }
                    else
                    {
                        parts.Add(el.Value);
                    }
                    break;
                case XElement el when el.Name.LocalName == "paramref":
                    string? paramName = el.Attribute("name")?.Value;
                    parts.Add(paramName ?? el.Value);
                    break;
                case XElement el when el.Name.LocalName == "typeparamref":
                    string? typeParamName = el.Attribute("name")?.Value;
                    parts.Add(typeParamName ?? el.Value);
                    break;
                case XElement el:
                    parts.Add(GetInnerText(el));
                    break;
            }
        }

        return string.Join("", parts);
    }
}
