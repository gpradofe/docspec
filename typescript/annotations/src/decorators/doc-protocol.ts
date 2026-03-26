// @docspec:module {
//   id: "docspec-ts-decorator-protocol",
//   name: "Protocol Binding Decorators",
//   description: "Defines protocol-specific decorators: @DocAsyncAPI (async messaging channels), @DocGRPC (gRPC service/method bindings), @DocGraphQL (query/mutation/subscription types), @DocWebSocket (WebSocket paths/messages), and @DocCommand (CQRS command aggregates).",
//   since: "3.0.0"
// }

import { setMetadata } from "../metadata.js";

export interface DocAsyncAPIOptions {
  channel?: string;
  operation?: string;
}

/** @docspec:deterministic */
export function DocAsyncAPI(options: DocAsyncAPIOptions = {}): ClassDecorator {
  return (target) => {
    setMetadata("asyncapi", options, target);
  };
}

export interface DocGRPCOptions {
  service?: string;
  method?: string;
}

/** @docspec:deterministic */
export function DocGRPC(options: DocGRPCOptions = {}): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) setMetadata("grpc", options, target, propertyKey);
    else setMetadata("grpc", options, target);
  };
}

export interface DocGraphQLOptions {
  type?: "query" | "mutation" | "subscription";
  name?: string;
}

/** @docspec:deterministic */
export function DocGraphQL(options: DocGraphQLOptions = {}): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) setMetadata("graphql", options, target, propertyKey);
    else setMetadata("graphql", options, target);
  };
}

export interface DocWebSocketOptions {
  path?: string;
  messages?: string[];
}

/** @docspec:deterministic */
export function DocWebSocket(options: DocWebSocketOptions = {}): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) setMetadata("websocket", options, target, propertyKey);
    else setMetadata("websocket", options, target);
  };
}

export interface DocCommandOptions {
  name?: string;
  aggregate?: string;
}

/** @docspec:deterministic */
export function DocCommand(options: DocCommandOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    setMetadata("command", options, target, propertyKey);
  };
}
