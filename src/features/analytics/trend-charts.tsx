"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AnalyticsTrendPoint } from "@/features/analytics/types";

type TrendField =
  | "overallAccuracy"
  | "imageAccuracy"
  | "emailAccuracy"
  | "voiceAccuracy"
  | "averageResponseMs"
  | "averageScore";

const chartDefinitions: Array<{
  field: TrendField;
  title: string;
  description: string;
  color: string;
  percentage?: boolean;
  milliseconds?: boolean;
}> = [
  {
    field: "overallAccuracy",
    title: "Overall accuracy over time",
    description: "Accuracy for each completed session",
    color: "var(--blue)",
    percentage: true,
  },
  {
    field: "imageAccuracy",
    title: "Image accuracy over time",
    description: "Sessions containing image challenges",
    color: "#7da7ff",
    percentage: true,
  },
  {
    field: "emailAccuracy",
    title: "Email accuracy over time",
    description: "Sessions containing email challenges",
    color: "var(--orange)",
    percentage: true,
  },
  {
    field: "voiceAccuracy",
    title: "Audio accuracy over time",
    description: "Sessions containing voice challenges",
    color: "var(--success)",
    percentage: true,
  },
  {
    field: "averageResponseMs",
    title: "Average response time over time",
    description: "Mean answer time for each session",
    color: "#ffb15c",
    milliseconds: true,
  },
  {
    field: "averageScore",
    title: "Average Arcade score over time",
    description: "Rolling average of the latest five Arcade games",
    color: "#ffd166",
  },
];

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatValue(
  value: number,
  definition: (typeof chartDefinitions)[number],
): string {
  if (definition.percentage) return `${Math.round(value)}%`;
  if (definition.milliseconds) return `${(value / 1_000).toFixed(1)}s`;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function TrendChart({
  definition,
  points,
}: {
  definition: (typeof chartDefinitions)[number];
  points: AnalyticsTrendPoint[];
}) {
  const usablePoints = points.filter(
    (point) => point[definition.field] !== null,
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="font-black">{definition.title}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {definition.description}
        </p>
      </CardHeader>
      <CardContent>
        {usablePoints.length < 3 ? (
          <div className="grid h-56 place-items-center rounded-xl border border-dashed border-[var(--border)] px-6 text-center">
            <div>
              <p className="font-bold">More play creates a useful trend</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Complete at least three matching sessions. Current sample:{" "}
                {usablePoints.length}.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              aria-label={`${definition.title}. ${usablePoints.length} sessions shown.`}
              className="h-56 w-full"
              role="img"
            >
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  data={usablePoints}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="4 6"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="date"
                    minTickGap={24}
                    stroke="var(--muted)"
                    tickFormatter={dateLabel}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    domain={definition.percentage ? [0, 100] : ["auto", "auto"]}
                    stroke="var(--muted)"
                    tickFormatter={(value: number) =>
                      formatValue(value, definition)
                    }
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--tooltip-background)",
                      border: "1px solid var(--chart-grid)",
                      borderRadius: "12px",
                      color: "var(--tooltip-foreground)",
                    }}
                    formatter={(value) => [
                      formatValue(Number(value), definition),
                      definition.title,
                    ]}
                    labelFormatter={(value) => dateLabel(String(value))}
                  />
                  <Line
                    activeDot={{ r: 5 }}
                    dataKey={definition.field}
                    dot={{ r: 3 }}
                    stroke={definition.color}
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>{definition.title}</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Questions</th>
                </tr>
              </thead>
              <tbody>
                {usablePoints.map((point) => (
                  <tr key={point.id}>
                    <td>{point.date}</td>
                    <td>
                      {formatValue(Number(point[definition.field]), definition)}
                    </td>
                    <td>{point.sampleSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function TrendCharts({ points }: { points: AnalyticsTrendPoint[] }) {
  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-2">
      {chartDefinitions.map((definition) => (
        <TrendChart
          definition={definition}
          key={definition.field}
          points={points}
        />
      ))}
    </section>
  );
}
