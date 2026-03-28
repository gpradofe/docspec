import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ParameterTable } from "../ParameterTable.js";
import type { MethodParam } from "@docspec/core";

describe("ParameterTable", () => {
  it("returns null for empty params", () => {
    const { container } = render(<ParameterTable params={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a table with param names", () => {
    const params: MethodParam[] = [
      { name: "userId", type: "Long", required: true, description: "The user ID" },
      { name: "email", type: "String", required: false, description: "Optional email" },
    ];
    render(<ParameterTable params={params} />);
    expect(screen.getByText("userId")).toBeDefined();
    expect(screen.getByText("email")).toBeDefined();
  });

  it("renders column headers", () => {
    const params: MethodParam[] = [
      { name: "id", type: "Long" },
    ];
    render(<ParameterTable params={params} />);
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Type")).toBeDefined();
    expect(screen.getByText("Required")).toBeDefined();
    expect(screen.getByText("Description")).toBeDefined();
  });

  it("shows 'required' label for required params", () => {
    const params: MethodParam[] = [
      { name: "id", type: "Long", required: true },
    ];
    render(<ParameterTable params={params} />);
    expect(screen.getByText("required")).toBeDefined();
  });

  it("shows 'optional' label for non-required params", () => {
    const params: MethodParam[] = [
      { name: "filter", type: "String", required: false },
    ];
    render(<ParameterTable params={params} />);
    expect(screen.getByText("optional")).toBeDefined();
  });

  it("shows em dash for params without description", () => {
    const params: MethodParam[] = [
      { name: "id", type: "Long" },
    ];
    const { container } = render(<ParameterTable params={params} />);
    // The em dash is used as a fallback when description is absent
    const cells = container.querySelectorAll("td");
    const descriptionCell = cells[cells.length - 1];
    expect(descriptionCell.textContent).toContain("\u2014");
  });

  it("renders description when provided", () => {
    const params: MethodParam[] = [
      { name: "name", type: "String", description: "The full name" },
    ];
    render(<ParameterTable params={params} />);
    expect(screen.getByText("The full name")).toBeDefined();
  });
});
