import { GameError } from "@/server/errors/game.errors";

/**
 * Replace this development adapter with Supabase Auth:
 * `supabase.auth.getUser()` on a server-created client.
 */
export async function requireAuthenticatedUserId(request: Request): Promise<string> {
  if (process.env.ALLOW_DEV_AUTH_HEADER === "true") {
    const userId = request.headers.get("x-user-id");
    if (userId) {
      return userId;
    }
  }

  throw new GameError(
    "Authentication is not configured. For local testing only, enable ALLOW_DEV_AUTH_HEADER and send x-user-id.",
    "UNAUTHORIZED",
    401,
  );
}
