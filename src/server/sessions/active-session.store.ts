import type { ServerGameState } from "@/server/game/game-session.types";
import { GameError } from "@/server/errors/game.errors";

export interface ActiveSessionStore {
  get(sessionId: string): Promise<ServerGameState | null>;
  create(session: ServerGameState): Promise<void>;
  save(session: ServerGameState, expectedVersion: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

/**
 * Suitable for local development and unit tests only. Vercel/serverless
 * instances do not share process memory; replace this with a durable store.
 */
export class InMemoryActiveSessionStore implements ActiveSessionStore {
  private readonly sessions = new Map<string, ServerGameState>();

  async get(sessionId: string): Promise<ServerGameState | null> {
    const session = this.sessions.get(sessionId);
    return session ? structuredClone(session) : null;
  }

  async create(session: ServerGameState): Promise<void> {
    if (this.sessions.has(session.sessionId)) {
      throw new GameError("The session already exists.", "CONFLICT", 409);
    }
    this.sessions.set(session.sessionId, structuredClone(session));
  }

  async save(session: ServerGameState, expectedVersion: number): Promise<void> {
    const current = this.sessions.get(session.sessionId);
    if (!current || current.version !== expectedVersion) {
      throw new GameError(
        "The session changed while this action was being processed. Retry with the latest state.",
        "CONFLICT",
        409,
      );
    }

    session.version = expectedVersion + 1;
    this.sessions.set(session.sessionId, structuredClone(session));
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}
