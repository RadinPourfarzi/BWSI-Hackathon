'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AudioLines,
  Dumbbell,
  GraduationCap,
  ImageIcon,
  MailWarning,
  ShieldCheck,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/store/gameStore';
import { fetchActiveConfig, fetchQuestionBatch } from '@/lib/questions';
import { levelProgress } from '@/lib/progression';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG, CATEGORY_IDS, GAME_CONFIG, GAME_DEFAULTS, XP_CONFIG } from '@/config';
import type { CategoryId, GameMode, Profile } from '@/types/models';

const CATEGORY_PRESENTATION: Record<
  CategoryId,
  { icon: typeof ImageIcon; blurb: string; optionA: string; optionB: string; accent: string }
> = {
  image: {
    icon: ImageIcon,
    blurb: 'Inspect texture, geometry, hands, reflections, and repeated detail.',
    optionA: 'AI',
    optionB: 'Real',
    accent: 'text-bot',
  },
  email: {
    icon: MailWarning,
    blurb: 'Catch urgency, identity mismatch, odd requests, and look-alike links.',
    optionA: 'Scam',
    optionB: 'Legit',
    accent: 'text-not',
  },
  audio: {
    icon: AudioLines,
    blurb: 'Listen for cadence, breath, transitions, and synthetic artifacts.',
    optionA: 'AI',
    optionB: 'Real',
    accent: 'text-bot',
  },
};

const PREVIEW_SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/challenges/image/real/real1.jpg`;

export default function Home() {
  const router = useRouter();
  const startRun = useGameStore((s) => s.startRun);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
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
        if (active) {
          setIsGuest(true);
          setLoadingProfile(false);
        }
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!active) return;
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
  }, []);

  const toggle = (id: CategoryId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const start = useCallback(
    async (mode: GameMode) => {
      if (selected.length === 0 || starting) return;
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
  const canStart = selected.length > 0 && starting === null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      {/* Hero + launcher */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <Badge className="border-bot/30 bg-bot/10 text-bot">
            <Sparkles className="mr-1.5 size-3.5" />
            The GeoGuessr of AI detection
          </Badge>
          <h1 className="font-display mt-6 text-5xl leading-[0.98] font-extrabold tracking-tight sm:text-6xl">
            Can you tell
            <br />
            what&apos;s <span className="text-not">real?</span>
          </h1>
          <p className="text-muted mt-5 max-w-md text-lg leading-8">
            {loadingProfile
              ? 'Loading your file…'
              : `Train your instincts to spot AI images, phishing scams, and voice deepfakes${
                  profile ? `, ${profile.username}` : ''
                } — one split-second call at a time.`}
          </p>

          {profile && (
            <div className="mt-6 max-w-xs">
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

          {/* Start buttons (functional) */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => start('ARCADE')}
              disabled={!canStart}
              className="group border-bot/40 bg-bot/10 hover:border-bot hover:bg-bot/20 flex flex-1 items-center justify-between rounded-2xl border px-6 py-5 text-left transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <Swords className="text-bot size-5" />
                <span className="font-display text-text text-xl font-bold">
                  {starting === 'ARCADE' ? 'Starting…' : 'Play Arcade'}
                </span>
              </span>
              <span className="text-muted font-mono text-[0.65rem] tracking-wider uppercase">
                3 lives · decay
              </span>
            </button>
            <button
              type="button"
              onClick={() => start('TRAINING')}
              disabled={!canStart}
              className="group border-edge hover:border-not hover:bg-not/10 flex flex-1 items-center justify-between rounded-2xl border px-6 py-5 text-left transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <Dumbbell className="text-not size-5" />
                <span className="font-display text-text text-xl font-bold">
                  {starting === 'TRAINING' ? 'Starting…' : 'Training'}
                </span>
              </span>
              <span className="text-muted font-mono text-[0.65rem] tracking-wider uppercase">
                learn the tells
              </span>
            </button>
          </div>

          {/* Channel selection (functional) */}
          <div className="mt-6">
            <div className="text-muted mb-2 font-mono text-xs tracking-[0.2em] uppercase">
              Detect
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_IDS.map((id) => {
                const active = selected.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-lg border px-3 py-2 font-mono text-sm tracking-wide uppercase transition-colors',
                      active
                        ? 'border-not bg-not/15 text-text'
                        : 'border-edge text-muted hover:border-muted hover:text-text',
                    )}
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
        </div>

        {/* Preview card */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <div className="bg-bot/8 absolute -inset-6 -z-10 rounded-[2.5rem] blur-3xl" />
          <Card className="overflow-hidden">
            <div className="border-edge flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-not font-mono text-[0.65rem] font-bold tracking-[0.2em] uppercase">
                  Live challenge
                </p>
                <p className="text-muted mt-1 text-sm font-semibold">Inspect every detail</p>
              </div>
              <Badge>Sample</Badge>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote bucket preview */}
            <img
              src={PREVIEW_SRC}
              alt="Sample detection challenge"
              className="aspect-square w-full object-cover"
              draggable={false}
            />
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="border-bot/50 bg-bot/12 text-bot rounded-xl border py-4 text-center font-bold">
                AI
              </div>
              <div className="border-edge rounded-xl border bg-white/4 py-4 text-center font-bold">
                Real
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* How it works / channels */}
      <section className="mt-16 sm:mt-24">
        <p className="text-bot font-mono text-xs font-bold tracking-[0.2em] uppercase">
          Three threat surfaces
        </p>
        <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          One fast decision loop.
        </h2>
        <p className="text-muted mt-3 max-w-2xl leading-7">
          Choose a side, get instant feedback, and build the instinct to catch fakes in the wild.
          Difficulty and scoring ramp without changing the core game.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CATEGORY_IDS.map((id) => {
            const p = CATEGORY_PRESENTATION[id];
            const Icon = p.icon;
            return (
              <Card
                key={id}
                className="p-5 transition-transform duration-200 hover:-translate-y-1 sm:p-6"
              >
                <span className="bg-ink-700 grid size-11 place-items-center rounded-xl">
                  <Icon className={cn('size-5', p.accent)} />
                </span>
                <h3 className="font-display mt-5 text-xl font-bold">
                  {CATEGORY_CONFIG[id].displayName}
                </h3>
                <p className="text-muted mt-2 text-sm leading-6">{p.blurb}</p>
                <p className="text-muted mt-5 font-mono text-xs font-bold tracking-wide uppercase">
                  {p.optionA} vs {p.optionB}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Value props */}
      <section className="text-muted mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <ShieldCheck className="text-correct size-4" />
          Real open data
        </span>
        <span className="flex items-center gap-2">
          <Zap className="text-correct size-4" />
          Instant feedback
        </span>
        <span className="flex items-center gap-2">
          <GraduationCap className="text-correct size-4" />
          Learn the tells
        </span>
        {isGuest && (
          <Link href="/login?redirect=/" className="text-bot hover:text-bot-bright ml-auto">
            Sign in to save progress →
          </Link>
        )}
      </section>
    </div>
  );
}
