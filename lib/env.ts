import { z } from "zod";

/**
 * Validate required environment variables at boot.
 * All keys are optional at runtime — missing ones degrade to
 * mock/dry-run behaviour instead of crashing (see lib/blocks/*).
 */
export const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  COINMARKETCAP_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  // Supabase persistence: when both are set, agents/runs are stored in the
  // cloud (service-role key, server-side only). Otherwise the app falls back
  // to local JSON files (see lib/db.ts).
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("Environment validation warning:", parsed.error.flatten());
    return {};
  }
  return parsed.data;
}