"use client";

import { Check, LoaderCircle, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  categoryConfig,
  categoryIds,
  type CategoryId,
} from "@/config/categories";
import {
  updateSettings,
  type SettingsActionState,
} from "@/features/settings/actions";
import {
  preferencesStorageKey,
  type PlayerSettings,
} from "@/features/settings/types";
import { cn } from "@/lib/utils";

const initialState: SettingsActionState = {};

function Toggle({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked: boolean;
  description: string;
  label: string;
  name: string;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-start justify-between gap-5">
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
          {description}
        </span>
      </span>
      <input
        className="mt-1 size-5 accent-[var(--blue)]"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
    </label>
  );
}

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: PlayerSettings;
}) {
  const [state, formAction, pending] = useActionState(
    updateSettings,
    initialState,
  );
  const [categories, setCategories] = useState<CategoryId[]>(
    initialSettings.defaultCategories,
  );
  const [timezoneOffset, setTimezoneOffset] = useState(
    initialSettings.timezoneOffsetMinutes,
  );
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.settings) return;
    try {
      window.localStorage.setItem(
        preferencesStorageKey,
        JSON.stringify(state.settings),
      );
    } catch {
      // Supabase remains authoritative if the local cache is unavailable.
    }
    document.documentElement.dataset.reducedMotion =
      state.settings.reducedMotion;
  }, [state.settings]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setTimezoneOffset(new Date().getTimezoneOffset()),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, []);

  function toggleCategory(category: CategoryId) {
    if (categories.includes(category) && categories.length === 1) {
      setCategoryError("Keep at least one default category.");
      return;
    }

    setCategories((current) =>
      categoryIds.filter((item) =>
        item === category
          ? !current.includes(category)
          : current.includes(item),
      ),
    );
    setCategoryError(null);
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        name="timezoneOffsetMinutes"
        type="hidden"
        value={String(timezoneOffset)}
      />

      <Card>
        <CardContent className="p-6">
          <h2 className="font-black">Default categories</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            New Arcade and Training runs begin with this mix.
          </p>
          <div
            aria-describedby="default-category-error"
            className="mt-5 grid gap-3 sm:grid-cols-3"
            role="group"
          >
            {categoryIds.map((category) => {
              const selected = categories.includes(category);
              const configuration = categoryConfig[category];

              return (
                <label
                  className={cn(
                    "relative cursor-pointer rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue)]",
                    selected
                      ? "border-[var(--blue)] bg-[var(--blue)]/8"
                      : "border-[var(--border)] bg-white/2",
                  )}
                  key={category}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    name="defaultCategories"
                    onChange={() => toggleCategory(category)}
                    type="checkbox"
                    value={category}
                  />
                  <configuration.icon
                    className="size-5"
                    style={{ color: configuration.accent }}
                  />
                  <span className="mt-3 block text-sm font-black">
                    {configuration.shortName}
                  </span>
                  {selected ? (
                    <Check className="absolute top-3 right-3 size-4 text-[var(--blue)]" />
                  ) : null}
                </label>
              );
            })}
          </div>
          <p
            className="mt-2 min-h-5 text-xs text-[var(--danger)]"
            id="default-category-error"
          >
            {categoryError}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-[var(--border)] p-6">
          <div className="pb-5">
            <Toggle
              defaultChecked={initialSettings.soundEffects}
              description="Play lightweight correct and incorrect answer tones."
              label="Sound effects"
              name="soundEffects"
            />
            <label className="mt-4 block text-sm font-black" htmlFor="volume">
              Effects volume
            </label>
            <input
              className="mt-3 w-full accent-[var(--blue)]"
              defaultValue={initialSettings.volume}
              id="volume"
              max={100}
              min={0}
              name="volume"
              type="range"
            />
          </div>

          <div className="py-5">
            <label className="text-sm font-black" htmlFor="reducedMotion">
              Motion preference
            </label>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Follow the device setting, always reduce, or allow animations.
            </p>
            <select
              className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-[#090d15] px-3 text-sm"
              defaultValue={initialSettings.reducedMotion}
              id="reducedMotion"
              name="reducedMotion"
            >
              <option value="system">Use system setting</option>
              <option value="reduce">Reduce motion</option>
              <option value="allow">Allow motion</option>
            </select>
          </div>

          <div className="py-5">
            <Toggle
              defaultChecked={initialSettings.showKeyboardShortcuts}
              description="Show A/D, arrow, and number-key hints during gameplay."
              label="Keyboard shortcut hints"
              name="showKeyboardShortcuts"
            />
          </div>

          <div className="pt-5">
            <Toggle
              defaultChecked={initialSettings.confirmAbandon}
              description="Ask before discarding or leaving an active run."
              label="Confirm before abandoning"
              name="confirmAbandon"
            />
          </div>
        </CardContent>
      </Card>

      {state.error ? (
        <p
          className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-4 py-3 text-sm text-[#efb4b7]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 px-4 py-3 text-sm text-[#a8ead3]"
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        disabled={pending || Boolean(categoryError)}
        size="lg"
        type="submit"
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <Save className="size-5" />
        )}
        Save settings
      </Button>
    </form>
  );
}
