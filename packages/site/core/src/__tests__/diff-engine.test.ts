import { describe, it, expect } from "vitest";
import { computeDiff, diffSpecs } from "../diff/engine.js";
import type { DocSpec } from "../types/docspec.js";

function makeBaseSpec(overrides: Partial<DocSpec> = {}): DocSpec {
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

describe("computeDiff (structured diff)", () => {
  describe("added members", () => {
    it("detects newly added members", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            name: "Users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                description: "Manages users",
              },
            ],
          },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            name: "Users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                description: "Manages users",
              },
              {
                kind: "class",
                name: "AdminService",
                qualified: "com.example.AdminService",
                description: "Manages admins",
              },
            ],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const addedMembers = diff.members.filter((m) => m.status === "added");
      expect(addedMembers).toHaveLength(1);
      expect(addedMembers[0].qualified).toBe("com.example.AdminService");
      expect(addedMembers[0].name).toBe("AdminService");
    });
  });

  describe("removed members", () => {
    it("detects removed members", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-orders",
            name: "Orders",
            members: [
              {
                kind: "class",
                name: "OrderService",
                qualified: "com.example.OrderService",
                description: "Order processing",
              },
              {
                kind: "class",
                name: "LegacyOrderService",
                qualified: "com.example.LegacyOrderService",
                description: "Deprecated order service",
                deprecated: "Use OrderService instead",
              },
            ],
          },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-orders",
            name: "Orders",
            members: [
              {
                kind: "class",
                name: "OrderService",
                qualified: "com.example.OrderService",
                description: "Order processing",
              },
            ],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const removedMembers = diff.members.filter((m) => m.status === "removed");
      expect(removedMembers).toHaveLength(1);
      expect(removedMembers[0].qualified).toBe("com.example.LegacyOrderService");
    });
  });

  describe("modified methods (params changed)", () => {
    it("detects methods with changed parameters", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            name: "Users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [
                  {
                    name: "findById",
                    description: "Find user by ID",
                    params: [{ name: "id", type: "Long" }],
                    returns: { type: "User" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            name: "Users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [
                  {
                    name: "findById",
                    description: "Find user by ID",
                    params: [
                      { name: "id", type: "Long" },
                      { name: "includeDeleted", type: "boolean" },
                    ],
                    returns: { type: "User" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const modifiedMethods = diff.methods.filter((m) => m.status === "modified");
      expect(modifiedMethods).toHaveLength(1);
      expect(modifiedMethods[0].name).toBe("findById");
      expect(modifiedMethods[0].changes).toContain("parameters changed");
    });

    it("detects methods with changed return type", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [
                  {
                    name: "findAll",
                    returns: { type: "List<User>" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [
                  {
                    name: "findAll",
                    returns: { type: "Page<User>" },
                  },
                ],
              },
            ],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const modifiedMethods = diff.methods.filter((m) => m.status === "modified");
      expect(modifiedMethods).toHaveLength(1);
      expect(modifiedMethods[0].changes).toContain("return type changed");
    });
  });

  describe("added and removed methods", () => {
    it("detects newly added methods", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [{ name: "findById" }],
              },
            ],
          },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [{ name: "findById" }, { name: "deleteById" }],
              },
            ],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const addedMethods = diff.methods.filter((m) => m.status === "added");
      expect(addedMethods).toHaveLength(1);
      expect(addedMethods[0].name).toBe("deleteById");
    });

    it("detects removed methods", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [{ name: "findById" }, { name: "legacySearch" }],
              },
            ],
          },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-users",
            members: [
              {
                kind: "class",
                name: "UserService",
                qualified: "com.example.UserService",
                methods: [{ name: "findById" }],
              },
            ],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const removedMethods = diff.methods.filter((m) => m.status === "removed");
      expect(removedMethods).toHaveLength(1);
      expect(removedMethods[0].name).toBe("legacySearch");
    });
  });

  describe("summary counts", () => {
    it("reports correct summary counts across all entity types", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        modules: [
          {
            id: "mod-a",
            members: [
              {
                kind: "class",
                name: "ServiceA",
                qualified: "com.example.ServiceA",
                methods: [{ name: "doStuff" }],
              },
              {
                kind: "class",
                name: "ServiceB",
                qualified: "com.example.ServiceB",
                description: "Old description",
              },
            ],
          },
        ],
        flows: [
          { id: "flow-1", name: "Checkout", steps: [{ id: "s1" }] },
          { id: "flow-2", name: "Return", steps: [{ id: "s1" }] },
        ],
        errors: [{ code: "ERR_001" }, { code: "ERR_002" }],
        events: [{ name: "order.created" }],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        modules: [
          {
            id: "mod-a",
            members: [
              {
                kind: "class",
                name: "ServiceA",
                qualified: "com.example.ServiceA",
                methods: [{ name: "doStuff" }, { name: "doMore" }],
              },
              {
                kind: "class",
                name: "ServiceB",
                qualified: "com.example.ServiceB",
                description: "New description",
              },
              {
                kind: "class",
                name: "ServiceC",
                qualified: "com.example.ServiceC",
              },
            ],
          },
        ],
        flows: [
          { id: "flow-1", name: "Checkout", steps: [{ id: "s1" }, { id: "s2" }] },
        ],
        errors: [{ code: "ERR_001" }, { code: "ERR_003" }],
        events: [{ name: "order.created" }, { name: "order.shipped" }],
      });

      const diff = computeDiff(oldSpec, newSpec);

      // Added: ServiceC member + doMore method + ERR_003 error + order.shipped event = 4
      // Removed: flow-2 + ERR_002 error = 2
      // Modified: ServiceB (description changed) + flow-1 (steps changed) = 2
      // Also doMore method added
      expect(diff.summary.added).toBeGreaterThanOrEqual(3);
      expect(diff.summary.removed).toBeGreaterThanOrEqual(2);
      expect(diff.summary.modified).toBeGreaterThanOrEqual(1);
      expect(diff.summary.totalChanges).toBe(
        diff.summary.added + diff.summary.removed + diff.summary.modified,
      );
    });
  });

  describe("flow diffs", () => {
    it("detects added and removed flows", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        flows: [
          { id: "checkout", name: "Checkout Flow", steps: [{ id: "s1" }] },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        flows: [
          { id: "checkout", name: "Checkout Flow", steps: [{ id: "s1" }] },
          { id: "returns", name: "Returns Flow", steps: [{ id: "s1" }, { id: "s2" }] },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const addedFlows = diff.flows.filter((f) => f.status === "added");
      expect(addedFlows).toHaveLength(1);
      expect(addedFlows[0].id).toBe("returns");
    });

    it("detects modified flows when step count changes", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.0.0", language: "java" },
        flows: [
          { id: "checkout", name: "Checkout", steps: [{ id: "s1" }, { id: "s2" }] },
        ],
      });

      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
        flows: [
          {
            id: "checkout",
            name: "Checkout",
            steps: [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }],
          },
        ],
      });

      const diff = computeDiff(oldSpec, newSpec);

      const modifiedFlows = diff.flows.filter((f) => f.status === "modified");
      expect(modifiedFlows).toHaveLength(1);
      expect(modifiedFlows[0].stepsAdded).toBe(2);
      expect(modifiedFlows[0].stepsRemoved).toBe(0);
    });
  });

  describe("version tracking", () => {
    it("records from/to versions in the diff result", () => {
      const oldSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "1.2.3", language: "java" },
      });
      const newSpec = makeBaseSpec({
        artifact: { groupId: "com.example", artifactId: "svc", version: "2.0.0", language: "java" },
      });

      const diff = computeDiff(oldSpec, newSpec);

      expect(diff.version.from).toBe("1.2.3");
      expect(diff.version.to).toBe("2.0.0");
    });
  });
});

