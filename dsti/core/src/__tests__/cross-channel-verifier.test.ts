import { describe, it, expect } from "vitest";
import { CrossChannelVerifier } from "../cross-channel-verifier.js";
import type { IntentMethod, IntentSignals } from "../intent-graph.js";

function makeMethod(
  qualified: string,
  signals: IntentSignals,
): IntentMethod {
  return { qualified, intentSignals: signals };
}

describe("CrossChannelVerifier", () => {
  const verifier = new CrossChannelVerifier();

  describe("naming vs guards", () => {
    it("produces a warning when a validation method has 0 guard clauses", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.UserService.validateEmail", {
          nameSemantics: { verb: "validate", object: "Email", intent: "validation" },
          guardClauses: 0,
        }),
      ];

      const result = verifier.verify(methods);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe("warning");
      expect(result.issues[0].channel1).toBe("nameSemantics");
      expect(result.issues[0].channel2).toBe("guardClauses");
      expect(result.issues[0].message).toContain("validation");
      expect(result.issues[0].message).toContain("no guard clauses");
    });

    it("produces no warning when a validation method has guard clauses", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.UserService.validateEmail", {
          nameSemantics: { verb: "validate", object: "Email", intent: "validation" },
          guardClauses: [
            { condition: "email != null", error: "IllegalArgumentException" },
            { condition: "email.contains('@')", error: "ValidationException" },
          ],
        }),
      ];

      const result = verifier.verify(methods);

      const namingVsGuardIssues = result.issues.filter(
        (i) => i.channel1 === "nameSemantics" && i.channel2 === "guardClauses",
      );
      expect(namingVsGuardIssues).toHaveLength(0);
    });
  });

  describe("naming vs data flow", () => {
    it("produces a warning when a query method has no data reads", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.OrderRepo.queryOrders", {
          nameSemantics: { verb: "query", object: "Orders", intent: "query" },
          dataFlow: { reads: [], writes: [] },
        }),
      ];

      const result = verifier.verify(methods);

      const dataFlowIssues = result.issues.filter(
        (i) => i.channel1 === "nameSemantics" && i.channel2 === "dataFlow",
      );
      expect(dataFlowIssues).toHaveLength(1);
      expect(dataFlowIssues[0].severity).toBe("warning");
      expect(dataFlowIssues[0].message).toContain("query");
      expect(dataFlowIssues[0].message).toContain("no data reads");
    });

    it("produces a warning when a mutation method has no data writes", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.UserService.updateProfile", {
          nameSemantics: { verb: "update", object: "Profile", intent: "mutation" },
          dataFlow: { reads: ["userRepository"], writes: [] },
        }),
      ];

      const result = verifier.verify(methods);

      const dataFlowIssues = result.issues.filter(
        (i) => i.channel1 === "nameSemantics" && i.channel2 === "dataFlow",
      );
      expect(dataFlowIssues).toHaveLength(1);
      expect(dataFlowIssues[0].message).toContain("mutation");
      expect(dataFlowIssues[0].message).toContain("no data writes");
    });
  });

  describe("dependencies vs naming", () => {
    it("produces an info when a calculation method has more than 5 dependencies", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.PricingEngine.calculateTotal", {
          nameSemantics: { verb: "calculate", object: "Total", intent: "calculation" },
          dependencies: [
            "taxService",
            "discountService",
            "currencyConverter",
            "inventoryService",
            "shippingCalculator",
            "loyaltyProgram",
          ],
        }),
      ];

      const result = verifier.verify(methods);

      const depIssues = result.issues.filter(
        (i) => i.channel1 === "dependencies" && i.channel2 === "nameSemantics",
      );
      expect(depIssues).toHaveLength(1);
      expect(depIssues[0].severity).toBe("info");
      expect(depIssues[0].message).toContain("calculation");
      expect(depIssues[0].message).toContain("6 external dependencies");
    });

    it("produces no info when a calculation method has few dependencies", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.MathUtils.calculateArea", {
          nameSemantics: { verb: "calculate", object: "Area", intent: "calculation" },
          dependencies: ["geometryHelper"],
        }),
      ];

      const result = verifier.verify(methods);

      const depIssues = result.issues.filter(
        (i) => i.channel1 === "dependencies" && i.channel2 === "nameSemantics",
      );
      expect(depIssues).toHaveLength(0);
    });
  });

  describe("clean method", () => {
    it("produces no issues for a well-formed method", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.UserService.findById", {
          nameSemantics: { verb: "find", object: "User", intent: "query" },
          guardClauses: [{ condition: "id != null", error: "IllegalArgumentException" }],
          dataFlow: { reads: ["userRepository"], writes: [] },
          errorHandling: { catchBlocks: 1, caughtTypes: ["DataAccessException"] },
          dependencies: ["userRepository"],
        }),
      ];

      const result = verifier.verify(methods);

      expect(result.issues).toHaveLength(0);
      expect(result.issueCount).toBe(0);
    });
  });

  describe("methodsChecked count", () => {
    it("reports the correct number of methods checked", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.A.methodA", {
          nameSemantics: { verb: "get", object: "Data", intent: "query" },
          dataFlow: { reads: ["repo"], writes: [] },
        }),
        makeMethod("com.example.B.methodB", {
          nameSemantics: { verb: "save", object: "Data", intent: "mutation" },
          dataFlow: { reads: [], writes: ["repo"] },
        }),
        makeMethod("com.example.C.methodC", {
          nameSemantics: { verb: "process", object: "Batch", intent: "transformation" },
        }),
      ];

      const result = verifier.verify(methods);

      expect(result.methodsChecked).toBe(3);
    });

    it("counts methods without signals toward methodsChecked", () => {
      const methods: IntentMethod[] = [
        { qualified: "com.example.NoSignals.method1" },
        makeMethod("com.example.WithSignals.method2", {
          nameSemantics: { verb: "get", object: "Data", intent: "query" },
          dataFlow: { reads: ["repo"], writes: [] },
        }),
      ];

      const result = verifier.verify(methods);

      expect(result.methodsChecked).toBe(2);
    });
  });

  describe("guards vs error handling", () => {
    it("produces an info when many guard clauses but no catch blocks", () => {
      const methods: IntentMethod[] = [
        makeMethod("com.example.Service.processOrder", {
          nameSemantics: { verb: "process", object: "Order", intent: "transformation" },
          guardClauses: [
            { condition: "order != null", error: "NPE" },
            { condition: "order.items.size() > 0", error: "IllegalState" },
            { condition: "order.total > 0", error: "IllegalArgument" },
            { condition: "order.customerId != null", error: "NPE" },
          ],
          errorHandling: { catchBlocks: 0 },
        }),
      ];

      const result = verifier.verify(methods);

      const guardErrorIssues = result.issues.filter(
        (i) => i.channel1 === "guardClauses" && i.channel2 === "errorHandling",
      );
      expect(guardErrorIssues).toHaveLength(1);
      expect(guardErrorIssues[0].severity).toBe("info");
      expect(guardErrorIssues[0].message).toContain("4 guard clauses");
      expect(guardErrorIssues[0].message).toContain("no catch blocks");
    });
  });
});
