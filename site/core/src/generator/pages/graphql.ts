/**
 * GraphQL page generator.
 *
 * Produces a GeneratedPage for GraphQL schema documentation,
 * including queries, mutations, subscriptions, and type definitions.
 */

import type {
  GeneratedPage,
  GraphQLPageData,
  GraphQLOperation,
  GraphQLType,
} from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { graphqlPageSlug } from "../slug.js";

export interface GraphQLPageInput {
  queries: GraphQLOperation[];
  mutations: GraphQLOperation[];
  subscriptions: GraphQLOperation[];
  types: GraphQLType[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateGraphQLPage(input: GraphQLPageInput): GeneratedPage {
  const { queries, mutations, subscriptions, types, artifactLabel, artifactColor } = input;
  const totalOps = queries.length + mutations.length + subscriptions.length;

  const data: GraphQLPageData = {
    type: PageType.GRAPHQL,
    queries,
    mutations,
    subscriptions,
    types,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.GRAPHQL,
    slug: graphqlPageSlug(artifactLabel),
    title: "GraphQL API",
    description: `${totalOps} operations, ${types.length} types`,
    artifactLabel,
    artifactColor,
    data,
  };
}
