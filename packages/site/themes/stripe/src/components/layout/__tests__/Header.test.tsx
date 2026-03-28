import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../Header.js";

describe("Header", () => {
  it("renders the site name", () => {
    render(
      <Header siteName="DocSpec" onToggleSidebar={() => {}} />
    );
    expect(screen.getByText("DocSpec")).toBeDefined();
  });

  it("renders logo image when provided", () => {
    const { container } = render(
      <Header siteName="DocSpec" logo="/logo.png" onToggleSidebar={() => {}} />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/logo.png");
  });

  it("does not render logo when not provided", () => {
    const { container } = render(
      <Header siteName="DocSpec" onToggleSidebar={() => {}} />
    );
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });

  it("calls onToggleSidebar when toggle button is clicked", () => {
    const toggle = vi.fn();
    render(
      <Header siteName="DocSpec" onToggleSidebar={toggle} />
    );
    const button = screen.getByLabelText("Toggle sidebar");
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("renders Search text in header", () => {
    render(
      <Header siteName="Test" onToggleSidebar={() => {}} />
    );
    expect(screen.getByText("Search")).toBeDefined();
  });
});
