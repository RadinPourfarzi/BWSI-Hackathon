export class GameError extends Error {
  constructor(
    message: string,
    readonly code:
      | "BAD_REQUEST"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "SESSION_ENDED",
    readonly status: number,
  ) {
    super(message);
    this.name = "GameError";
  }
}

export class SessionNotFoundError extends GameError {
  constructor() {
    super("Game session was not found.", "NOT_FOUND", 404);
  }
}

export class SessionOwnershipError extends GameError {
  constructor() {
    super("This game session belongs to another user.", "FORBIDDEN", 403);
  }
}
