/**
 * Builds a global Map<qualifiedName, pageSlug> from all generated pages.
 * Used for TypeLink resolution and cross-linking.
 */

import type {
  GeneratedPage,
  MemberPageData,
  DataModelPageData,
  EndpointPageData,
  DataStorePageData,
  ConfigurationPageData,
  SecurityPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";

export function buildReferenceIndex(pages: GeneratedPage[]): Record<string, string> {
  const index: Record<string, string> = {};

  for (const page of pages) {
    switch (page.type) {
      case PageType.MEMBER: {
        const data = page.data as MemberPageData;
        // Index by qualified name
        index[data.member.qualified] = page.slug;
        // Also index by simple name for convenience
        index[data.member.name] = page.slug;
        break;
      }
      case PageType.DATA_MODEL: {
        const data = page.data as DataModelPageData;
        index[data.dataModel.qualified] = page.slug;
        index[data.dataModel.name] = page.slug;
        break;
      }
      case PageType.ENDPOINT: {
        const data = page.data as EndpointPageData;
        const mapping = data.method.endpointMapping;
        if (mapping?.method && mapping?.path) {
          index[`${mapping.method} ${mapping.path}`] = page.slug;
        }
        break;
      }
      case PageType.FLOW: {
        index[page.title] = page.slug;
        break;
      }

      // Index DATA_STORE pages by store name
      case PageType.DATA_STORE: {
        const storeData = page.data as DataStorePageData;
        for (const store of storeData.dataStores) {
          if (store.id) index[store.id] = page.slug;
          if (store.name) index[store.name] = page.slug;
        }
        break;
      }

      // Index CONFIGURATION pages by key
      case PageType.CONFIGURATION: {
        const configData = page.data as ConfigurationPageData;
        for (const prop of configData.properties) {
          if (prop.key) index[prop.key] = page.slug;
        }
        break;
      }

      // Index SECURITY pages
      case PageType.SECURITY: {
        const secData = page.data as SecurityPageData;
        if (secData.security.authMechanism) {
          index[`security:${secData.security.authMechanism}`] = page.slug;
        }
        for (const role of secData.security.roles ?? []) {
          index[`role:${role}`] = page.slug;
        }
        break;
      }

      default:
        break;
    }
  }

  return index;
}
