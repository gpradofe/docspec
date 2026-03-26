import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @docspec/core before importing the command
vi.mock("@docspec/core", () => ({
  loadConfig: vi.fn(),
  resolveArtifacts: vi.fn(),
}));

// Mock ora to avoid spinner output during tests
vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    fail: vi.fn(),
  }),
}));

// Mock chalk to pass strings through without ANSI codes
vi.mock("chalk", () => {
  const identity = (s: string) => s;
  const handler: ProxyHandler<object> = {
    get: () => new Proxy(identity, handler),
    apply: (_target, _thisArg, args: unknown[]) => args[0],
  };
  return { default: new Proxy(identity, handler) };
});

import { loadConfig, resolveArtifacts } from "@docspec/core";
import { coverageCommand } from "../../commands/coverage.js";

const mockLoadConfig = vi.mocked(loadConfig);
const mockResolveArtifacts = vi.mocked(resolveArtifacts);

// Prevent process.exit from killing the test runner
vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadConfig.mockResolvedValue({
    site: { name: "Test Site" },
    artifacts: [],
    build: { cacheDir: ".cache" },
  });
});

describe("coverageCommand", () => {
  it("prints coverage percentage for each artifact", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "my-service",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: { groupId: "com.example", artifactId: "my-service", version: "1.0.0", language: "java" },
          modules: [],
          discovery: {
            mode: "auto",
            totalClasses: 20,
            documentedClasses: 16,
            coveragePercent: 80.0,
            totalMethods: 50,
            documentedMethods: 40,
            totalParams: 100,
            documentedParams: 75,
          },
        },
      },
    ]);

    await coverageCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("my-service");
    expect(output).toContain("80.0%");

    consoleSpy.mockRestore();
  });

  it("computes overall coverage across multiple artifacts", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "lib-a",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: { groupId: "com.example", artifactId: "lib-a", version: "1.0.0", language: "java" },
          modules: [],
          discovery: {
            totalClasses: 10,
            documentedClasses: 8,
            coveragePercent: 80.0,
            totalMethods: 30,
          },
        },
      },
      {
        label: "lib-b",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: { groupId: "com.example", artifactId: "lib-b", version: "1.0.0", language: "java" },
          modules: [],
          discovery: {
            totalClasses: 10,
            documentedClasses: 2,
            coveragePercent: 20.0,
            totalMethods: 20,
          },
        },
      },
    ]);

    await coverageCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    // Overall: 10 documented out of 20 total = 50.0%
    expect(output).toContain("Overall");
    expect(output).toContain("50.0%");

    consoleSpy.mockRestore();
  });

  it("handles artifacts with no discovery data", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "bare-lib",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: { groupId: "com.example", artifactId: "bare-lib", version: "1.0.0", language: "java" },
          modules: [],
        },
      },
    ]);

    await coverageCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("bare-lib");
    expect(output).toContain("0.0%");
    // Overall should show 0.0% when no classes at all
    expect(output).toContain("Overall");

    consoleSpy.mockRestore();
  });
});
