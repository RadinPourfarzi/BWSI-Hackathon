import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_DATA_PROVIDER: z.enum(["mock", "supabase"]).default("mock"),
    ALLOW_DEV_AUTH_HEADER: z.enum(["true", "false"]).default("false"),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  })
  .superRefine((environment, context) => {
    if (environment.APP_DATA_PROVIDER !== "supabase") {
      return;
    }

    for (const key of [
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const) {
      if (!environment[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when APP_DATA_PROVIDER=supabase.`,
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  cachedEnvironment ??= environmentSchema.parse(process.env);
  return cachedEnvironment;
}

export function resetEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
