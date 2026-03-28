import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "../Breadcrumb.js";

describe("Breadcrumb", () => {
  it("renders all breadcrumb items", () => {
    const items = [
      { label: "Home", href: "/" },
      { label: "Modules", href: "/modules" },
      { label: "UserService" },
    ];
    render(<Breadcrumb items={items} />);
    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Modules")).toBeDefined();
    expect(screen.getByText("UserService")).toBeDefined();
  });

  it("renders items with href as links", () => {
    const items = [
      { label: "Home", href: "/" },
      { label: "Current" },
    ];
    const { container } = render(<Breadcrumb items={items} />);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("/");
    expect(links[0].textContent).toBe("Home");
  });

  it("renders items without href as plain text", () => {
    const items = [
      { label: "Current" },
    ];
    const { container } = render(<Breadcrumb items={items} />);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(0);
    expect(screen.getByText("Current")).toBeDefined();
  });

  it("renders separator SVGs between items", () => {
    const items = [
      { label: "A", href: "/a" },
      { label: "B", href: "/b" },
      { label: "C" },
    ];
    const { container } = render(<Breadcrumb items={items} />);
    const svgs = container.querySelectorAll("svg");
    // Separators appear between items: 3 items => 2 separators
    expect(svgs.length).toBe(2);
  });

  it("renders nav element with correct role", () => {
    const items = [{ label: "Home" }];
    const { container } = render(<Breadcrumb items={items} />);
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
  });
});