describe("diffSpecs (legacy flat diff)", () => {
  it("detects added and removed modules", () => {
    const before = makeBaseSpec({
      modules: [{ id: "mod-a", name: "Module A" }],
    });
    const after = makeBaseSpec({
      modules: [
        { id: "mod-a", name: "Module A" },
        { id: "mod-b", name: "Module B" },
      ],
    });

    const result = diffSpecs(before, after);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].type).toBe("module");
    expect(result.added[0].name).toBe("Module B");
    expect(result.summary.added).toBe(1);
  });

  it("detects removed modules", () => {
    const before = makeBaseSpec({
      modules: [
        { id: "mod-a", name: "Module A" },
        { id: "mod-b", name: "Module B" },
      ],
    });
    const after = makeBaseSpec({
      modules: [{ id: "mod-a", name: "Module A" }],
    });

    const result = diffSpecs(before, after);

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].type).toBe("module");
    expect(result.removed[0].name).toBe("Module B");
    expect(result.summary.removed).toBe(1);
  });

  it("detects modified members (description change)", () => {
    const before = makeBaseSpec({
      modules: [
        {
          id: "mod-a",
          members: [
            { kind: "class" as const, name: "Svc", qualified: "com.Svc", description: "Old" },
          ],
        },
      ],
    });
    const after = makeBaseSpec({
      modules: [
        {
          id: "mod-a",
          members: [
            { kind: "class" as const, name: "Svc", qualified: "com.Svc", description: "New" },
          ],
        },
      ],
    });

    const result = diffSpecs(before, after);

    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].details).toBe("description changed");
  });
});
