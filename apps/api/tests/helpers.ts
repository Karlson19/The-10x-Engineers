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

export async function createTestVehicle(
  ownerId: string,
  overrides: Partial<{ make: string; model: string; year: number; registrationNo: string }> = {},
): Promise<{ id: string; registrationNo: string }> {
  const registrationNo =
    overrides.registrationNo ?? `GT ${Math.floor(1000 + Math.random() * 8999)}-24`;

  const vehicle = await prisma.vehicle.create({
    data: {
      ownerId,
      make: overrides.make ?? "Toyota",
      model: overrides.model ?? "Corolla",
      year: overrides.year ?? 2018,
      registrationNo,
    },
  });

  return { id: vehicle.id, registrationNo: vehicle.registrationNo };
}

/**
 * Service requests hold a required reference to their client and vehicle, so
 * they have to go before the accounts that own them.
 */
export async function deleteTestUsers(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { contains: TEST_EMAIL_MARKER } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);

  if (ids.length > 0) {
    await prisma.serviceRequest.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.vehicle.deleteMany({ where: { ownerId: { in: ids } } });
  }

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
