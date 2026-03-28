/**
 * gRPC page generator.
 *
 * Produces a GeneratedPage for gRPC service definitions,
 * including services, methods (unary, server-streaming,
 * client-streaming, bidi), and proto message types.
 */

import type {
  GeneratedPage,
  GrpcPageData,
  GrpcService,
  GrpcMessage,
} from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { grpcPageSlug } from "../slug.js";

export interface GrpcPageInput {
  services: GrpcService[];
  messages: GrpcMessage[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateGrpcPage(input: GrpcPageInput): GeneratedPage {
  const { services, messages, artifactLabel, artifactColor } = input;
  const totalMethods = services.reduce((sum, s) => sum + s.methods.length, 0);

  const data: GrpcPageData = {
    type: PageType.GRPC,
    services,
    messages,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.GRPC,
    slug: grpcPageSlug(artifactLabel),
    title: "gRPC Services",
    description: `${services.length} services, ${totalMethods} methods, ${messages.length} message types`,
    artifactLabel,
    artifactColor,
    data,
  };
}
