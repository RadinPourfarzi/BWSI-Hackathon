import { NextResponse } from 'next/server';
import { container } from '@/server/bootstrap/container';
import { requireAuthenticatedUserId } from '@/server/auth/auth.service';
import { apiError } from '@/server/http/api-response';
import { endGameSchema } from '@/shared/schemas/game.schemas';

/**
 * Compatibility route matching the architecture document. It reissues the
 * current question without resetting the server timer. New clients may prefer
 * GET /api/game/session/:sessionId.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { sessionId } = endGameSchema.parse(await request.json());
    const response = await container.gameSessions.getGame(userId, sessionId);
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
