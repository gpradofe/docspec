/**
 * Page factory — dispatches to per-type generators.
 *
 * Takes a ResolvedArtifact and produces ALL GeneratedPage instances for it:
 *  - Module pages (one per module)
 *  - Member pages (one per member across all modules)
 *  - Endpoint pages (one per method with endpointMapping)
 *  - Flow pages (one per flow)
 *  - Data model pages (one per data model)
 *  - Error catalog page (if errors exist)
 *  - Event catalog page (if events exist)
 *  - Operations page (if contexts exist)
 *  - Graph page (from modules + crossRefs)
 */

import type { ResolvedArtifact } from "../resolver/types.js";
import type { GeneratedPage } from "../types/page.js";
import { generateModulePage } from "./pages/module.js";
import { generateMemberPage } from "./pages/member.js";
import { generateEndpointPage } from "./pages/endpoint.js";
import { generateFlowPage } from "./pages/flow.js";
import { generateDataModelPage } from "./pages/data-model.js";
import { generateErrorCatalogPage } from "./pages/error-catalog.js";
import { generateEventCatalogPage } from "./pages/event-catalog.js";
import { generateGraphPage } from "./pages/graph.js";
import { generateOperationsPage } from "./pages/operations.js";
import { generateDataStorePage } from "./pages/data-store.js";
import { generateConfigurationPage } from "./pages/configuration.js";
import { generateSecurityPage } from "./pages/security.js";
import { generateDependencyMapPage } from "./pages/dependency-map.js";
import { generatePrivacyPage } from "./pages/privacy.js";
import { generateTestOverviewPage } from "./pages/test-overview.js";
import { generateIntentGraphPage } from "./pages/intent-graph.js";
import { generateFlowTestPage } from "./pages/flow-test.js";
import { generateGapReportPage } from "./pages/gap-report.js";
import { generateObservabilityPage } from "./pages/observability.js";

/**
 * Generate all pages for a single resolved artifact.
 */
export function generateArtifactPages(artifact: ResolvedArtifact): GeneratedPage[] {
  const { spec, label, color } = artifact;
  const pages: GeneratedPage[] = [];

  const flows = spec.flows ?? [];
  const contexts = spec.contexts ?? [];

  // ── Module pages ─────────────────────────────────────────────────
  for (const mod of spec.modules) {
    pages.push(
      generateModulePage({
        module: mod,
        artifactLabel: label,
        artifactColor: color,
      }),
    );

    // ── Member pages ───────────────────────────────────────────────
    for (const member of mod.members ?? []) {
      pages.push(
        generateMemberPage({
          member,
          moduleId: mod.id,
          artifactLabel: label,
          artifactColor: color,
          flows,
          contexts,
        }),
      );

      // ── Endpoint pages ─────────────────────────────────────────
      for (const method of member.methods ?? []) {
        if (method.endpointMapping) {
          pages.push(
            generateEndpointPage({
              method,
              memberQualified: member.qualified,
              memberName: member.name,
              artifactLabel: label,
              artifactColor: color,
            }),
          );
        }
      }
    }
  }

  // ── Flow pages ───────────────────────────────────────────────────
  for (const flow of flows) {
    pages.push(
      generateFlowPage({
        flow,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Data model pages ─────────────────────────────────────────────
  for (const dataModel of spec.dataModels ?? []) {
    pages.push(
      generateDataModelPage({
        dataModel,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Error catalog ────────────────────────────────────────────────
  if (spec.errors && spec.errors.length > 0) {
    pages.push(
      generateErrorCatalogPage({
        errors: spec.errors,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Event catalog ────────────────────────────────────────────────
  if (spec.events && spec.events.length > 0) {
    pages.push(
      generateEventCatalogPage({
        events: spec.events,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Operations page ──────────────────────────────────────────────
  if (contexts.length > 0) {
    pages.push(
      generateOperationsPage({
        contexts,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Graph page ───────────────────────────────────────────────────
  const crossRefs = spec.crossRefs ?? [];
  if (spec.modules.length > 0 || crossRefs.length > 0) {
    pages.push(
      generateGraphPage({
        modules: spec.modules,
        crossRefs,
        artifactLabel: label,
      }),
    );
  }

  // ── Data store page ─────────────────────────────────────────────
  if (spec.dataStores && spec.dataStores.length > 0) {
    pages.push(
      generateDataStorePage({
        dataStores: spec.dataStores,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Configuration page ──────────────────────────────────────────
  if (spec.configuration && spec.configuration.length > 0) {
    pages.push(
      generateConfigurationPage({
        properties: spec.configuration,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Security page ──────────────────────────────────────────────
  if (spec.security) {
    pages.push(
      generateSecurityPage({
        security: spec.security,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Dependency map page ─────────────────────────────────────────
  if (spec.externalDependencies && spec.externalDependencies.length > 0) {
    pages.push(
      generateDependencyMapPage({
        dependencies: spec.externalDependencies,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Privacy page ────────────────────────────────────────────────
  if (spec.privacy && spec.privacy.length > 0) {
    pages.push(
      generatePrivacyPage({
        fields: spec.privacy,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Test overview & intent graph pages ──────────────────────────
  if (spec.intentGraph) {
    pages.push(
      generateTestOverviewPage({
        intentGraph: spec.intentGraph,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
    pages.push(
      generateIntentGraphPage({
        intentGraph: spec.intentGraph,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Flow test pages ───────────────────────────────────────────
  for (const flow of flows) {
    pages.push(
      generateFlowTestPage({
        flow,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  // ── Gap report page ───────────────────────────────────────────
  pages.push(
    generateGapReportPage({
      artifactLabel: label,
      artifactColor: color,
    }),
  );

  // ── Observability page ────────────────────────────────────────
  if (spec.observability) {
    pages.push(
      generateObservabilityPage({
        observability: spec.observability,
        artifactLabel: label,
        artifactColor: color,
      }),
    );
  }

  return pages;
}
