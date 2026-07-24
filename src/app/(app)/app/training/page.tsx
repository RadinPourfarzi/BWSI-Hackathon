import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import {
  categoryConfig,
  categoryIds,
  type CategoryId,
} from "@/config/categories";
import { gameConfig } from "@/config/game";
import { GameBoard } from "@/features/game/game-board";
import { createGameSession, getChallengeBatch } from "@/services/challenges";

export const metadata: Metadata = {
  title: "Training",
};

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const parameters = await searchParams;
  const selected = categoryIds.includes(parameters.category as CategoryId)
    ? (parameters.category as CategoryId)
    : null;

  if (!selected) {
    return (
      <div className="animate-enter">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--pink)] uppercase">
          Training
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Choose a category
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Focus on one detection surface and study each explanation.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {categoryIds.map((categoryId) => {
            const category = categoryConfig[categoryId];
            const Icon = category.icon;

            return (
              <Card key={categoryId}>
                <CardContent className="p-6">
                  <span
                    className="grid size-11 place-items-center rounded-xl"
                    style={{ backgroundColor: `${category.accent}18` }}
                  >
                    <Icon
                      className="size-5"
                      style={{ color: category.accent }}
                    />
                  </span>
                  <h2 className="mt-5 text-xl font-black">{category.name}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">
                    {category.description}
                  </p>
                  <Badge className="mt-4">
                    {category.optionA} vs {category.optionB}
                  </Badge>
                  <Link
                    className={buttonClassName({
                      className: "mt-6 w-full",
                      variant: "secondary",
                    })}
                    href={`/app/training?category=${categoryId}`}
                  >
                    Train {category.shortName}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const result = await getChallengeBatch({
    categories: [selected],
    limit: gameConfig.questionCount.training,
  });

  if (result.challenges.length === 0) {
    return (
      <EmptyState
        description={`${result.error ?? "No challenges are available."} Seed the selected category and try again.`}
        title="No training set available"
      />
    );
  }

  const sessionId = await createGameSession({
    mode: "training",
    challenges: result.challenges,
  });

  return (
    <div className="animate-enter">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--pink)] uppercase">
            Training
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {categoryConfig[selected].name}
          </h1>
        </div>
        <Link
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href="/app/training"
        >
          Change category
        </Link>
      </div>
      <GameBoard
        challenges={result.challenges}
        mode="training"
        sessionId={sessionId}
      />
    </div>
  );
}
