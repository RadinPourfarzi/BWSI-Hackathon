'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/store/gameStore';
import { fetchActiveConfig, fetchQuestionBatch } from '@/lib/questions';
import { signOut } from '@/app/auth/actions';
import { levelProgress } from '@/lib/progression';
import { CATEGORY_CONFIG, CATEGORY_IDS, GAME_CONFIG, GAME_DEFAULTS, XP_CONFIG } from '@/config';
import type { CategoryId, GameMode, Profile } from '@/types/models';

export default function Home() {
  const router = useRouter();
  const startRun = useGameStore((s) => s.startRun);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selected, setSelected] = useState<CategoryId[]>([...GAME_DEFAULTS.defaultCategories]);
  const [starting, setStarting] = useState<GameMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirect=/');
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!active) {
        return;
      }
      if (data) {
        setProfile({
          id: data.id,
          username: data.username,
          totalXp: data.total_xp,
          currentLevel: data.current_level,
          dailyStreak: data.daily_streak,
          lastPlayedAt: data.last_played_at,
          createdAt: data.created_at,
        });
      }
      setLoadingProfile(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const toggle = (id: CategoryId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const start = useCallback(
    async (mode: GameMode) => {
      if (selected.length === 0 || starting) {
        return;
      }
      setError(null);
      setStarting(mode);
      try {
        const supabase = createClient();
        const [config, batch] = await Promise.all([
          fetchActiveConfig(supabase),
          fetchQuestionBatch(supabase, { categories: selected, limit: GAME_CONFIG.batchSize }),
        ]);
        if (batch.length === 0) {
          setError('No questions available for the selected categories.');
          setStarting(null);
          return;
        }
        startRun({ mode, pool: batch, enabledCategories: selected, config });
        router.push('/play');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start game.');
        setStarting(null);
      }
    },
    [selected, starting, startRun, router],
  );

  const progress = profile ? Math.round(levelProgress(profile.totalXp, XP_CONFIG) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕵️</span>
          <span className="text-lg font-semibold tracking-tight">Bot Or Not</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
            Level {profile?.currentLevel ?? 1}
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
            🔥 {profile?.dailyStreak ?? 0}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Spot the fake.</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {loadingProfile
            ? 'Loading your profile…'
            : `Welcome back${profile ? `, ${profile.username}` : ''}. Real or AI?`}
        </p>
        {profile && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Level {profile.currentLevel}</span>
              <span>{profile.totalXp} XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => start('ARCADE')}
          disabled={selected.length === 0 || starting !== null}
          className="rounded-xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {starting === 'ARCADE' ? 'Starting…' : '⚡ Play Arcade'}
        </button>
        <button
          type="button"
          onClick={() => start('TRAINING')}
          disabled={selected.length === 0 || starting !== null}
          className="rounded-xl border border-zinc-300 px-6 py-4 text-lg font-semibold transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {starting === 'TRAINING' ? 'Starting…' : '🎯 Training Mode'}
        </button>
      </div>

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
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
