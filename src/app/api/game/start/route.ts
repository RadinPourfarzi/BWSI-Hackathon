import { NextResponse } from "next/server";
import { container } from "@/server/bootstrap/container";
import { requireAuthenticatedUserId } from "@/server/auth/auth.service";
import { apiError } from "@/server/http/api-response";
import { startGameSchema } from "@/shared/schemas/game.schemas";

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = startGameSchema.parse(await request.json());
    const response = await container.gameSessions.startGame(userId, body);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
