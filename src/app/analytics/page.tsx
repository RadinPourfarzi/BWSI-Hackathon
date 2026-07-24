import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchCategoryStats, fetchDailyTrends, fetchUserStats, skillRating } from '@/lib/analytics';
import { TrendCharts } from '@/components/analytics/TrendCharts';
import { CATEGORY_CONFIG } from '@/config';
import type { CategoryId } from '@/types/models';

export const metadata = { title: 'Analytics — Bot Or Not' };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-edge bg-ink-700 flex flex-col rounded-xl border px-4 py-3">
      <span className="text-muted font-mono text-[0.65rem] tracking-[0.15em] uppercase">
        {label}
      </span>
      <span className="text-text font-mono text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/analytics');
  }

  const [stats, categories, trends] = await Promise.all([
    fetchUserStats(supabase),
    fetchCategoryStats(supabase),
    fetchDailyTrends(supabase),
  ]);

  const avgSpeedS = (stats.avgResponseMs / 1000).toFixed(1);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-muted font-mono text-xs tracking-[0.2em] uppercase">Case file</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Your detection record
          </h1>
        </div>
        <Link
          href="/"
          className="text-muted hover:text-text font-mono text-xs tracking-wide uppercase transition-colors"
        >
          ← Home
        </Link>
      </header>

      {stats.totalAttempts === 0 ? (
        <p className="text-muted">No calls on record yet. Play a round to open your file.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Accuracy" value={`${stats.accuracyPct}%`} />
            <StatCard label="Best score" value={stats.bestScore.toLocaleString()} />
            <StatCard label="Combo" value={`×${stats.longestCombo}`} />
            <StatCard label="Avg call" value={`${avgSpeedS}s`} />
            <StatCard label="Arcade" value={stats.gamesArcade} />
            <StatCard label="Training" value={stats.gamesTraining} />
          </section>

          <section>
            <h2 className="text-muted mb-3 font-mono text-xs tracking-[0.2em] uppercase">
              By channel
            </h2>
            <div className="border-edge overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-800 text-muted font-mono text-[0.65rem] tracking-wider uppercase">
                  <tr>
                    <th className="px-4 py-2 font-normal">Channel</th>
                    <th className="px-4 py-2 font-normal">Attempts</th>
                    <th className="px-4 py-2 font-normal">Accuracy</th>
                    <th className="px-4 py-2 font-normal">Avg speed</th>
                    <th className="px-4 py-2 font-normal">Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.categoryId} className="border-edge border-t">
                      <td className="px-4 py-2">
                        {CATEGORY_CONFIG[c.categoryId as CategoryId]?.displayName ?? c.categoryId}
                      </td>
                      <td className="px-4 py-2 font-mono tabular-nums">{c.attempts}</td>
                      <td className="px-4 py-2 font-mono tabular-nums">{c.accuracyPct}%</td>
                      <td className="px-4 py-2 font-mono tabular-nums">
                        {(c.avgSpeedMs / 1000).toFixed(1)}s
                      </td>
                      <td className="text-muted px-4 py-2">{skillRating(c.accuracyPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-muted mb-3 font-mono text-xs tracking-[0.2em] uppercase">
              Over time
            </h2>
            <TrendCharts trends={trends} />
          </section>
        </>
      )}
    </div>
  );
}
