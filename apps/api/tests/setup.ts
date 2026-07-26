import path from "node:path";
import dotenv from "dotenv";

// Tests run against a real database. Load apps/api/.env unless the environment
// already provides the values, which is what happens in CI.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-long-enough-1234";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-long-enough-1234";
process.env.CORS_ORIGIN ??= "http://localhost:3000";
