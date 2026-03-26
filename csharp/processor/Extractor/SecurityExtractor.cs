// @docspec:module {
//   id: "docspec-csharp-security-extractor",
//   name: "Security Extractor",
//   description: "Detects [Authorize], [AllowAnonymous], role-based, and policy-based authorization attributes on ASP.NET Core controllers and actions.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects ASP.NET Core authorization attributes (<c>[Authorize]</c>,
/// <c>[AllowAnonymous]</c>) and custom policy-based authorization on
/// controllers and actions, and populates the security section of
/// the DocSpec output.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Extract authorization rules, roles, and policies from ASP.NET Core security attributes")]
public class SecurityExtractor : IDocSpecExtractor
{
    private const string AuthorizeAttribute = "Microsoft.AspNetCore.Authorization.AuthorizeAttribute";
    private const string AllowAnonymousAttribute = "Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute";

    public string ExtractorName => "security";

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        return compilation.GetTypeByMetadataName(AuthorizeAttribute) is not null;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Extract Authorize/AllowAnonymous attributes with roles, policies, and schemes from controllers and actions")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        var allRoles = new HashSet<string>();
        var endpointRules = new List<SecurityEndpointRuleInfo>();

        // Class-level [Authorize] roles/policies
        var classRules = ExtractAuthRules(type, allRoles);

        // Method-level [Authorize] rules
        foreach (var member in type.GetMembers().OfType<IMethodSymbol>())
        {
            if (member.MethodKind != MethodKind.Ordinary) continue;
            if (member.DeclaredAccessibility != Accessibility.Public) continue;

            var methodRules = ExtractAuthRules(member, allRoles);

            // Check [AllowAnonymous] override
            bool allowAnon = member.GetAttributes()
                .Any(a => MatchesFullName(a, AllowAnonymousAttribute));

            if (methodRules.Count > 0 || allowAnon)
            {
                var rule = new SecurityEndpointRuleInfo
                {
                    Path = BuildEndpointPath(type, member),
                    Rules = allowAnon ? new List<string> { "AllowAnonymous" } : methodRules,
                    IsPublic = allowAnon
                };
                endpointRules.Add(rule);
            }
        }

        if (endpointRules.Count == 0 && classRules.Count == 0) return;

        output.Security ??= new SecurityInfo();

        output.Security.Endpoints.AddRange(endpointRules);

        foreach (var role in allRoles)
        {
            if (!output.Security.Roles.Contains(role))
                output.Security.Roles.Add(role);
        }
    }

    // --- Private helpers ---

    // [DocIntentional("Extract Roles, Policy, and AuthenticationSchemes from Authorize attributes on a symbol")]
    private List<string> ExtractAuthRules(ISymbol symbol, HashSet<string> allRoles)
    {
        var rules = new List<string>();

        foreach (var attr in symbol.GetAttributes())
        {
            if (!MatchesFullName(attr, AuthorizeAttribute)) continue;

            // Roles property
            var rolesArg = attr.NamedArguments
                .FirstOrDefault(a => a.Key == "Roles");
            if (rolesArg.Value.Value is string rolesStr && !string.IsNullOrEmpty(rolesStr))
            {
                foreach (var role in rolesStr.Split(',').Select(r => r.Trim()))
                {
                    rules.Add("Authorize(Roles): " + role);
                    allRoles.Add(role);
                }
            }

            // Policy property
            var policyArg = attr.NamedArguments
                .FirstOrDefault(a => a.Key == "Policy");
            if (policyArg.Value.Value is string policy && !string.IsNullOrEmpty(policy))
            {
                rules.Add("Authorize(Policy): " + policy);
            }

            // AuthenticationSchemes property
            var schemesArg = attr.NamedArguments
                .FirstOrDefault(a => a.Key == "AuthenticationSchemes");
            if (schemesArg.Value.Value is string schemes && !string.IsNullOrEmpty(schemes))
            {
                rules.Add("Authorize(Schemes): " + schemes);
            }

            // Bare [Authorize] with no named args
            if (rules.Count == 0)
            {
                rules.Add("Authorize");
            }
        }

        return rules;
    }

    // [DocDeterministic]
    private string BuildEndpointPath(INamedTypeSymbol type, IMethodSymbol method)
    {
        string basePath = GetRouteFromAttributes(type);
        string methodPath = GetRouteFromAttributes(method);

        if (!basePath.StartsWith("/") && basePath.Length > 0) basePath = "/" + basePath;
        if (!methodPath.StartsWith("/") && methodPath.Length > 0) methodPath = "/" + methodPath;

        var result = basePath + methodPath;
        return result.Length == 0 ? "/" : result;
    }

    // [DocDeterministic]
    private string GetRouteFromAttributes(ISymbol symbol)
    {
        foreach (var attr in symbol.GetAttributes())
        {
            string? name = attr.AttributeClass?.ToDisplayString();
            if (name == null) continue;

            if (name == "Microsoft.AspNetCore.Mvc.RouteAttribute" ||
                name.StartsWith("Microsoft.AspNetCore.Mvc.Http"))
            {
                if (attr.ConstructorArguments.Length > 0 &&
                    attr.ConstructorArguments[0].Value is string template)
                {
                    return template;
                }
            }
        }
        return "";
    }

    // [DocDeterministic]
    private static bool MatchesFullName(AttributeData attr, string fullName)
    {
        return attr.AttributeClass?.ToDisplayString() == fullName;
    }
}

public class SecurityInfo
{
    public List<string> Roles { get; set; } = new();
    public List<SecurityEndpointRuleInfo> Endpoints { get; set; } = new();
}

public class SecurityEndpointRuleInfo
{
    public string Path { get; set; } = "/";
    public List<string> Rules { get; set; } = new();
    public bool IsPublic { get; set; }
}
