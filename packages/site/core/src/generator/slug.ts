/**
 * URL slug generation utilities for DocSpec pages.
 *
 * Slug scheme:
 *   /libraries/{label-slug}/                           Artifact landing
 *   /libraries/{label-slug}/modules/{moduleId}         Module page
 *   /libraries/{label-slug}/members/{qualified-slug}   Member page
 *   /api/{label-slug}/endpoints/{method}-{path-slug}   Endpoint page
 *   /architecture/flows/{flowId}                       Flow page
 *   /architecture/data-models/{name-slug}              Data model page
 *   /architecture/errors                               Error catalog
 *   /architecture/events                               Event catalog
 *   /architecture/graph                                Dependency graph
 *   /architecture/operations                           Operations overview
 *   /learn/guides/{path}                               Guide page
 *   /changelog                                         Changelog
 */

/**
 * Generic slugify: lowercase, replace non-alphanumeric chars with hyphens,
 * collapse consecutive hyphens, and trim leading/trailing hyphens.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug for an artifact label (e.g. "Waypoint Engine" -> "waypoint-engine"). */
export function artifactSlug(label: string): string {
  return slugify(label);
}

/**
 * Slug for a member qualified name.
 * Dots become slashes so the slug can serve as a path segment.
 * e.g. "com.waypoint.agent.GoalParser" -> "com/waypoint/agent/goalparser"
 */
export function memberSlug(qualified: string): string {
  return qualified
    .split(".")
    .map((part) => slugify(part))
    .join("/");
}

/**
 * Slug for an endpoint.
 * Combines HTTP method and path into a single dash-separated slug.
 * e.g. ("GET", "/v1/curricula/{id}") -> "get-v1-curricula-id"
 */
export function endpointSlug(method: string, path: string): string {
  return slugify(`${method} ${path}`);
}

// ---------------------------------------------------------------------------
// Full page-path helpers
// ---------------------------------------------------------------------------

export function modulePageSlug(artifactLabel: string, moduleId: string): string {
  return `/libraries/${artifactSlug(artifactLabel)}/modules/${slugify(moduleId)}`;
}

export function memberPageSlug(artifactLabel: string, qualified: string): string {
  return `/libraries/${artifactSlug(artifactLabel)}/members/${memberSlug(qualified)}`;
}

export function endpointPageSlug(
  artifactLabel: string,
  method: string,
  path: string,
): string {
  return `/api/${artifactSlug(artifactLabel)}/endpoints/${endpointSlug(method, path)}`;
}

export function flowPageSlug(flowId: string): string {
  return `/architecture/flows/${slugify(flowId)}`;
}

export function dataModelPageSlug(name: string): string {
  return `/architecture/data-models/${slugify(name)}`;
}

export function errorCatalogSlug(): string {
  return "/architecture/errors";
}

export function eventCatalogSlug(): string {
  return "/architecture/events";
}

export function graphPageSlug(artifactLabel?: string): string {
  if (artifactLabel) {
    return `/architecture/${artifactSlug(artifactLabel)}/graph`;
  }
  return "/architecture/graph";
}

export function operationsPageSlug(): string {
  return "/architecture/operations";
}

export function guidePageSlug(path: string): string {
  // Strip file extension and leading slashes, then slugify each segment
  const clean = path.replace(/\.(md|mdoc|markdoc)$/i, "").replace(/^\/+/, "");
  const segments = clean.split("/").map((s) => slugify(s));
  return `/learn/guides/${segments.join("/")}`;
}

export function changelogSlug(): string {
  return "/changelog";
}

export function artifactLandingSlug(label: string): string {
  return `/libraries/${artifactSlug(label)}`;
}

export function dataStorePageSlug(): string {
  return "/architecture/data-stores";
}

export function configurationPageSlug(artifactLabel: string): string {
  return `/libraries/${artifactSlug(artifactLabel)}/configuration`;
}

export function securityPageSlug(artifactLabel: string): string {
  return `/libraries/${artifactSlug(artifactLabel)}/security`;
}

export function dependencyMapPageSlug(): string {
  return "/architecture/dependencies";
}

export function privacyPageSlug(): string {
  return "/architecture/privacy";
}

export function testOverviewPageSlug(artifactLabel: string): string {
  return `/tests/${artifactSlug(artifactLabel)}/overview`;
}

export function intentGraphPageSlug(artifactLabel: string): string {
  return `/tests/${artifactSlug(artifactLabel)}/intent-graph`;
}

export function landingPageSlug(): string {
  return "/";
}

export function flowTestPageSlug(artifactLabel: string, flowId: string): string {
  return `/tests/${artifactSlug(artifactLabel)}/flow-tests/${slugify(flowId)}`;
}

export function gapReportPageSlug(artifactLabel: string): string {
  return `/tests/${artifactSlug(artifactLabel)}/gap-report`;
}

export function testDashboardSlug(): string {
  return "/tests";
}

export function observabilityPageSlug(artifactLabel: string): string {
  return `/libraries/${artifactSlug(artifactLabel)}/observability`;
}

export function graphqlPageSlug(artifactLabel: string): string {
  return `/api/${artifactSlug(artifactLabel)}/graphql`;
}

export function grpcPageSlug(artifactLabel: string): string {
  return `/api/${artifactSlug(artifactLabel)}/grpc`;
}

export function websocketPageSlug(artifactLabel: string): string {
  return `/api/${artifactSlug(artifactLabel)}/websocket`;
}

export function asyncApiPageSlug(artifactLabel: string): string {
  return `/api/${artifactSlug(artifactLabel)}/async-api`;
}

export function cliProtocolPageSlug(artifactLabel: string): string {
  return `/api/${artifactSlug(artifactLabel)}/cli`;
}
