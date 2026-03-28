import { describe, it, expect } from "vitest";
import { computeReferencedInFromSpecs } from "../cross-linker/referenced-in.js";
import type { DocSpec } from "../types/docspec.js";

function makeSpec(overrides: Partial<DocSpec> = {}): DocSpec {
  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "com.example",
      artifactId: "my-service",
      version: "1.0.0",
      language: "java",
    },
    modules: [],
    ...overrides,
  };
}

describe("computeReferencedInFromSpecs", () => {
  describe("endpoint references", () => {
    it("maps endpoints to the members that implement them", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-users",
            name: "Users",
            members: [
              {
                kind: "class",
                name: "UserController",
                qualified: "com.example.UserController",
                methods: [
                  {
                    name: "getUser",
                    endpointMapping: { method: "GET", path: "/api/users/{id}" },
                  },
                  {
                    name: "createUser",
                    endpointMapping: { method: "POST", path: "/api/users" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      const refs = result.memberReferences.get("com.example.UserController");
      expect(refs).toBeDefined();
      expect(refs!.endpoints).toHaveLength(2);
      expect(refs!.endpoints).toContain("GET /api/users/{id}");
      expect(refs!.endpoints).toContain("POST /api/users");
    });

    it("does not create references for methods without endpoint mappings", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [
                  { name: "findById", description: "Finds user by ID" },
                  { name: "deleteById", description: "Deletes user by ID" },
                ],
              },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      expect(result.memberReferences.has("com.example.UserService")).toBe(false);
    });

    it("handles members with a mix of endpoint and non-endpoint methods", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-orders",
            members: [
              {
                kind: "class",
                name: "OrderController",
                qualified: "com.example.OrderController",
                methods: [
                  {
                    name: "getOrder",
                    endpointMapping: { method: "GET", path: "/api/orders/{id}" },
                  },
                  { name: "processInternal", description: "Internal processing" },
                ],
              },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      const refs = result.memberReferences.get("com.example.OrderController");
      expect(refs).toBeDefined();
      expect(refs!.endpoints).toHaveLength(1);
      expect(refs!.endpoints).toContain("GET /api/orders/{id}");
    });
  });

  describe("flow step actor references", () => {
    it("maps flow step actors to members", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-checkout",
            members: [
              {
                kind: "class",
                name: "PaymentService",
                qualified: "com.example.PaymentService",
              },
              {
                kind: "class",
                name: "InventoryService",
                qualified: "com.example.InventoryService",
              },
            ],
          },
        ],
        flows: [
          {
            id: "checkout-flow",
            name: "Checkout Flow",
            steps: [
              {
                id: "step-1",
                name: "Process Payment",
                actorQualified: "com.example.PaymentService",
              },
              {
                id: "step-2",
                name: "Reserve Inventory",
                actorQualified: "com.example.InventoryService",
              },
              {
                id: "step-3",
                name: "Send Notification",
                actorQualified: "com.example.PaymentService",
              },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      const paymentRefs = result.memberReferences.get("com.example.PaymentService");
      expect(paymentRefs).toBeDefined();
      expect(paymentRefs!.flows).toContain("checkout-flow");
      // PaymentService appears in step-1 and step-3 but should be deduplicated
      expect(paymentRefs!.flows).toHaveLength(1);

      const inventoryRefs = result.memberReferences.get("com.example.InventoryService");
      expect(inventoryRefs).toBeDefined();
      expect(inventoryRefs!.flows).toContain("checkout-flow");
    });

    it("handles multiple flows referencing the same member", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-auth",
            members: [
              {
                kind: "class",
                name: "AuthService",
                qualified: "com.example.AuthService",
              },
            ],
          },
        ],
        flows: [
          {
            id: "login-flow",
            name: "Login",
            steps: [
              { id: "s1", actorQualified: "com.example.AuthService" },
            ],
          },
          {
            id: "signup-flow",
            name: "Signup",
            steps: [
              { id: "s1", actorQualified: "com.example.AuthService" },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      const refs = result.memberReferences.get("com.example.AuthService");
      expect(refs).toBeDefined();
      expect(refs!.flows).toHaveLength(2);
      expect(refs!.flows).toContain("login-flow");
      expect(refs!.flows).toContain("signup-flow");
    });
  });

  describe("context references", () => {
    it("maps contexts to attached members via attachedTo", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-scheduler",
            members: [
              {
                kind: "class",
                name: "DataSyncJob",
                qualified: "com.example.DataSyncJob",
              },
              {
                kind: "class",
                name: "ReportGenerator",
                qualified: "com.example.ReportGenerator",
              },
            ],
          },
        ],
        contexts: [
          {
            id: "data-sync-context",
            name: "Data Synchronization",
            attachedTo: "com.example.DataSyncJob",
            schedule: { type: "cron", cron: "0 0 * * *" },
          },
          {
            id: "report-generation-context",
            name: "Report Generation",
            attachedTo: "com.example.ReportGenerator",
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      const syncRefs = result.memberReferences.get("com.example.DataSyncJob");
      expect(syncRefs).toBeDefined();
      expect(syncRefs!.contexts).toHaveLength(1);
      expect(syncRefs!.contexts).toContain("data-sync-context");

      const reportRefs = result.memberReferences.get("com.example.ReportGenerator");
      expect(reportRefs).toBeDefined();
      expect(reportRefs!.contexts).toHaveLength(1);
      expect(reportRefs!.contexts).toContain("report-generation-context");
    });

    it("ignores contexts without attachedTo", () => {
      const spec = makeSpec({
        modules: [],
        contexts: [
          {
            id: "global-context",
            name: "Global Configuration",
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      expect(result.memberReferences.size).toBe(0);
    });
  });

  describe("combined references", () => {
    it("aggregates endpoints, flows, and contexts for the same member", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-orders",
            members: [
              {
                kind: "class",
                name: "OrderService",
                qualified: "com.example.OrderService",
                methods: [
                  {
                    name: "createOrder",
                    endpointMapping: { method: "POST", path: "/api/orders" },
                  },
                ],
              },
            ],
          },
        ],
        flows: [
          {
            id: "order-flow",
            name: "Order Processing",
            steps: [
              { id: "s1", actorQualified: "com.example.OrderService" },
            ],
          },
        ],
        contexts: [
          {
            id: "order-context",
            name: "Order Management",
            attachedTo: "com.example.OrderService",
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      const refs = result.memberReferences.get("com.example.OrderService");
      expect(refs).toBeDefined();
      expect(refs!.endpoints).toHaveLength(1);
      expect(refs!.flows).toHaveLength(1);
      expect(refs!.contexts).toHaveLength(1);
    });
  });

  describe("multiple specs", () => {
    it("aggregates references across multiple DocSpec objects", () => {
      const spec1 = makeSpec({
        modules: [
          {
            id: "mod-a",
            members: [
              {
                kind: "class",
                name: "SharedService",
                qualified: "com.example.SharedService",
                methods: [
                  {
                    name: "doWork",
                    endpointMapping: { method: "POST", path: "/api/work" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const spec2 = makeSpec({
        artifact: {
          groupId: "com.example",
          artifactId: "other-service",
          version: "1.0.0",
          language: "java",
        },
        modules: [],
        flows: [
          {
            id: "cross-service-flow",
            name: "Cross Service",
            steps: [
              { id: "s1", actorQualified: "com.example.SharedService" },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec1, spec2]);

      const refs = result.memberReferences.get("com.example.SharedService");
      expect(refs).toBeDefined();
      expect(refs!.endpoints).toHaveLength(1);
      expect(refs!.flows).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty specs array", () => {
      const result = computeReferencedInFromSpecs([]);

      expect(result.memberReferences.size).toBe(0);
    });

    it("handles specs with no modules, flows, or contexts", () => {
      const spec = makeSpec({ modules: [] });

      const result = computeReferencedInFromSpecs([spec]);

      expect(result.memberReferences.size).toBe(0);
    });

    it("handles members with empty methods arrays", () => {
      const spec = makeSpec({
        modules: [
          {
            id: "mod-empty",
            members: [
              {
                kind: "class",
                name: "EmptyClass",
                qualified: "com.example.EmptyClass",
                methods: [],
              },
            ],
          },
        ],
      });

      const result = computeReferencedInFromSpecs([spec]);

      expect(result.memberReferences.has("com.example.EmptyClass")).toBe(false);
    });
  });
});
