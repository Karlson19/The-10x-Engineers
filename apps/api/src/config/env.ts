import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load apps/api/.env when present. In production the platform injects real
// values, so a missing file is not an error.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required. Copy .env.example to apps/api/.env."),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters. See the README for how to generate one."),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters and different from the access secret."),

  // Comma separated list of browser origins allowed to call this API.
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  PAYSTACK_SECRET_KEY: z.string().default(""),
  AFRICASTALKING_API_KEY: z.string().default(""),
  AFRICASTALKING_USERNAME: z.string().default("sandbox"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  // Fail loudly at boot rather than halfway through a request.
  console.error(`Invalid environment configuration:\n${issues.join("\n")}`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
} as const;

export const APP_NAME = "chrysmec-api";
export const APP_VERSION = "0.1.0";
