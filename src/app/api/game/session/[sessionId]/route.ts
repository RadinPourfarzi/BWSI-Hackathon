import { NextResponse } from 'next/server';
import { container } from '@/server/bootstrap/container';
import { requireAuthenticatedUserId } from '@/server/auth/auth.service';
import { apiError } from '@/server/http/api-response';
import { sessionIdSchema } from '@/shared/schemas/game.schemas';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { sessionId: rawSessionId } = await context.params;
    const sessionId = sessionIdSchema.parse(rawSessionId);
    const response = await container.gameSessions.getGame(userId, sessionId);
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
