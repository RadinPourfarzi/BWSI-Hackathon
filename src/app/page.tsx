'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { DUMMY_QUESTIONS } from '@/lib/dummyQuestions';
import { CATEGORY_CONFIG, CATEGORY_IDS, DEFAULT_ACTIVE_CONFIG, GAME_DEFAULTS } from '@/config';
import type { CategoryId, GameMode } from '@/types/models';

export default function Home() {
  const router = useRouter();
  const startRun = useGameStore((s) => s.startRun);
  const [selected, setSelected] = useState<CategoryId[]>([...GAME_DEFAULTS.defaultCategories]);

  const toggle = (id: CategoryId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const start = (mode: GameMode) => {
    if (selected.length === 0) {
      return;
    }
    startRun({
      mode,
      pool: DUMMY_QUESTIONS,
      enabledCategories: selected,
      config: DEFAULT_ACTIVE_CONFIG,
    });
    router.push('/play');
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕵️</span>
          <span className="text-lg font-semibold tracking-tight">AI Detect</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">Level 1</span>
          <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">🔥 0</span>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Spot the fake.</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Real or AI? Decide fast — the clock is ticking.
        </p>
      </div>

      {/* Mode buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => start('ARCADE')}
          disabled={selected.length === 0}
          className="rounded-xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          ⚡ Play Arcade
        </button>
        <button
          type="button"
          onClick={() => start('TRAINING')}
          disabled={selected.length === 0}
          className="rounded-xl border border-zinc-300 px-6 py-4 text-lg font-semibold transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          🎯 Training Mode
        </button>
      </div>

      {/* Category filters */}
      <div>
        <div className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Categories</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_IDS.map((id) => {
            const active = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {active ? '✓ ' : ''}
                {CATEGORY_CONFIG[id].displayName}
              </button>
            );
          })}
        </div>
        {selected.length === 0 && (
          <p className="mt-2 text-sm text-red-500">Select at least one category to play.</p>
        )}
      </div>
    </div>
  );
}
