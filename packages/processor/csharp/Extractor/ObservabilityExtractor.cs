// @docspec:module {
//   id: "docspec-csharp-observability-extractor",
//   name: "Observability Extractor",
//   description: "Detects IHealthCheck implementations, System.Diagnostics.Metrics instruments, ActivitySource tracing, and ILogger usage patterns.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects observability-related patterns in .NET projects:
/// <list type="bullet">
///   <item><c>IHealthCheck</c> implementations (ASP.NET Core health checks)</item>
///   <item><c>IMeterFactory</c> / <c>Meter</c> / <c>Counter&lt;T&gt;</c> / <c>Histogram&lt;T&gt;</c> usage
///     (System.Diagnostics.Metrics)</item>
///   <item><c>ActivitySource</c> usage (OpenTelemetry / System.Diagnostics tracing)</item>
///   <item><c>ILogger</c> field injection (structured logging)</item>
/// </list>
/// Populates the observability section of the DocSpec output.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Detect health checks, metrics, tracing, and logging from .NET observability APIs")]
public class ObservabilityExtractor : IDocSpecExtractor
{
    private const string HealthCheckInterface = "Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheck";
    private const string MeterType = "System.Diagnostics.Metrics.Meter";
    private const string ActivitySourceType = "System.Diagnostics.ActivitySource";
    private const string ILoggerType = "Microsoft.Extensions.Logging.ILogger";

    private static readonly string[] MetricInstrumentTypes =
    {
        "System.Diagnostics.Metrics.Counter`1",
        "System.Diagnostics.Metrics.Histogram`1",
        "System.Diagnostics.Metrics.UpDownCounter`1",
        "System.Diagnostics.Metrics.ObservableCounter`1",
        "System.Diagnostics.Metrics.ObservableGauge`1"
    };

    public string ExtractorName => "observability";

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        return compilation.GetTypeByMetadataName(HealthCheckInterface) is not null
            || compilation.GetTypeByMetadataName(MeterType) is not null
            || compilation.GetTypeByMetadataName(ActivitySourceType) is not null;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Detect IHealthCheck implementations, metric instruments, ActivitySource, and ILogger fields")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        string ownerQualified = type.ToDisplayString();
        var metrics = new List<ObservabilityMetricInfo>();
        ObservabilityHealthCheckInfo? healthCheck = null;
        bool hasTracing = false;
        bool hasLogging = false;

        // Check if type implements IHealthCheck
        if (ImplementsInterface(type, HealthCheckInterface))
        {
            healthCheck = new ObservabilityHealthCheckInfo
            {
                Path = "/health",
                Checks = new List<string> { type.Name }
            };
        }

        // Check fields for metric instruments, ActivitySource, ILogger
        foreach (var member in type.GetMembers())
        {
            ITypeSymbol? fieldType = member switch
            {
                IFieldSymbol f => f.Type,
                IPropertySymbol p => p.Type,
                _ => null
            };

            if (fieldType is null) continue;

            string fieldTypeName = fieldType is INamedTypeSymbol nts
                ? (nts.ConstructedFrom?.ToDisplayString() ?? nts.ToDisplayString())
                : fieldType.ToDisplayString();

            // Detect metric instruments
            if (MetricInstrumentTypes.Any(mt => fieldTypeName == mt))
            {
                string metricType = fieldType.Name.ToLowerInvariant() switch
                {
                    "counter" => "counter",
                    "histogram" => "histogram",
                    "updowncounter" => "up-down-counter",
                    "observablecounter" => "observable-counter",
                    "observablegauge" => "observable-gauge",
                    _ => "unknown"
                };

                metrics.Add(new ObservabilityMetricInfo
                {
                    Name = ownerQualified + "." + member.Name,
                    Type = metricType,
                    EmittedBy = new List<string> { ownerQualified }
                });
            }

            // Detect ActivitySource (tracing)
            if (fieldTypeName == ActivitySourceType)
            {
                hasTracing = true;
            }

            // Detect ILogger
            if (fieldTypeName == ILoggerType ||
                fieldTypeName.StartsWith("Microsoft.Extensions.Logging.ILogger"))
            {
                hasLogging = true;
            }
        }

        if (metrics.Count == 0 && healthCheck is null && !hasTracing && !hasLogging) return;

        output.Observability ??= new ObservabilityInfo();

        output.Observability.Metrics.AddRange(metrics);
        if (healthCheck is not null)
            output.Observability.HealthChecks.Add(healthCheck);
        if (hasTracing)
            output.Observability.TracingSources.Add(ownerQualified);
        if (hasLogging)
            output.Observability.LoggingSources.Add(ownerQualified);
    }

    // --- Private helpers ---

    // [DocDeterministic]
    private static bool ImplementsInterface(INamedTypeSymbol type, string interfaceFullName)
    {
        foreach (var iface in type.AllInterfaces)
        {
            if (iface.ToDisplayString() == interfaceFullName)
                return true;
        }
        return false;
    }
}

public class ObservabilityInfo
{
    public List<ObservabilityMetricInfo> Metrics { get; set; } = new();
    public List<ObservabilityHealthCheckInfo> HealthChecks { get; set; } = new();
    public List<string> TracingSources { get; set; } = new();
    public List<string> LoggingSources { get; set; } = new();
}

public class ObservabilityMetricInfo
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public List<string>? EmittedBy { get; set; }
    public List<string>? Labels { get; set; }
}

public class ObservabilityHealthCheckInfo
{
    public string Path { get; set; } = "/health";
    public List<string> Checks { get; set; } = new();
}
