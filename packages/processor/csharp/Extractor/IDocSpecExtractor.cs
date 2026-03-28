// @docspec:module {
//   id: "docspec-csharp-extractor-interface",
//   name: "DocSpec Extractor Interface",
//   description: "Defines the contract for domain-specific extractors that analyze Roslyn type symbols and populate the DocSpec output model.",
//   since: "3.0.0"
// }

using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Interface for extractors that analyze types and populate the DocSpec output
/// with domain-specific documentation (security, configuration, observability, etc.).
/// Mirrors the Java <c>DocSpecExtractor</c> interface.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Define a safe extraction contract with IsAvailable guard for optional framework dependencies")]
public interface IDocSpecExtractor
{
    /// <summary>
    /// Checks whether this extractor can operate in the current compilation.
    /// Typically verifies that required framework assemblies are referenced.
    /// </summary>
    // [DocIntentional("Check if the targeted framework assemblies are referenced in the compilation")]
    bool IsAvailable(Compilation compilation);

    /// <summary>
    /// Returns the human-readable name of this extractor for diagnostic messages.
    /// </summary>
    // [DocDeterministic]
    string ExtractorName { get; }

    /// <summary>
    /// Analyzes a single named type symbol and populates the output with extracted data.
    /// </summary>
    /// <param name="type">The type to analyze.</param>
    /// <param name="compilation">The Roslyn compilation context.</param>
    /// <param name="output">The DocSpec output model to populate.</param>
    // [DocIntentional("Analyze a single named type symbol and populate the output with domain-specific documentation")]
    void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output);
}
