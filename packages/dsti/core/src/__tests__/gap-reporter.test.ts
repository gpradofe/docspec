import { describe, it, expect } from "vitest";
import { GapReporter } from "../gap-reporter.js";
import type { IntentMethod } from "../intent-graph.js";

function makeMethod(
  qualified: string,
  signals: Record<string, unknown>,
): IntentMethod {
  return { qualified, intentSignals: signals as IntentMethod["intentSignals"] };
}

describe("GapReporter", () => {
  const reporter = new GapReporter();

  describe("low ISD / missing nameSemantics", () => {
    it("flags methods with unknown or missing nameSemantics as high severity", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.Service.process", {
          nameSemantics: { verb: "process", object: "data", intent: "unknown" },
          intentDensityScore: 0.1,
        }),
        makeMethod("com.example.Service.handle", {
          intentDensityScore: 0.05,
        }),
      ];

      const reports = reporter.report(methods);

      expect(reports).toHaveLength(2);
      for (const report of reports) {
        const nameSemanticsGap = report.gaps.find((g) => g.channel === "nameSemantics");
        expect(nameSemanticsGap).toBeDefined();
        expect(nameSemanticsGap!.severity).toBe("high");
        expect(nameSemanticsGap!.recommendation).toContain("@DocMethod");
      }
    });

    it("does not flag methods with a known intent", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.UserService.findById", {
          nameSemantics: { verb: "find", object: "User", intent: "query" },
          dataFlow: { reads: ["userRepository"], writes: [] },
          intentDensityScore: 0.5,
        }),
      ];

      const reports = reporter.report(methods);

      // No nameSemantics gap expected; may still have other gaps
      for (const report of reports) {
        const nameSemanticsGap = report.gaps.find((g) => g.channel === "nameSemantics");
        expect(nameSemanticsGap).toBeUndefined();
      }
    });
  });

  describe("guard clauses for mutation/creation methods", () => {
    it("recommends guard clauses for mutation methods without input validation", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.OrderService.createOrder", {
          nameSemantics: { verb: "create", object: "Order", intent: "creation" },
          guardClauses: 0,
          intentDensityScore: 0.2,
        }),
      ];

      const reports = reporter.report(methods);

      expect(reports).toHaveLength(1);
      const guardGap = reports[0].gaps.find((g) => g.channel === "guardClauses");
      expect(guardGap).toBeDefined();
      expect(guardGap!.severity).toBe("medium");
      expect(guardGap!.recommendation).toContain("input validation");
    });

    it("does not recommend guard clauses for mutation methods that have guards", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.UserService.updateEmail", {
          nameSemantics: { verb: "update", object: "Email", intent: "mutation" },
          guardClauses: [
            { condition: "email != null", error: "IllegalArgumentException" },
          ],
          intentDensityScore: 0.35,
        }),
      ];

      const reports = reporter.report(methods);

      for (const report of reports) {
        const guardGap = report.gaps.find((g) => g.channel === "guardClauses");
        expect(guardGap).toBeUndefined();
      }
    });
  });

  describe("error handling gaps", () => {
    it("suggests error handling when many guards but no catch blocks", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.PaymentService.processPayment", {
          nameSemantics: { verb: "process", object: "Payment", intent: "transformation" },
          guardClauses: [
            { condition: "amount > 0", error: "IllegalArgument" },
            { condition: "currency != null", error: "NPE" },
            { condition: "account.isActive()", error: "IllegalState" },
          ],
          errorHandling: { catchBlocks: 0 },
          intentDensityScore: 0.3,
        }),
      ];

      const reports = reporter.report(methods);

      expect(reports).toHaveLength(1);
      const errorGap = reports[0].gaps.find((g) => g.channel === "errorHandling");
      expect(errorGap).toBeDefined();
      expect(errorGap!.severity).toBe("low");
      expect(errorGap!.recommendation).toContain("error handling");
    });
  });

  describe("data flow gaps for query methods", () => {
    it("recommends data source documentation for query methods without reads", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.ReportService.queryStats", {
          nameSemantics: { verb: "query", object: "Stats", intent: "query" },
          dataFlow: { reads: [], writes: [] },
          intentDensityScore: 0.15,
        }),
      ];

      const reports = reporter.report(methods);

      expect(reports).toHaveLength(1);
      const dataFlowGap = reports[0].gaps.find((g) => g.channel === "dataFlow");
      expect(dataFlowGap).toBeDefined();
      expect(dataFlowGap!.severity).toBe("medium");
      expect(dataFlowGap!.recommendation).toContain("data reads");
    });
  });

  describe("logging gaps for service methods", () => {
    it("recommends logging for methods with many dependencies but no log statements", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.IntegrationService.syncAll", {
          nameSemantics: { verb: "sync", object: "All", intent: "mutation" },
          guardClauses: [{ condition: "config != null", error: "NPE" }],
          dataFlow: { reads: [], writes: ["auditLog"] },
          dependencies: [
            "userService",
            "orderService",
            "inventoryService",
            "notificationService",
          ],
          logStatements: 0,
          intentDensityScore: 0.25,
        }),
      ];

      const reports = reporter.report(methods);

      expect(reports).toHaveLength(1);
      const loggingGap = reports[0].gaps.find((g) => g.channel === "logStatements");
      expect(loggingGap).toBeDefined();
      expect(loggingGap!.severity).toBe("low");
      expect(loggingGap!.recommendation).toContain("logging");
    });
  });

  describe("totalMethods count", () => {
    it("returns only methods with gaps (filters out clean methods)", () => {
      const methods: IntentMethod[] = [
        // Clean method -- no gaps expected
        makeMethod("com.example.CleanService.findById", {
          nameSemantics: { verb: "find", object: "User", intent: "query" },
          guardClauses: [{ condition: "id != null", error: "NPE" }],
          dataFlow: { reads: ["userRepo"], writes: [] },
          errorHandling: { catchBlocks: 1 },
          dependencies: ["userRepo"],
          logStatements: 2,
          intentDensityScore: 0.7,
        }),
        // Gap method -- missing nameSemantics
        makeMethod("com.example.BadService.doStuff", {
          intentDensityScore: 0.05,
        }),
        // Another gap method
        makeMethod("com.example.AnotherBad.run", {
          nameSemantics: { verb: "run", object: "Job", intent: "unknown" },
          intentDensityScore: 0.1,
        }),
      ];

      const reports = reporter.report(methods);

      // Only the 2 methods with gaps should be in the report
      expect(reports).toHaveLength(2);
      expect(reports.map((r) => r.method)).toContain("com.example.BadService.doStuff");
      expect(reports.map((r) => r.method)).toContain("com.example.AnotherBad.run");
    });

    it("preserves the ISD score from intentDensityScore in each report", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.Service.lowScore", {
          intentDensityScore: 0.12,
        }),
      ];

      const reports = reporter.report(methods);

      expect(reports).toHaveLength(1);
      expect(reports[0].isd).toBe(0.12);
    });
  });
});
