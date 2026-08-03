import path from "node:path";
import dotenv from "dotenv";

// Tests run against a real database. Load apps/api/.env unless the environment
// already provides the values, which is what happens in CI.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-long-enough-1234";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-long-enough-1234";
process.env.CORS_ORIGIN ??= "http://localhost:3000";

/**
 * Point the suite at its own database.
 *
 * TEST_DATABASE_URL wins when it is set, which is how CI already works and how
 * local runs should work too.
 */
const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
  process.env.DATABASE_URL = testUrl;
}

/**
 * Refuse to run against a database that something else is using.
 *
 * These tests create accounts, bookings and payments and then delete them
 * again. Pointed at the database the dev servers are on, that is not merely
 * untidy: this suite failed three times in one afternoon with errors that had
 * nothing to do with the code, purely because a dev server was reading rows
 * mid-run. Pointed at the deployed database it would be deleting real work.
 *
 * A database on this machine is fine. Anything else has to be named as the
 * test database, either through TEST_DATABASE_URL or by saying so outright.
 */
function assertIsolatedDatabase(): void {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set, so there is nothing to test against.");
  }

  if (testUrl || process.env.ALLOW_SHARED_TEST_DATABASE === "yes") {
    return;
  }

  const host = new URL(url).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (isLocal) {
    return;
  }

  throw new Error(
    [
      "",
      `Refusing to run the tests against ${host}.`,
      "",
      "That is the database the app itself uses. These tests create and delete",
      "accounts, bookings and payments, so sharing it makes runs fail for",
      "reasons that have nothing to do with the code, and risks real data.",
      "",
      "Give the suite its own database:",
      "",
      "  1. In the Neon console, branch the project. A branch is free, takes a",
      "     few seconds, and starts as a copy of the schema.",
      "  2. Put its connection string in apps/api/.env as TEST_DATABASE_URL.",
      "  3. Run: pnpm --filter api exec prisma migrate deploy",
      "",
      "To run against this database anyway, and accept both risks, set",
      "ALLOW_SHARED_TEST_DATABASE=yes.",
      "",
    ].join("\n"),
  );
}

assertIsolatedDatabase();
