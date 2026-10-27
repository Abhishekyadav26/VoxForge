import { z } from "zod";

/**
 * Validate required environment variables at boot.
 * All keys are optional at runtime — missing ones degrade to
 * mock/dry-run behaviour instead of crashing (see lib/blocks/*).
 */
export const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  HELIUS_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
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