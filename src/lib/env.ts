import { z } from "zod";

const publicConfigSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

const serviceConfigSchema = publicConfigSchema.extend({
  serviceRoleKey: z.string().min(20),
  mediaBucket: z.string().min(1).default("challenge-media"),
});

export type PublicSupabaseConfig = z.infer<typeof publicConfigSchema>;
export type ServiceSupabaseConfig = z.infer<typeof serviceConfigSchema>;

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const parsed = publicConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return parsed.success ? parsed.data : null;
}

export function getServiceSupabaseConfig(): ServiceSupabaseConfig | null {
  const parsed = serviceConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    mediaBucket: process.env.SUPABASE_MEDIA_BUCKET,
  });

  return parsed.success ? parsed.data : null;
}
