/**
 * Data store page generator.
 *
 * Produces a GeneratedPage listing all data stores (databases, caches,
 * message queues) defined in an artifact's specification.
 */

import type { DataStore } from "../../types/docspec.js";
import type { GeneratedPage, DataStorePageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { dataStorePageSlug } from "../slug.js";

export interface DataStorePageInput {
  dataStores: DataStore[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateDataStorePage(input: DataStorePageInput): GeneratedPage {
  const { dataStores, artifactLabel, artifactColor } = input;

  const data: DataStorePageData = {
    type: PageType.DATA_STORE,
    dataStores,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.DATA_STORE,
    slug: dataStorePageSlug(),
    title: "Data Stores",
    description: `Data stores and persistence layers in ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
