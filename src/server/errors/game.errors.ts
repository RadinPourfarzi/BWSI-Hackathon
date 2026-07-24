export type GameErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'POOL_EMPTY'
  | 'CONFLICT'
  | 'STALE_CHALLENGE'
  | 'INVALID_OPTION'
  | 'SESSION_ENDED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class GameError extends Error {
  constructor(
    message: string,
    readonly code: GameErrorCode,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class SessionNotFoundError extends GameError {
  constructor() {
    super('Game session was not found.', 'NOT_FOUND', 404);
  }
}

export class SessionOwnershipError extends GameError {
  constructor() {
    super('This game session belongs to another user.', 'FORBIDDEN', 403);
  }
}
