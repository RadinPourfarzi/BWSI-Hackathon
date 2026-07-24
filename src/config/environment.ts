import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    APP_DATA_PROVIDER: z.enum(['mock', 'supabase']),
    ALLOW_DEV_AUTH_HEADER: z.boolean(),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    ACTIVE_SESSION_TTL_SECONDS: z.number().int().min(300).max(604_800),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.ALLOW_DEV_AUTH_HEADER) {
      context.addIssue({
        code: 'custom',
        path: ['ALLOW_DEV_AUTH_HEADER'],
        message: 'Development authentication cannot be enabled in production.',
      });
    }
    if (environment.APP_DATA_PROVIDER !== 'supabase') {
      return;
    }
    for (const key of [
      'SUPABASE_URL',
      'SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ] as const) {
      if (!environment[key]) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when APP_DATA_PROVIDER=supabase.`,
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  cachedEnvironment ??= environmentSchema.parse({
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    APP_DATA_PROVIDER: process.env.APP_DATA_PROVIDER ?? 'mock',
    ALLOW_DEV_AUTH_HEADER: (process.env.ALLOW_DEV_AUTH_HEADER ?? 'false') === 'true',
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ACTIVE_SESSION_TTL_SECONDS: Number(
      process.env.ACTIVE_SESSION_TTL_SECONDS ?? '86400',
    ),
  });
  return cachedEnvironment;
}

export function resetEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
