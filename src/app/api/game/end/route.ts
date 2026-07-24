import { NextResponse } from "next/server";
import { container } from "@/server/bootstrap/container";
import { requireAuthenticatedUserId } from "@/server/auth/auth.service";
import { apiError } from "@/server/http/api-response";
import { endGameSchema } from "@/shared/schemas/game.schemas";

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = endGameSchema.parse(await request.json());
    const summary = await container.gameSessions.endGame(userId, body);
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
