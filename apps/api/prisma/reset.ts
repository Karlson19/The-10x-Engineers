import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

/**
 * Clears the demo activity so a real team can use the app with their own
 * accounts, without starting from a database that cannot be signed into.
 *
 * What goes: every booking, job, work log line, payment, status event, piece of
 * feedback and notification, every vehicle, and the demo customer and
 * technician accounts. The management dashboard then reports zero, honestly,
 * rather than money nobody earned.
 *
 * What stays, on purpose:
 *
 *   The service catalogue and the parts list. These are the workshop's setup
 *   rather than pretend activity, and without them there is nothing to book and
 *   no part to log against a job, so the flow cannot be walked at all.
 *
 *   One management account. Registration only ever creates a customer, and only
 *   management may create staff, so wiping every user locks everybody out of
 *   the admin side with no way back in through the app.
 *
 * Run with: pnpm --filter api db:reset-demo
 */

const prisma = new PrismaClient();

const OWNER_EMAIL = process.env.RESET_OWNER_EMAIL ?? "ama.boateng@chrysmec.com";
const OWNER_PASSWORD = process.env.RESET_OWNER_PASSWORD ?? "Chrysmec#2026";
const OWNER_NAME = process.env.RESET_OWNER_NAME ?? "Chrysmec Management";
const OWNER_PHONE = process.env.RESET_OWNER_PHONE ?? "0555695431";

/** The same guard the seed uses. This deletes rows on whatever it points at. */
function assertSafeToReset(): void {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set, so there is nothing to reset.");
  }

  const host = new URL(url).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (isLocal || process.env.SEED_REMOTE === "yes") {
    console.error(`Resetting demo data on ${host}`);
    return;
  }

  throw new Error(
    [
      `Refusing to reset ${host}, which is not a database on this machine.`,
      "This deletes every booking and every account except one owner login.",
      "If that is genuinely what you want, run it again with SEED_REMOTE=yes.",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  assertSafeToReset();

  // Dependency order, so nothing trips a foreign key.
  await prisma.feedback.deleteMany();
  await prisma.statusEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.workLogEntry.deleteMany();
  await prisma.job.deleteMany();
  await prisma.requestedService.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vehicle.deleteMany();

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      fullName: OWNER_NAME,
      phone: OWNER_PHONE,
      role: "MANAGEMENT",
      section: null,
      isActive: true,
      passwordHash: await argon2.hash(OWNER_PASSWORD, { type: argon2.argon2id }),
    },
    create: {
      fullName: OWNER_NAME,
      email: OWNER_EMAIL,
      phone: OWNER_PHONE,
      role: "MANAGEMENT",
      passwordHash: await argon2.hash(OWNER_PASSWORD, { type: argon2.argon2id }),
    },
  });

  // Everyone else goes, including the demo technicians and customers.
  const removed = await prisma.user.deleteMany({ where: { id: { not: owner.id } } });

  const [services, parts] = await Promise.all([
    prisma.serviceCatalogItem.count(),
    prisma.inventoryItem.count(),
  ]);

  console.error("Demo data cleared.");
  console.error(`  accounts removed:  ${removed.count}`);
  console.error(`  bookings:          0`);
  console.error(`  vehicles:          0`);
  console.error(`  services kept:     ${services}`);
  console.error(`  parts kept:        ${parts}`);
  console.error("");
  console.error("  Sign in to manage the workshop with:");
  console.error(`    ${OWNER_EMAIL}`);
  console.error(`    ${OWNER_PASSWORD}`);
  console.error("");
  console.error("  Change that password from the account page, then add your");
  console.error("  technicians under Staff. Everyone else registers as a customer.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
