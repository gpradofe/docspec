import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MethodSignature } from "../MethodSignature.js";
import type { Method } from "@docspec/core";

describe("MethodSignature", () => {
  it("renders method name", () => {
    const method: Method = {
      name: "createUser",
    };
    render(<MethodSignature method={method} />);
    expect(screen.getByText("createUser")).toBeDefined();
  });

  it("renders visibility, return type and params", () => {
    const method: Method = {
      name: "findById",
      visibility: "public",
      returns: { type: "User" },
      params: [
        { name: "id", type: "java.lang.Long" },
      ],
    };
    const { container } = render(<MethodSignature method={method} />);
    const text = container.textContent;
    expect(text).toContain("public");
    expect(text).toContain("User");
    expect(text).toContain("findById");
    expect(text).toContain("Long");
    expect(text).toContain("id");
  });

  it("defaults visibility to public", () => {
    const method: Method = {
      name: "test",
    };
    const { container } = render(<MethodSignature method={method} />);
    expect(container.textContent).toContain("public");
  });

  it("defaults return type to void", () => {
    const method: Method = {
      name: "doSomething",
    };
    const { container } = render(<MethodSignature method={method} />);
    expect(container.textContent).toContain("void");
  });

  it("renders modifiers", () => {
    const method: Method = {
      name: "getInstance",
      modifiers: ["static"],
      returns: { type: "Singleton" },
    };
    const { container } = render(<MethodSignature method={method} />);
    expect(container.textContent).toContain("static");
  });

  it("renders multiple params separated by commas", () => {
    const method: Method = {
      name: "transfer",
      params: [
        { name: "from", type: "Account" },
        { name: "to", type: "Account" },
        { name: "amount", type: "java.math.BigDecimal" },
      ],
    };
    const { container } = render(<MethodSignature method={method} />);
    const text = container.textContent || "";
    expect(text).toContain("from");
    expect(text).toContain("to");
    expect(text).toContain("amount");
    // Commas should separate params
    expect(text).toContain(", ");
  });

  it("strips java.lang and java.util prefixes from param types", () => {
    const method: Method = {
      name: "process",
      params: [
        { name: "name", type: "java.lang.String" },
        { name: "items", type: "java.util.List" },
      ],
    };
    const { container } = render(<MethodSignature method={method} />);
    const text = container.textContent || "";
    expect(text).toContain("String");
    expect(text).toContain("List");
    expect(text).not.toContain("java.lang.String");
    expect(text).not.toContain("java.util.List");
  });

  it("applies custom className", () => {
    const method: Method = { name: "test" };
    const { container } = render(
      <MethodSignature method={method} className="extra-class" />
    );
    const code = container.querySelector("code");
    expect(code!.className).toContain("extra-class");
  });
});
