"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { categoryConfig, categoryIds } from "@/config/categories";
import type { CategoryAnalytics } from "@/features/analytics/types";

export function AccuracyChart({
  categories,
}: {
  categories: Record<(typeof categoryIds)[number], CategoryAnalytics>;
}) {
  const data = categoryIds.map((categoryId) => ({
    category: categoryConfig[categoryId].shortName,
    accuracy: Math.round(categories[categoryId].accuracy),
    answered: categories[categoryId].answered,
    correct: categories[categoryId].correct,
    fill: categoryConfig[categoryId].accent,
  }));
  const totalAnswered = data.reduce(
    (total, category) => total + category.answered,
    0,
  );

  if (totalAnswered < 3) {
    return (
      <div className="grid h-72 place-items-center rounded-xl border border-dashed border-[var(--border)] px-6 text-center">
        <div>
          <p className="font-bold">More answers create a useful comparison</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Answer at least three questions. Current sample: {totalAnswered}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        aria-label={`Accuracy by category across ${totalAnswered} answered questions.`}
        className="h-72 w-full"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              stroke="#263044"
              strokeDasharray="4 6"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="category"
              stroke="#9aa5b8"
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              stroke="#9aa5b8"
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#141a27",
                border: "1px solid #263044",
                borderRadius: "12px",
                color: "#f5f7fb",
              }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              formatter={(value, _name, item) => [
                `${String(value)}% (${String(item.payload.correct)}/${String(item.payload.answered)})`,
                "Accuracy",
              ]}
            />
            <Bar dataKey="accuracy" radius={[8, 8, 2, 2]}>
              {data.map((entry) => (
                <Cell fill={entry.fill} key={entry.category} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Accuracy by category</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Correct</th>
            <th>Answered</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {data.map((category) => (
            <tr key={category.category}>
              <td>{category.category}</td>
              <td>{category.correct}</td>
              <td>{category.answered}</td>
              <td>{category.accuracy}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
