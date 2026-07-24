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

export function AccuracyChart({
  categoryAccuracy,
}: {
  categoryAccuracy: Record<string, number>;
}) {
  const data = categoryIds.map((categoryId) => ({
    category: categoryConfig[categoryId].shortName,
    accuracy: Math.round(categoryAccuracy[categoryId] ?? 0),
    fill: categoryConfig[categoryId].accent,
  }));

  return (
    <div className="h-72 w-full">
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
            formatter={(value) => [`${String(value)}%`, "Accuracy"]}
          />
          <Bar dataKey="accuracy" radius={[8, 8, 2, 2]}>
            {data.map((entry) => (
              <Cell fill={entry.fill} key={entry.category} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
