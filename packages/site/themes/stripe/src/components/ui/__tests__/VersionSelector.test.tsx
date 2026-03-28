import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VersionSelector } from "../VersionSelector.js";

describe("VersionSelector", () => {
  it("renders all version options", () => {
    render(
      <VersionSelector versions={["1.0.0", "2.0.0", "3.0.0"]} current="3.0.0" />
    );
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(3);
    expect(options[0].textContent).toBe("1.0.0");
    expect(options[1].textContent).toBe("2.0.0");
    expect(options[2].textContent).toBe("3.0.0");
  });

  it("selects the current version", () => {
    render(
      <VersionSelector versions={["1.0.0", "2.0.0"]} current="2.0.0" />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("2.0.0");
  });

  it("calls onChange when a different version is selected", () => {
    const onChange = vi.fn();
    render(
      <VersionSelector versions={["1.0.0", "2.0.0"]} current="1.0.0" onChange={onChange} />
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2.0.0" } });
    expect(onChange).toHaveBeenCalledWith("2.0.0");
  });

  it("works without onChange handler", () => {
    render(
      <VersionSelector versions={["1.0.0"]} current="1.0.0" />
    );
    const select = screen.getByRole("combobox");
    // Should not throw
    fireEvent.change(select, { target: { value: "1.0.0" } });
  });
});
