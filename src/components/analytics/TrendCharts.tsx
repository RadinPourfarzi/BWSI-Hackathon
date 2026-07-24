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
    return <p className="text-muted text-sm">Play a few rounds to see your trends over time.</p>;
  }

  const data = trends.map((t) => ({
    day: t.day.slice(5), // MM-DD
    accuracy: t.accuracyPct,
    speed: Number((t.avgSpeedMs / 1000).toFixed(2)),
  }));

  const axis = { fontSize: 12, fill: '#9e96b4' } as const;
  const tooltip = {
    contentStyle: {
      background: '#1c1730',
      border: '1px solid #332b52',
      borderRadius: 8,
      color: '#f2eee8',
    },
  } as const;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="text-muted mb-2 font-mono text-xs tracking-wide uppercase">
          Accuracy (%)
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#332b52" />
            <XAxis dataKey="day" tick={axis} stroke="#332b52" />
            <YAxis domain={[0, 100]} tick={axis} stroke="#332b52" />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="accuracy" stroke="#35d6a4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="text-muted mb-2 font-mono text-xs tracking-wide uppercase">
          Avg speed (s)
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#332b52" />
            <XAxis dataKey="day" tick={axis} stroke="#332b52" />
            <YAxis tick={axis} stroke="#332b52" />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="speed" stroke="#9b6dff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
