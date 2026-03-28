import { describe, it, expect } from "vitest";
import {
  traverseMethods,
  filterByDensity,
  getMethodsByIntent,
} from "../intent-graph.js";
import type { IntentGraph, IntentMethod } from "../intent-graph.js";

function buildGraph(methods: IntentMethod[]): IntentGraph {
  return { methods };
}

describe("intent-graph traversal utilities", () => {
  describe("traverseMethods", () => {
    it("walks all methods in an intent graph", () => {
      const graph = buildGraph([
        {
          qualified: "com.example.UserService.findById",
          intentSignals: {
            nameSemantics: { verb: "find", object: "User", intent: "query" },
            intentDensityScore: 0.6,
          },
        },
        {
          qualified: "com.example.UserService.createUser",
          intentSignals: {
            nameSemantics: { verb: "create", object: "User", intent: "creation" },
            intentDensityScore: 0.75,
          },
        },
        {
          qualified: "com.example.OrderService.processOrder",
          intentSignals: {
            nameSemantics: { verb: "process", object: "Order", intent: "transformation" },
            intentDensityScore: 0.5,
          },
        },
      ]);

      const methods = traverseMethods(graph);

      expect(methods).toHaveLength(3);
      expect(methods.map((m) => m.qualified)).toEqual([
        "com.example.UserService.findById",
        "com.example.UserService.createUser",
        "com.example.OrderService.processOrder",
      ]);
    });

    it("returns an empty array for an empty graph", () => {
      const graph: IntentGraph = {};

      const methods = traverseMethods(graph);

      expect(methods).toEqual([]);
    });

    it("returns an empty array for a graph with empty methods array", () => {
      const graph: IntentGraph = { methods: [] };

      const methods = traverseMethods(graph);

      expect(methods).toEqual([]);
    });
  });

  describe("filterByDensity", () => {
    const graph = buildGraph([
      {
        qualified: "com.example.Service.highDensity",
        intentSignals: {
          nameSemantics: { verb: "validate", object: "Input", intent: "validation" },
          intentDensityScore: 0.9,
        },
      },
      {
        qualified: "com.example.Service.mediumDensity",
        intentSignals: {
          nameSemantics: { verb: "process", object: "Data", intent: "transformation" },
          intentDensityScore: 0.5,
        },
      },
      {
        qualified: "com.example.Service.lowDensity",
        intentSignals: {
          nameSemantics: { verb: "get", object: "Config", intent: "query" },
          intentDensityScore: 0.2,
        },
      },
      {
        qualified: "com.example.Service.noScore",
        intentSignals: {
          nameSemantics: { verb: "do", object: "Something", intent: "unknown" },
        },
      },
    ]);

    it("filters methods by minimum ISD score threshold", () => {
      const highDensity = filterByDensity(graph, 0.8);

      expect(highDensity).toHaveLength(1);
      expect(highDensity[0].qualified).toBe("com.example.Service.highDensity");
    });

    it("includes methods at exactly the threshold", () => {
      const atThreshold = filterByDensity(graph, 0.5);

      expect(atThreshold).toHaveLength(2);
      expect(atThreshold.map((m) => m.qualified)).toContain(
        "com.example.Service.highDensity",
      );
      expect(atThreshold.map((m) => m.qualified)).toContain(
        "com.example.Service.mediumDensity",
      );
    });

    it("returns all methods for threshold 0", () => {
      const all = filterByDensity(graph, 0);

      expect(all).toHaveLength(4);
    });

    it("excludes methods with no intentDensityScore when threshold > 0", () => {
      const filtered = filterByDensity(graph, 0.1);

      expect(filtered.map((m) => m.qualified)).not.toContain(
        "com.example.Service.noScore",
      );
    });

    it("returns empty for unreachable threshold", () => {
      const none = filterByDensity(graph, 1.1);

      expect(none).toHaveLength(0);
    });
  });

  describe("getMethodsByIntent", () => {
    const graph = buildGraph([
      {
        qualified: "com.example.UserService.findById",
        intentSignals: {
          nameSemantics: { verb: "find", object: "User", intent: "query" },
        },
      },
      {
        qualified: "com.example.UserService.findAll",
        intentSignals: {
          nameSemantics: { verb: "find", object: "Users", intent: "query" },
        },
      },
      {
        qualified: "com.example.UserService.createUser",
        intentSignals: {
          nameSemantics: { verb: "create", object: "User", intent: "creation" },
        },
      },
      {
        qualified: "com.example.Validator.validateInput",
        intentSignals: {
          nameSemantics: { verb: "validate", object: "Input", intent: "validation" },
        },
      },
      {
        qualified: "com.example.Util.doSomething",
        intentSignals: {},
      },
      {
        qualified: "com.example.Legacy.run",
      },
    ]);

    it("groups methods by their inferred intent category", () => {
      const grouped = getMethodsByIntent(graph);

      expect(grouped.get("query")).toHaveLength(2);
      expect(grouped.get("creation")).toHaveLength(1);
      expect(grouped.get("validation")).toHaveLength(1);
    });

    it("puts methods without nameSemantics under 'unknown'", () => {
      const grouped = getMethodsByIntent(graph);

      const unknown = grouped.get("unknown");
      expect(unknown).toBeDefined();
      expect(unknown).toHaveLength(2);
      expect(unknown!.map((m) => m.qualified)).toContain(
        "com.example.Util.doSomething",
      );
      expect(unknown!.map((m) => m.qualified)).toContain(
        "com.example.Legacy.run",
      );
    });

    it("returns an empty map for an empty graph", () => {
      const emptyGraph: IntentGraph = { methods: [] };

      const grouped = getMethodsByIntent(emptyGraph);

      expect(grouped.size).toBe(0);
    });

    it("returns methods that can be accessed by intent key", () => {
      const grouped = getMethodsByIntent(graph);
      const queryMethods = grouped.get("query") ?? [];

      expect(queryMethods.map((m) => m.qualified)).toEqual([
        "com.example.UserService.findById",
        "com.example.UserService.findAll",
      ]);
    });
  });
});
