/**
 * Data model page generator.
 *
 * Produces a GeneratedPage for a single JPA / persistence data model,
 * showing fields, relationships, and JSON shape.
 */

import type { DataModel } from "../../types/docspec.js";
import type { GeneratedPage, DataModelPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { dataModelPageSlug } from "../slug.js";

export interface DataModelPageInput {
  dataModel: DataModel;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateDataModelPage(input: DataModelPageInput): GeneratedPage {
  const { dataModel, artifactLabel, artifactColor } = input;

  const data: DataModelPageData = {
    type: PageType.DATA_MODEL,
    dataModel,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.DATA_MODEL,
    slug: dataModelPageSlug(dataModel.name),
    title: dataModel.name,
    description: dataModel.description,
    artifactLabel,
    artifactColor,
    data,
  };
}
