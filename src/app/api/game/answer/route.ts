import { NextResponse } from 'next/server';
import { container } from '@/server/bootstrap/container';
import { requireAuthenticatedUserId } from '@/server/auth/auth.service';
import { apiError } from '@/server/http/api-response';
import { submitAnswerSchema } from '@/shared/schemas/game.schemas';

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = submitAnswerSchema.parse(await request.json());
    const response = await container.gameSessions.submitAnswer(userId, body);
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
