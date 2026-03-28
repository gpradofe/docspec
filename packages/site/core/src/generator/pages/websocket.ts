/**
 * WebSocket page generator.
 *
 * Produces a GeneratedPage for WebSocket endpoint definitions,
 * including channels, inbound/outbound message types, and events.
 */

import type {
  GeneratedPage,
  WebSocketPageData,
  WebSocketChannel,
  WebSocketMessage,
  WebSocketEvent,
} from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { websocketPageSlug } from "../slug.js";

export interface WebSocketPageInput {
  url?: string;
  channels: WebSocketChannel[];
  inboundMessages: WebSocketMessage[];
  outboundMessages: WebSocketMessage[];
  events: WebSocketEvent[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateWebSocketPage(input: WebSocketPageInput): GeneratedPage {
  const { url, channels, inboundMessages, outboundMessages, events, artifactLabel, artifactColor } = input;
  const totalMessages = inboundMessages.length + outboundMessages.length;

  const data: WebSocketPageData = {
    type: PageType.WEBSOCKET,
    url,
    channels,
    inboundMessages,
    outboundMessages,
    events,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.WEBSOCKET,
    slug: websocketPageSlug(artifactLabel),
    title: "WebSocket API",
    description: `${channels.length} channels, ${totalMessages} message types, ${events.length} events`,
    artifactLabel,
    artifactColor,
    data,
  };
}
