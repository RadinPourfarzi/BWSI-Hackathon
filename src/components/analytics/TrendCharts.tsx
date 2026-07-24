'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyTrend } from '@/lib/analytics';

/** Two small trend lines: accuracy (%) and average response speed (s) over days. */
export function TrendCharts({ trends }: { trends: DailyTrend[] }) {
  if (trends.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Play a few games to see your trends over time.
      </p>
    );
  }

  const data = trends.map((t) => ({
    day: t.day.slice(5), // MM-DD
    accuracy: t.accuracyPct,
    speed: Number((t.avgSpeedMs / 1000).toFixed(2)),
  }));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium">Accuracy trend (%)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="day" fontSize={12} />
            <YAxis domain={[0, 100]} fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Avg response speed (s)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="day" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="speed" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
