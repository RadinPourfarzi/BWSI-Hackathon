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
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
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
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← Home
        </Link>
      </header>

      {stats.totalAttempts === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          No games played yet. Play a round and your stats will appear here.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Overall accuracy" value={`${stats.accuracyPct}%`} />
            <StatCard label="Best Arcade score" value={stats.bestScore.toLocaleString()} />
            <StatCard label="Longest combo" value={`${stats.longestCombo}×`} />
            <StatCard label="Avg response" value={`${avgSpeedS}s`} />
            <StatCard label="Arcade games" value={stats.gamesArcade} />
            <StatCard label="Training games" value={stats.gamesTraining} />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">By category</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Attempts</th>
                    <th className="px-4 py-2 font-medium">Accuracy</th>
                    <th className="px-4 py-2 font-medium">Avg speed</th>
                    <th className="px-4 py-2 font-medium">Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr
                      key={c.categoryId}
                      className="border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <td className="px-4 py-2">
                        {CATEGORY_CONFIG[c.categoryId as CategoryId]?.displayName ?? c.categoryId}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{c.attempts}</td>
                      <td className="px-4 py-2 tabular-nums">{c.accuracyPct}%</td>
                      <td className="px-4 py-2 tabular-nums">
                        {(c.avgSpeedMs / 1000).toFixed(1)}s
                      </td>
                      <td className="px-4 py-2">{skillRating(c.accuracyPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Trends</h2>
            <TrendCharts trends={trends} />
          </section>
        </>
      )}
    </div>
  );
}
