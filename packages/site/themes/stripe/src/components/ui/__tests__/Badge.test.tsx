import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge.js";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>GET</Badge>);
    expect(screen.getByText("GET")).toBeDefined();
  });

  it("applies default variant styling", () => {
    render(<Badge>default</Badge>);
    const el = screen.getByText("default");
    expect(el.className).toContain("bg-surface-tertiary");
  });

  it("applies primary variant styling", () => {
    render(<Badge variant="primary">primary</Badge>);
    const el = screen.getByText("primary");
    expect(el.className).toContain("bg-primary-50");
  });

  it("applies success variant styling", () => {
    render(<Badge variant="success">ok</Badge>);
    const el = screen.getByText("ok");
    expect(el.className).toContain("bg-emerald-50");
  });

  it("applies warning variant styling", () => {
    render(<Badge variant="warning">warn</Badge>);
    const el = screen.getByText("warn");
    expect(el.className).toContain("bg-amber-50");
  });

  it("applies error variant styling", () => {
    render(<Badge variant="error">err</Badge>);
    const el = screen.getByText("err");
    expect(el.className).toContain("bg-red-50");
  });

  it("uses HTTP method style when httpMethod is provided", () => {
    render(<Badge httpMethod="POST">POST</Badge>);
    const el = screen.getByText("POST");
    expect(el.className).toContain("bg-blue-50");
    expect(el.className).toContain("border-blue-200");
  });

  it("falls back to default style for unknown HTTP method", () => {
    render(<Badge httpMethod="OPTIONS">OPTIONS</Badge>);
    const el = screen.getByText("OPTIONS");
    expect(el.className).toContain("bg-surface-tertiary");
  });

  it("merges custom className", () => {
    render(<Badge className="my-custom">text</Badge>);
    const el = screen.getByText("text");
    expect(el.className).toContain("my-custom");
  });
});
