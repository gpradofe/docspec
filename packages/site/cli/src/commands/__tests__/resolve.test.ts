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
    succeed: vi.fn(),
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
import { resolveCommand } from "../../commands/resolve.js";

const mockLoadConfig = vi.mocked(loadConfig);
const mockResolveArtifacts = vi.mocked(resolveArtifacts);

// Prevent process.exit from killing the test runner
const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation((() => {}) as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveCommand", () => {
  it("loads config and resolves artifacts from a config file", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockLoadConfig.mockResolvedValue({
      site: { name: "DocSpec Docs" },
      artifacts: [
        { path: "./docspec.json", label: "DocSpec Processor" },
      ],
      build: { cacheDir: ".cache" },
    });

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "DocSpec Processor",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: {
            groupId: "io.docspec",
            artifactId: "docspec-processor-java",
            version: "3.0.0",
            language: "java",
          },
          modules: [
            {
              id: "core",
              name: "Core",
              members: [
                {
                  kind: "class",
                  name: "DocSpecProcessor",
                  qualified: "io.docspec.processor.DocSpecProcessor",
                },
                {
                  kind: "class",
                  name: "AutoDiscoveryScanner",
                  qualified: "io.docspec.processor.scanner.AutoDiscoveryScanner",
                },
              ],
            },
          ],
        },
      },
    ]);

    await resolveCommand({ config: "docspec.config.yaml" });

    // loadConfig should have been called with the resolved path
    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockResolveArtifacts).toHaveBeenCalledTimes(1);

    // Console output should mention the artifact
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("DocSpec Processor");
    expect(output).toContain("1 modules");
    expect(output).toContain("2 classes");

    consoleSpy.mockRestore();
  });

  it("resolves multiple local artifacts and reports stats", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockLoadConfig.mockResolvedValue({
      site: { name: "Multi-Artifact Site" },
      artifacts: [
        { path: "./annotations.json", label: "Annotations" },
        { path: "./processor.json", label: "Processor" },
      ],
      build: { cacheDir: ".cache" },
    });

    mockResolveArtifacts.mockResolvedValue([
      {
        label: "Annotations",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: {
            groupId: "io.docspec",
            artifactId: "docspec-annotations",
            version: "3.0.0",
            language: "java",
          },
          modules: [
            {
              id: "annotations",
              name: "Annotations",
              members: [
                {
                  kind: "annotation",
                  name: "DocModule",
                  qualified: "io.docspec.annotation.DocModule",
                },
              ],
            },
          ],
        },
      },
      {
        label: "Processor",
        source: "local",
        spec: {
          docspec: "3.0.0",
          artifact: {
            groupId: "io.docspec",
            artifactId: "docspec-processor",
            version: "3.0.0",
            language: "java",
          },
          modules: [
            {
              id: "pipeline",
              name: "Pipeline",
              members: [
                {
                  kind: "class",
                  name: "Processor",
                  qualified: "io.docspec.processor.Processor",
                },
                {
                  kind: "class",
                  name: "Scanner",
                  qualified: "io.docspec.processor.Scanner",
                },
                {
                  kind: "class",
                  name: "Serializer",
                  qualified: "io.docspec.processor.Serializer",
                },
              ],
            },
            {
              id: "dsti",
              name: "DSTI",
              members: [],
            },
          ],
        },
      },
    ]);

    await resolveCommand({ config: "docspec.config.yaml" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");

    // Should list both artifacts with their module/class counts
    expect(output).toContain("Annotations");
    expect(output).toContain("1 modules");
    expect(output).toContain("1 classes");
    expect(output).toContain("Processor");
    expect(output).toContain("2 modules");
    expect(output).toContain("3 classes");

    consoleSpy.mockRestore();
  });

  it("exits with error when config loading fails", async () => {
    mockLoadConfig.mockRejectedValue(
      new Error('Failed to read config file at "/bad/path/docspec.config.yaml"'),
    );

    await resolveCommand({ config: "/bad/path/docspec.config.yaml" });

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits with error when artifact resolution fails", async () => {
    mockLoadConfig.mockResolvedValue({
      site: { name: "Test Site" },
      artifacts: [{ path: "./missing.json" }],
      build: { cacheDir: ".cache" },
    });

    mockResolveArtifacts.mockRejectedValue(
      new Error("Artifact file not found: ./missing.json"),
    );

    await resolveCommand({ config: "docspec.config.yaml" });

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles config with no artifacts gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockLoadConfig.mockResolvedValue({
      site: { name: "Empty Site" },
      build: { cacheDir: ".cache" },
    });

    mockResolveArtifacts.mockResolvedValue([]);

    await resolveCommand({ config: "docspec.config.yaml" });

    // cacheDir comes from config.build.cacheDir which is ".cache"
    expect(mockResolveArtifacts).toHaveBeenCalledWith(
      [],
      ".cache",
      expect.any(String),
    );
    expect(mockExit).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("uses custom cacheDir from build config", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    mockLoadConfig.mockResolvedValue({
      site: { name: "Custom Cache Site" },
      artifacts: [],
      build: { cacheDir: ".custom-cache" },
    });

    mockResolveArtifacts.mockResolvedValue([]);

    await resolveCommand({ config: "docspec.config.yaml" });

    expect(mockResolveArtifacts).toHaveBeenCalledWith(
      [],
      ".custom-cache",
      expect.any(String),
    );

    consoleSpy.mockRestore();
  });
});
