import { getEnvironment } from '@/config/environment';
import { getSupabaseAuthenticationClient } from '@/database/supabase/clients';
import { sessionIdSchema } from '@/shared/schemas/game.schemas';
import { GameError } from '@/server/errors/game.errors';

export async function requireAuthenticatedUserId(request: Request): Promise<string> {
  const environment = getEnvironment();
  if (
    environment.NODE_ENV !== 'production' &&
    environment.APP_DATA_PROVIDER === 'mock' &&
    environment.ALLOW_DEV_AUTH_HEADER
  ) {
    const parsedUserId = sessionIdSchema.safeParse(request.headers.get('x-user-id'));
    if (parsedUserId.success) {
      return parsedUserId.data;
    }
  }

  const authorization = request.headers.get('authorization');
  const [scheme, accessToken] = authorization?.split(/\s+/, 2) ?? [];
  if (scheme?.toLowerCase() === 'bearer' && accessToken) {
    const supabase = getSupabaseAuthenticationClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) {
      return data.user.id;
    }
  }

  throw new GameError(
    'A valid Supabase bearer token is required.',
    'UNAUTHORIZED',
    401,
  );
}
