import React from "react";
import type { GeneratedPage } from "@docspec/core";
import {
  LandingPage,
  ModulePage,
  MemberPage,
  EndpointPage,
  FlowPage,
  DataModelPage,
  ErrorCatalogPage,
  EventCatalogPage,
  GraphPage,
  OperationsPage,
  GuidePage,
  ChangelogPage,
  DataStorePage,
  ConfigurationPage,
  SecurityPage,
  DependencyMapPage,
  PrivacyPage,
  TestOverviewPage,
  IntentGraphPage,
  FlowTestPage,
  GapReportPage,
  ObservabilityPage,
  TestDashboardPage,
} from "@docspec/theme-stripe";

interface PageRendererProps {
  page: GeneratedPage;
  referenceIndex: Record<string, string>;
  lens?: "docs" | "tests";
}

export function PageRenderer({ page, referenceIndex, lens }: PageRendererProps) {
  switch (page.type) {
    case "landing":
      if (lens === "tests") {
        return <TestDashboardPage data={page.data as any} />;
      }
      return <LandingPage data={page.data as any} />;
    case "module":
      return <ModulePage data={page.data as any} />;
    case "member":
      return <MemberPage data={page.data as any} referenceIndex={referenceIndex} lens={lens} />;
    case "endpoint":
      return <EndpointPage data={page.data as any} referenceIndex={referenceIndex} />;
    case "flow":
      return <FlowPage data={page.data as any} referenceIndex={referenceIndex} />;
    case "data-model":
      return <DataModelPage data={page.data as any} referenceIndex={referenceIndex} />;
    case "error-catalog":
      return <ErrorCatalogPage data={page.data as any} />;
    case "event-catalog":
      return <EventCatalogPage data={page.data as any} />;
    case "graph":
      return <GraphPage data={page.data as any} />;
    case "operations":
      return <OperationsPage data={page.data as any} />;
    case "guide":
      return <GuidePage data={page.data as any} />;
    case "changelog":
      return <ChangelogPage data={page.data as any} />;
    case "data-store-page":
      return <DataStorePage data={page.data as any} />;
    case "configuration":
      return <ConfigurationPage data={page.data as any} />;
    case "security":
      return <SecurityPage data={page.data as any} />;
    case "dependency-map":
      return <DependencyMapPage data={page.data as any} />;
    case "privacy":
      return <PrivacyPage data={page.data as any} />;
    case "test-overview":
      return <TestOverviewPage data={page.data as any} />;
    case "intent-graph":
      return <IntentGraphPage data={page.data as any} />;
    case "flow-test":
      return <FlowTestPage data={page.data as any} />;
    case "gap-report":
      return <GapReportPage data={page.data as any} />;
    case "observability":
      return <ObservabilityPage data={page.data as any} />;
    case "test-dashboard":
      return <TestDashboardPage data={page.data as any} />;
    default:
      return <div style={{ color: "#f87171", padding: 40 }}>Unknown page type: {page.type}</div>;
  }
}
