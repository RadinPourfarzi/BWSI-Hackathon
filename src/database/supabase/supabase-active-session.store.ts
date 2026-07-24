import type { SupabaseClient } from '@supabase/supabase-js';
import { getEnvironment } from '@/config/environment';
import { GameError } from '@/server/errors/game.errors';
import type { ServerGameState } from '@/server/game/game-session.types';
import type { ActiveSessionStore } from '@/server/sessions/active-session.store';
import { serverGameStateSchema } from '@/server/sessions/server-session.schema';

interface ActiveSessionRow {
  id: string;
  version: number;
  state: unknown;
}

function persistenceError(operation: string, message: string): GameError {
  return new GameError(
    `Active-session ${operation} failed: ${message}`,
    'SERVICE_UNAVAILABLE',
    503,
  );
}

export class SupabaseActiveSessionStore implements ActiveSessionStore {
  constructor(private readonly client: SupabaseClient) {}

  async get(sessionId: string): Promise<ServerGameState | null> {
    const { data, error } = await this.client
      .from('active_game_sessions')
      .select('id, version, state')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      throw persistenceError('read', error.message);
    }
    if (!data) {
      return null;
    }

    const row = data as ActiveSessionRow;
    return serverGameStateSchema.parse({
      ...(row.state as object),
      version: row.version,
    });
  }

  async create(session: ServerGameState): Promise<void> {
    const expiresAt = expiresAtIso();
    const { error } = await this.client.from('active_game_sessions').insert({
      id: session.sessionId,
      user_id: session.userId,
      version: session.version,
      state: session,
      expires_at: expiresAt,
    });

    if (error) {
      if (error.code === '23505') {
        throw new GameError('The session already exists.', 'CONFLICT', 409);
      }
      throw persistenceError('create', error.message);
    }
  }

  async save(session: ServerGameState, expectedVersion: number): Promise<void> {
    const nextVersion = expectedVersion + 1;
    const nextState = { ...session, version: nextVersion };
    const { data, error } = await this.client
      .from('active_game_sessions')
      .update({
        state: nextState,
        version: nextVersion,
        expires_at: expiresAtIso(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.sessionId)
      .eq('version', expectedVersion)
      .select('id')
      .maybeSingle();

    if (error) {
      throw persistenceError('update', error.message);
    }
    if (!data) {
      throw new GameError(
        'The session changed while this action was being processed. Retry with the latest state.',
        'CONFLICT',
        409,
      );
    }

    session.version = nextVersion;
  }

  async delete(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from('active_game_sessions')
      .delete()
      .eq('id', sessionId);
    if (error) {
      throw persistenceError('delete', error.message);
    }
  }
}

function expiresAtIso(): string {
  const ttlMs = getEnvironment().ACTIVE_SESSION_TTL_SECONDS * 1_000;
  return new Date(Date.now() + ttlMs).toISOString();
}
