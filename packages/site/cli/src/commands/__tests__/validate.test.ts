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
import { validateCommand } from "../../commands/validate.js";

const mockLoadConfig = vi.mocked(loadConfig);
const mockResolveArtifacts = vi.mocked(resolveArtifacts);

// Prevent process.exit from killing the test runner
const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadConfig.mockResolvedValue({
    site: { name: "Test Site" },
    artifacts: [],
    build: { cacheDir: ".cache" },
  });
});

describe("validateCommand", () => {
  it("rejects specs with wrong version", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "my-lib",
        source: "local",
        spec: {
          docspec: "2.0.0" as never,
          artifact: { groupId: "com.example", artifactId: "my-lib", version: "1.0.0", language: "java" },
          modules: [],
        },
      },
    ]);

    await validateCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("my-lib");
    expect(output).toContain('invalid docspec version');
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });

  it("accepts valid specs", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "valid-lib",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: { groupId: "com.example", artifactId: "valid-lib", version: "1.0.0", language: "java" },
          modules: [{ id: "mod-1" }],
        },
      },
    ]);

    await validateCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("valid-lib");
    expect(output).toContain("valid");
    expect(mockExit).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("reports missing artifact.groupId", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "no-group",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: { groupId: undefined as never, artifactId: "no-group", version: "1.0.0", language: "java" },
          modules: [],
        },
      },
    ]);

    await validateCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("no-group");
    expect(output).toContain("missing artifact.groupId");
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });
});
