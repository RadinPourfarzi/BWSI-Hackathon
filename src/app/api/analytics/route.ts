import { NextResponse } from 'next/server';
import { container } from '@/server/bootstrap/container';
import { requireAuthenticatedUserId } from '@/server/auth/auth.service';
import { apiError } from '@/server/http/api-response';

export async function GET(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const analytics = await container.analytics.getPlayerAnalytics(userId);
    return NextResponse.json(analytics, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
