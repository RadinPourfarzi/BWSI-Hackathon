import { NextResponse } from "next/server";
import { container } from "@/server/bootstrap/container";
import { apiError } from "@/server/http/api-response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
    const leaderboard = await container.leaderboard.getLeaderboard(limit);
    return NextResponse.json(
      { entries: leaderboard },
      {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
