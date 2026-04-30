import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  FIREBASE_ADMIN_SERVICE_ACCOUNT: z.string().min(1, "FIREBASE_ADMIN_SERVICE_ACCOUNT is required"),
  RETIRE_TAX_DB_ID: z.string().min(1),
  RETIRE_5_PERCENT_DB_ID: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default("__wealthwise_session"),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(432000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
