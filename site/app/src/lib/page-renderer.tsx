import React from "react";
import { PageType } from "@docspec/core";
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
}

export function PageRenderer({ page, referenceIndex }: PageRendererProps) {
  switch (page.type) {
    case PageType.MODULE:
      return <ModulePage data={page.data as any} />;
    case PageType.MEMBER:
      return <MemberPage data={page.data as any} referenceIndex={referenceIndex} />;
    case PageType.ENDPOINT:
      return <EndpointPage data={page.data as any} referenceIndex={referenceIndex} />;
    case PageType.FLOW:
      return <FlowPage data={page.data as any} referenceIndex={referenceIndex} />;
    case PageType.DATA_MODEL:
      return <DataModelPage data={page.data as any} referenceIndex={referenceIndex} />;
    case PageType.ERROR_CATALOG:
      return <ErrorCatalogPage data={page.data as any} />;
    case PageType.EVENT_CATALOG:
      return <EventCatalogPage data={page.data as any} />;
    case PageType.GRAPH:
      return <GraphPage data={page.data as any} />;
    case PageType.OPERATIONS:
      return <OperationsPage data={page.data as any} />;
    case PageType.GUIDE:
      return <GuidePage data={page.data as any} />;
    case PageType.CHANGELOG:
      return <ChangelogPage />;
    case PageType.LANDING:
      return <LandingPage data={page.data as any} />;
    case PageType.DATA_STORE:
      return <DataStorePage data={page.data as any} />;
    case PageType.CONFIGURATION:
      return <ConfigurationPage data={page.data as any} />;
    case PageType.SECURITY:
      return <SecurityPage data={page.data as any} />;
    case PageType.DEPENDENCY_MAP:
      return <DependencyMapPage data={page.data as any} />;
    case PageType.PRIVACY:
      return <PrivacyPage data={page.data as any} />;
    case PageType.TEST_OVERVIEW:
      return <TestOverviewPage data={page.data as any} />;
    case PageType.INTENT_GRAPH:
      return <IntentGraphPage data={page.data as any} />;
    case PageType.FLOW_TEST:
      return <FlowTestPage data={page.data as any} />;
    case PageType.GAP_REPORT:
      return <GapReportPage data={page.data as any} />;
    case PageType.OBSERVABILITY:
      return <ObservabilityPage data={page.data as any} />;
    case PageType.TEST_DASHBOARD:
      return <TestDashboardPage data={page.data as any} />;
    default:
      return <div>Unknown page type: {page.type}</div>;
  }
}
