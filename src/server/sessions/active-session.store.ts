import type { ServerGameState } from "@/server/game/game-session.types";

export interface ActiveSessionStore {
  get(sessionId: string): Promise<ServerGameState | null>;
  set(session: ServerGameState): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

/**
 * Suitable for local development and unit tests only. Vercel/serverless
 * instances do not share process memory; replace this with a durable store.
 */
export class InMemoryActiveSessionStore implements ActiveSessionStore {
  private readonly sessions = new Map<string, ServerGameState>();

  async get(sessionId: string): Promise<ServerGameState | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async set(session: ServerGameState): Promise<void> {
    this.sessions.set(session.sessionId, structuredClone(session));
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}
