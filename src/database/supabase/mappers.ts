import { getEnvironment } from '@/config/environment';
import {
  type CompletionRpcRow,
  type GameSessionRow,
  type ProfileRow,
  type QuestionRow,
} from '@/database/supabase/database.types';
import type { GameSummaryCore } from '@/shared/contracts/game.contracts';
import { questionRecordSchema } from '@/shared/schemas/game.schemas';
import type {
  ActiveGameConfig,
  CategoryId,
  ChallengeContent,
  PlayerProfile,
  QuestionRecord,
} from '@/shared/types/game.types';
import type { CompletionResult } from '@/server/repositories/game.repository';

export function mapQuestionRow(
  row: QuestionRow,
  config: ActiveGameConfig,
): QuestionRecord {
  const categoryId = row.category_id as CategoryId;
  const category = config.categories[categoryId];
  if (!category) {
    throw new Error(`Unknown category '${row.category_id}' on question ${row.id}.`);
  }
  const metadata = recordValue(row.metadata);
  const correctOptionId = row.is_ai ? category.aiOptionId : category.nonAiOptionId;
  return questionRecordSchema.parse({
    id: row.id,
    categoryId,
    content: mapContent(row, categoryId, metadata),
    options: category.answerOptions,
    correctOptionId,
    difficulty: row.difficulty_rating,
    explanation: row.explanation_text,
    active: row.is_active,
  });
}

export function mapProfileRow(row: ProfileRow): PlayerProfile {
  return {
    userId: row.id,
    displayName: row.username,
    totalXp: row.total_xp,
    level: row.current_level,
    highestScore: row.highest_score,
    longestCombo: row.longest_combo,
    currentStreak: row.daily_streak,
    longestStreak: row.longest_streak,
    lastPlayedAt: row.last_played_at,
    gamesPlayed: row.games_played,
    arcadeGamesPlayed: row.arcade_games_played,
    trainingGamesPlayed: row.training_games_played,
    createdAt: row.created_at,
  };
}

export function mapSessionRow(row: GameSessionRow): GameSummaryCore {
  if (row.mode !== 'ARCADE' && row.mode !== 'TRAINING') {
    throw new Error(`Unexpected persisted game mode '${row.mode}'.`);
  }
  if (
    row.end_reason !== 'lives-depleted' &&
    row.end_reason !== 'pool-exhausted' &&
    row.end_reason !== 'abandoned'
  ) {
    throw new Error(`Unexpected persisted end reason '${row.end_reason}'.`);
  }
  return {
    sessionId: row.id,
    mode: row.mode,
    endReason: row.end_reason,
    finalScore: row.final_score,
    xpEarned: row.xp_earned,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    questionsAnswered: row.questions_answered,
    highestCombo: row.highest_combo,
    averageResponseTimeMs: row.average_response_time_ms,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export function mapCompletionRpcRow(row: CompletionRpcRow): CompletionResult {
  const summaryRow: GameSessionRow = {
    id: row.summary.session_id,
    user_id: row.profile.id,
    mode: row.summary.mode,
    status: 'completed',
    end_reason: row.summary.end_reason,
    config_version: 0,
    final_score: row.summary.final_score,
    xp_earned: row.summary.xp_earned,
    correct_count: row.summary.correct_count,
    incorrect_count: row.summary.incorrect_count,
    highest_combo: row.summary.highest_combo,
    questions_answered: row.summary.questions_answered,
    average_response_time_ms: row.summary.average_response_time_ms,
    categories_played: [],
    started_at: row.summary.started_at,
    ended_at: row.summary.ended_at,
    created_at: row.summary.ended_at,
  };
  return {
    summary: mapSessionRow(summaryRow),
    profile: mapProfileRow(row.profile),
    previousLevel: row.previous_level,
    previousHighestScore: row.previous_highest_score,
  };
}

function mapContent(
  row: QuestionRow,
  categoryId: CategoryId,
  metadata: Record<string, unknown>,
): ChallengeContent {
  if (metadata.kind !== undefined && metadata.kind !== categoryId) {
    throw new Error(`metadata.kind does not match question ${row.id}.`);
  }

  switch (categoryId) {
    case 'image':
      return {
        kind: 'image',
        mediaPath: resolveMediaPath(row.media_url),
        alt: optionalString(metadata.altText),
      };
    case 'email':
      return {
        kind: 'email',
        senderName: stringValue(metadata.senderName),
        senderAddress: stringValue(metadata.senderAddress),
        subject: stringValue(metadata.subject),
        body: stringValue(metadata.bodyText),
        receivedAt: optionalString(metadata.receivedAt),
        mediaPath:
          metadata.bodyFormat === 'image' ? resolveMediaPath(row.media_url) : undefined,
      };
    case 'audio': {
      const durationMs = optionalNumber(metadata.durationMs);
      return {
        kind: 'audio',
        mediaPath: resolveMediaPath(row.media_url),
        durationSeconds: durationMs === undefined ? undefined : durationMs / 1_000,
        transcript: optionalString(metadata.transcript),
      };
    }
  }
}

function resolveMediaPath(path: string): string {
  if (
    path.startsWith('/') ||
    path.startsWith('https://') ||
    path.startsWith('http://')
  ) {
    return path;
  }
  const url = getEnvironment().SUPABASE_URL;
  if (!url) {
    throw new Error('Supabase URL is required to resolve media paths.');
  }
  return `${url}/storage/v1/object/public/challenges/${path}`;
}

function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
