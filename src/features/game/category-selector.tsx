"use client";

import { Check, Gamepad2, GraduationCap, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  categoryConfig,
  categoryIds,
  type CategoryId,
} from "@/config/categories";
import { gameConfig, type GameMode } from "@/config/game";
import { cn } from "@/lib/utils";

function readSavedCategories(fallback: CategoryId[]): CategoryId[] {
  if (typeof window === "undefined") return fallback;

  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(gameConfig.localStorage.categorySelection) ??
        "null",
    );
    const saved = categoryIds.filter(
      (category) => Array.isArray(value) && value.includes(category),
    );
    return saved.length > 0 ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function CategorySelector({
  mode,
  disabled,
  error,
  initialCategories = [...categoryIds],
  onStart,
}: {
  mode: GameMode;
  disabled: boolean;
  error: string | null;
  initialCategories?: CategoryId[];
  onStart: (categories: CategoryId[]) => void;
}) {
  const [selected, setSelected] = useState<CategoryId[]>(initialCategories);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setSelected(readSavedCategories(initialCategories)),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [initialCategories]);

  function toggleCategory(categoryId: CategoryId) {
    const isSelected = selected.includes(categoryId);

    if (isSelected && selected.length === 1) {
      setSelectionMessage("Keep at least one category selected.");
      return;
    }

    const next = categoryIds.filter((category) =>
      category === categoryId ? !isSelected : selected.includes(category),
    );
    setSelected(next);
    setSelectionMessage(null);
    try {
      window.localStorage.setItem(
        gameConfig.localStorage.categorySelection,
        JSON.stringify(next),
      );
    } catch {
      // The current selection still works when browser storage is unavailable.
    }
  }

  const ModeIcon = mode === "arcade" ? Gamepad2 : GraduationCap;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--orange)]/30 bg-[var(--orange)]/10">
          <ModeIcon className="size-5 text-[var(--orange)]" />
        </span>
        <h2 className="mt-4 text-2xl font-black tracking-tight">
          Build your signal mix
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          {mode === "arcade"
            ? "You have three lives. Fast, accurate calls build combos and unlock harder rounds."
            : "Practice without lives or score pressure, then review the explanation after every call."}
        </p>
      </div>

      <div
        aria-describedby="category-selection-message"
        aria-label="Challenge categories"
        className="grid gap-4 md:grid-cols-3"
        role="group"
      >
        {categoryIds.map((categoryId) => {
          const category = categoryConfig[categoryId];
          const Icon = category.icon;
          const active = selected.includes(categoryId);

          return (
            <button
              aria-checked={active}
              className="text-left"
              disabled={disabled}
              key={categoryId}
              onClick={() => toggleCategory(categoryId)}
              role="checkbox"
              type="button"
            >
              <Card
                className={cn(
                  "h-full transition-all",
                  active
                    ? "border-[var(--blue)] bg-[var(--blue)]/7 shadow-[0_16px_60px_rgb(47_111_244/0.12)]"
                    : "opacity-60 hover:opacity-90",
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="grid size-11 place-items-center rounded-xl"
                      style={{ backgroundColor: `${category.accent}18` }}
                    >
                      <Icon
                        className="size-5"
                        style={{ color: category.accent }}
                      />
                    </span>
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full border",
                        active
                          ? "border-[var(--blue)] bg-[var(--blue)] text-white"
                          : "border-[var(--border)] text-transparent",
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                  </div>
                  <h3 className="mt-4 font-black">{category.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {category.description}
                  </p>
                  <Badge className="mt-4">
                    {category.optionA} vs {category.optionB}
                  </Badge>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-4 min-h-6 text-center text-sm text-[var(--danger)]"
        id="category-selection-message"
      >
        {selectionMessage ?? error}
      </div>

      <Button
        className="mx-auto mt-3 flex min-w-56"
        disabled={disabled}
        onClick={() => onStart(selected)}
        size="lg"
      >
        {disabled ? (
          "Loading challenges…"
        ) : (
          <>
            <ShieldCheck className="size-5" />
            Start {mode === "arcade" ? "Arcade" : "Training"}
          </>
        )}
      </Button>
    </div>
  );
}
