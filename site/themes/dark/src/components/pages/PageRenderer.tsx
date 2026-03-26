import React from "react";
import { LandingPage } from "./LandingPage.js";
import { GuidePage } from "./GuidePage.js";
import { ModulePage } from "./ModulePage.js";
import { MemberPage } from "./MemberPage.js";
import { EndpointPage } from "./EndpointPage.js";
import { FlowPage } from "./FlowPage.js";
import { DataModelPage } from "./DataModelPage.js";
import { ErrorCatalogPage } from "./ErrorCatalogPage.js";
import { EventCatalogPage } from "./EventCatalogPage.js";
import { GraphPage } from "./GraphPage.js";
import { OperationsPage } from "./OperationsPage.js";
import { ChangelogPage } from "./ChangelogPage.js";
import { DataStorePage } from "./DataStorePage.js";
import { ConfigurationPage } from "./ConfigurationPage.js";
import { SecurityPage } from "./SecurityPage.js";
import { DependencyMapPage } from "./DependencyMapPage.js";
import { PrivacyPage } from "./PrivacyPage.js";
import { TestOverviewPage } from "./TestOverviewPage.js";
import { IntentGraphPage } from "./IntentGraphPage.js";

interface PageRendererProps {
  pageType: string;
  data: any;
  referenceIndex?: Record<string, string>;
}

export function PageRenderer({ pageType, data, referenceIndex }: PageRendererProps) {
  switch (pageType) {
    case "landing":
      return <LandingPage data={data} />;
    case "guide":
      return <GuidePage data={data} />;
    case "module":
      return <ModulePage data={data} />;
    case "member":
      return <MemberPage data={data} referenceIndex={referenceIndex} />;
    case "endpoint":
      return <EndpointPage data={data} referenceIndex={referenceIndex} />;
    case "flow":
      return <FlowPage data={data} referenceIndex={referenceIndex} />;
    case "data-model":
      return <DataModelPage data={data} referenceIndex={referenceIndex} />;
    case "error-catalog":
      return <ErrorCatalogPage data={data} />;
    case "event-catalog":
      return <EventCatalogPage data={data} />;
    case "graph":
      return <GraphPage data={data} />;
    case "operations":
      return <OperationsPage data={data} />;
    case "changelog":
      return <ChangelogPage />;
    case "data-store":
      return <DataStorePage data={data} />;
    case "configuration":
      return <ConfigurationPage data={data} />;
    case "security":
      return <SecurityPage data={data} />;
    case "dependency-map":
      return <DependencyMapPage data={data} />;
    case "privacy":
      return <PrivacyPage data={data} />;
    case "test-overview":
      return <TestOverviewPage data={data} />;
    case "intent-graph":
      return <IntentGraphPage data={data} />;
    default:
      return (
        <div className="text-text-secondary">
          <p>Unknown page type: <code className="font-mono text-text-primary">{pageType}</code></p>
        </div>
      );
  }
}
