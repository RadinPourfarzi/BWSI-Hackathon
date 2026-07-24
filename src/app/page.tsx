'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { DUMMY_QUESTIONS } from '@/lib/dummyQuestions';
import {
  CATEGORY_CONFIG,
  CATEGORY_IDS,
  DEFAULT_ACTIVE_CONFIG,
  GAME_DEFAULTS,
} from '@/config';
import type { CategoryId, GameMode } from '@/types/models';

const CATEGORY_DESCRIPTIONS: Record<CategoryId, string> = {
  image: 'Identify real photographs and AI-generated images.',
  email: 'Distinguish legitimate messages from phishing attempts.',
  audio: 'Compare human recordings with synthetic voices.',
};

export default function Home() {
  const router = useRouter();
  const startRun = useGameStore((state) => state.startRun);

  const [selected, setSelected] = useState<CategoryId[]>([
    ...GAME_DEFAULTS.defaultCategories,
  ]);

  function toggleCategory(id: CategoryId) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((category) => category !== id)
        : [...previous, id],
    );
  }

  function startGame(mode: GameMode) {
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
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Bot Or Not</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Digital media awareness game
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
              Level 1
            </span>

            <span className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
              Streak: 0
            </span>
          </div>
        </header>

        {/* Introduction */}
        <section className="mx-auto w-full max-w-2xl py-14 text-center">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Can you tell what is real?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Review images, emails, and audio clips, then decide whether each
            example is authentic or fake.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Categories */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Choose categories</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Select one or more types of content.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {CATEGORY_IDS.map((id) => {
                const active = selected.includes(id);

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleCategory(id)}
                    aria-pressed={active}
                    className={`flex items-start justify-between rounded-lg border p-4 text-left transition ${
                      active
                        ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800'
                        : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
                    }`}
                  >
                    <div>
                      <h3 className="font-medium">
                        {CATEGORY_CONFIG[id].displayName}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        {CATEGORY_DESCRIPTIONS[id]}
                      </p>
                    </div>

                    <span
                      className={`ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    >
                      {active ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected.length === 0 && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                Select at least one category to continue.
              </p>
            )}
          </section>

          {/* Modes */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Choose a mode</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Select how you want to play.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => startGame('ARCADE')}
                disabled={selected.length === 0}
                className="rounded-lg bg-zinc-900 p-5 text-left text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
              >
                <h3 className="text-lg font-semibold">Arcade</h3>
                <p className="mt-1 text-sm text-zinc-300 dark:text-zinc-600">
                  Answer quickly, build combos, and earn the highest score.
                </p>
              </button>

              <button
                type="button"
                onClick={() => startGame('TRAINING')}
                disabled={selected.length === 0}
                className="rounded-lg border border-zinc-300 p-5 text-left transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <h3 className="text-lg font-semibold">Training</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Review explanations and learn what clues to look for.
                </p>
              </button>
            </div>
          </section>
        </div>

        {/* Instructions */}
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">How it works</h2>

          <div className="mt-4 grid gap-4 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                1. Review
              </p>
              <p className="mt-1 leading-6">
                Examine the image, email, or audio clip carefully.
              </p>
            </div>

            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                2. Decide
              </p>
              <p className="mt-1 leading-6">
                Choose whether the content is real or fake.
              </p>
            </div>

            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                3. Learn
              </p>
              <p className="mt-1 leading-6">
                Read the explanation and improve your judgment.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-auto pt-10 text-center text-xs text-zinc-400">
          Bot Or Not
        </footer>
      </div>
    </main>
  );
}
