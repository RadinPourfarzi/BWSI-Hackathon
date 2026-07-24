// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategorySelector } from "@/features/game/category-selector";

describe("category selection", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to mixed mode and never allows an empty selection", () => {
    render(
      <CategorySelector
        disabled={false}
        error={null}
        mode="arcade"
        onStart={vi.fn()}
      />,
    );

    const image = screen.getByRole("checkbox", {
      name: /Image detection/i,
    });
    const email = screen.getByRole("checkbox", { name: /Email defense/i });
    const voice = screen.getByRole("checkbox", {
      name: /Voice detection/i,
    });

    expect(image).toHaveAttribute("aria-checked", "true");
    expect(email).toHaveAttribute("aria-checked", "true");
    expect(voice).toHaveAttribute("aria-checked", "true");

    fireEvent.click(image);
    fireEvent.click(email);
    fireEvent.click(voice);

    expect(voice).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText("Keep at least one category selected."),
    ).toBeVisible();
  });

  it("starts with the selected categories in canonical order", () => {
    const onStart = vi.fn();
    render(
      <CategorySelector
        disabled={false}
        error={null}
        mode="training"
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Image detection/i }));
    fireEvent.click(screen.getByRole("button", { name: "Start Training" }));

    expect(onStart).toHaveBeenCalledWith(["email", "voice"]);
  });
});
