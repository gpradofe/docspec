import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TypeLink } from "../TypeLink.js";

describe("TypeLink", () => {
  it("renders simplified type name without reference index", () => {
    render(<TypeLink type="java.lang.String" />);
    expect(screen.getByText("String")).toBeDefined();
  });

  it("simplifies java.util types", () => {
    render(<TypeLink type="java.util.List" />);
    expect(screen.getByText("List")).toBeDefined();
  });

  it("renders as code element without reference index", () => {
    const { container } = render(<TypeLink type="java.lang.Integer" />);
    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe("Integer");
  });

  it("renders as link when type exists in reference index", () => {
    const referenceIndex = {
      "com.example.User": "docs/com-example-user",
    };
    const { container } = render(
      <TypeLink type="com.example.User" referenceIndex={referenceIndex} />
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/docs/com-example-user");
  });

  it("extracts generic inner type for linking", () => {
    const referenceIndex = {
      "Foo": "docs/foo",
    };
    const { container } = render(
      <TypeLink type="List<Foo>" referenceIndex={referenceIndex} />
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/docs/foo");
  });

  it("renders as code when type is not in reference index", () => {
    const referenceIndex = {
      "com.example.Other": "docs/other",
    };
    const { container } = render(
      <TypeLink type="UnknownType" referenceIndex={referenceIndex} />
    );
    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });
});
