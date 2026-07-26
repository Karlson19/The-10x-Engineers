import { randomUUID } from "node:crypto";
import type { Role, Section } from "@chrysmec/shared";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

/**
 * Every account a test creates carries this marker in its email so the suite
 * can clean up after itself without touching seeded demo data.
 */
export const TEST_EMAIL_MARKER = "chrysmec-test";

export const TEST_PASSWORD = "TestPassword123";

export function testEmail(label: string): string {
  return `${label}.${TEST_EMAIL_MARKER}.${randomUUID()}@example.com`;
}

export type SeededUser = {
  id: string;
  email: string;
  password: string;
};

export async function createTestUser(options: {
  label: string;
  role: Role;
  section?: Section | null;
  isActive?: boolean;
  password?: string;
}): Promise<SeededUser> {
  const password = options.password ?? TEST_PASSWORD;
  const email = testEmail(options.label);

  const user = await prisma.user.create({
    data: {
      fullName: `Test ${options.label}`,
      email,
      phone: "+233240000000",
      passwordHash: await hashPassword(password),
      role: options.role,
      section: options.section ?? null,
      isActive: options.isActive ?? true,
    },
  });

  return { id: user.id, email: user.email, password };
}

export async function deleteTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_MARKER } } });
}

/** Supertest types set-cookie loosely, so read it back as a list of strings. */
export function readSetCookies(headers: unknown): string[] {
  if (typeof headers !== "object" || headers === null || !("set-cookie" in headers)) {
    return [];
  }

  const raw = (headers as Record<string, unknown>)["set-cookie"];

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }

  return typeof raw === "string" ? [raw] : [];
}
