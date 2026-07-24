import { NextResponse } from 'next/server';
import { container } from '@/server/bootstrap/container';
import { requireAuthenticatedUserId } from '@/server/auth/auth.service';
import { apiError } from '@/server/http/api-response';

export async function GET(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const profile = await container.repository.getProfile(userId);
    return NextResponse.json(profile, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
