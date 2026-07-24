'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/store/gameStore';
import { fetchActiveConfig, fetchQuestionBatch } from '@/lib/questions';
import { signOut } from '@/app/auth/actions';
import { levelProgress } from '@/lib/progression';
import { Wordmark } from '@/components/Wordmark';
import { SparkMark } from '@/components/marks';
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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-8">
      <header className="flex items-center justify-between">
        <Wordmark className="text-lg" />
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="border-edge text-muted rounded-md border px-2 py-1 tracking-wide uppercase">
            LV {String(profile?.currentLevel ?? 1).padStart(2, '0')}
          </span>
          <span className="border-edge text-muted inline-flex items-center gap-1 rounded-md border px-2 py-1">
            <SparkMark className="text-not h-3 w-3" />×{profile?.dailyStreak ?? 0}
          </span>
          <Link
            href="/analytics"
            className="border-edge text-muted hover:text-text rounded-md border px-2 py-1 tracking-wide uppercase transition-colors"
          >
            Analytics
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-muted hover:text-text rounded-md px-2 py-1 tracking-wide uppercase transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8 sm:gap-10">
        <div>
          <p className="text-muted font-mono text-xs tracking-[0.2em] uppercase">
            Detect the machine
          </p>
          <h1 className="font-display mt-3 text-5xl leading-[1.05] font-extrabold tracking-tight">
            Can you tell
            <br />
            what&apos;s <span className="text-not">real</span>?
          </h1>
          <p className="text-muted mt-4 max-w-md">
            {loadingProfile
              ? 'Loading your file…'
              : `Train your eye to spot AI fakes, phishing scams, and deepfakes${profile ? `, ${profile.username}` : ''} — one split-second call at a time.`}
          </p>
          {profile && (
            <div className="mt-5 max-w-xs">
              <div className="text-muted mb-1 flex justify-between font-mono text-[0.7rem] tracking-wider uppercase">
                <span>Level {profile.currentLevel}</span>
                <span>{profile.totalXp.toLocaleString()} XP</span>
              </div>
              <div className="bg-edge h-1.5 overflow-hidden rounded-full">
                <div
                  className="from-bot to-not h-full rounded-full bg-gradient-to-r"
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
            className="group border-bot/40 bg-bot/10 hover:border-bot hover:bg-bot/20 flex items-center justify-between rounded-2xl border px-6 py-5 text-left transition-colors disabled:opacity-50"
          >
            <span className="font-display text-text text-xl font-bold">
              {starting === 'ARCADE' ? 'Starting…' : 'Play Arcade'}
            </span>
            <span className="text-muted font-mono text-xs tracking-wider uppercase">
              3 lives · decay
            </span>
          </button>
          <button
            type="button"
            onClick={() => start('TRAINING')}
            disabled={selected.length === 0 || starting !== null}
            className="group border-edge hover:border-not hover:bg-not/10 flex items-center justify-between rounded-2xl border px-6 py-5 text-left transition-colors disabled:opacity-50"
          >
            <span className="font-display text-text text-xl font-bold">
              {starting === 'TRAINING' ? 'Starting…' : 'Training'}
            </span>
            <span className="text-muted font-mono text-xs tracking-wider uppercase">
              learn the tells
            </span>
          </button>
        </div>

        <div>
          <div className="text-muted mb-2 font-mono text-xs tracking-[0.2em] uppercase">Detect</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_IDS.map((id) => {
              const active = selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2 font-mono text-sm tracking-wide uppercase transition-colors ${
                    active
                      ? 'border-not bg-not/15 text-text'
                      : 'border-edge text-muted hover:border-muted hover:text-text'
                  }`}
                >
                  {CATEGORY_CONFIG[id].displayName}
                </button>
              );
            })}
          </div>
          {selected.length === 0 && (
            <p className="text-wrong mt-2 text-sm">Pick at least one channel to play.</p>
          )}
          {error && <p className="text-wrong mt-2 text-sm">{error}</p>}
        </div>
      </main>
    </div>
  );
}
