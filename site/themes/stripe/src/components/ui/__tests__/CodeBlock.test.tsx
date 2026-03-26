import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { CodeBlock } from "../CodeBlock.js";

describe("CodeBlock", () => {
  it("renders code content", () => {
    render(<CodeBlock code='System.out.println("hello");' />);
    expect(screen.getByText('System.out.println("hello");')).toBeDefined();
  });

  it("renders language label when no title is provided", () => {
    render(<CodeBlock code="int x = 1;" language="java" />);
    expect(screen.getByText("java")).toBeDefined();
  });

  it("renders title label when provided", () => {
    render(<CodeBlock code="const x = 1;" language="typescript" title="example.ts" />);
    expect(screen.getByText("example.ts")).toBeDefined();
  });

  it("renders Copy button", () => {
    render(<CodeBlock code="code" />);
    expect(screen.getByText("Copy")).toBeDefined();
  });

  it("renders code in pre > code elements", () => {
    const { container } = render(<CodeBlock code="val x = 42" />);
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    const code = pre!.querySelector("code");
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe("val x = 42");
  });

  it("defaults language to java", () => {
    render(<CodeBlock code="public class Foo {}" />);
    // When no title is provided, language is shown as label; default is "java"
    expect(screen.getByText("java")).toBeDefined();
  });
});
