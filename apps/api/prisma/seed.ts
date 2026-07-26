import { randomUUID } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import argon2 from "argon2";
import {
  type JobStatus,
  type LineType,
  type PaymentMethod,
  type PaymentStatus,
  type Prisma,
  PrismaClient,
  type RequestStatus,
  type Role,
  type Section,
} from "@prisma/client";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const prisma = new PrismaClient();

/**
 * Demo password for every seeded account. Development only. Real accounts are
 * created through POST /auth/register and never through this script.
 */
const DEMO_PASSWORD = "Chrysmec#2026";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic pseudo random numbers so re-seeding produces the same shape. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260726);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function daysAgo(days: number, hour: number, minute = 0): Date {
  const date = new Date(Date.now() - days * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Amounts are held as integer pesewas while calculating, then written as Decimal strings. */
function money(pesewas: number): string {
  return (pesewas / 100).toFixed(2);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

type CatalogueSeed = {
  name: string;
  description: string;
  section: Section;
  basePricePesewas: number;
};

const CATALOGUE: readonly CatalogueSeed[] = [
  {
    name: "Full engine service",
    description: "Oil and filter change, plugs, fluid top up and a 30 point inspection.",
    section: "MECHANICAL",
    basePricePesewas: 65000,
  },
  {
    name: "Brake pad replacement",
    description: "Front or rear pads replaced, discs measured and brake fluid checked.",
    section: "MECHANICAL",
    basePricePesewas: 48000,
  },
  {
    name: "Clutch inspection and repair",
    description: "Clutch travel and slip tested, plate and cable replaced where needed.",
    section: "MECHANICAL",
    basePricePesewas: 120000,
  },
  {
    name: "Suspension check and repair",
    description: "Shocks, bushings and links checked on a lift, worn parts replaced.",
    section: "MECHANICAL",
    basePricePesewas: 85000,
  },
  {
    name: "Cooling system flush",
    description: "Radiator flushed, coolant replaced, thermostat and hoses inspected.",
    section: "MECHANICAL",
    basePricePesewas: 42000,
  },
  {
    name: "Battery test and replacement",
    description: "Load test on the battery and charging circuit, replacement if it fails.",
    section: "ELECTRICAL",
    basePricePesewas: 38000,
  },
  {
    name: "Alternator diagnosis",
    description: "Charging output measured under load, brushes and regulator inspected.",
    section: "ELECTRICAL",
    basePricePesewas: 55000,
  },
  {
    name: "Starter motor repair",
    description: "Starter draw tested, solenoid and brushes rebuilt or the unit replaced.",
    section: "ELECTRICAL",
    basePricePesewas: 72000,
  },
  {
    name: "Wiring fault tracing",
    description: "Intermittent faults traced circuit by circuit, damaged looms repaired.",
    section: "ELECTRICAL",
    basePricePesewas: 60000,
  },
  {
    name: "Air conditioning electrical repair",
    description: "Compressor clutch, relays and pressure switches tested and repaired.",
    section: "ELECTRICAL",
    basePricePesewas: 90000,
  },
];

type InventorySeed = {
  name: string;
  sku: string;
  section: Section;
  quantityInStock: number;
  unitCostPesewas: number;
  reorderLevel: number;
};

const INVENTORY: readonly InventorySeed[] = [
  { name: "Engine oil 5W-30, 5 litre", sku: "MEC-OIL-5W30", section: "MECHANICAL", quantityInStock: 48, unitCostPesewas: 21500, reorderLevel: 10 },
  { name: "Oil filter, standard saloon", sku: "MEC-FLT-OIL1", section: "MECHANICAL", quantityInStock: 36, unitCostPesewas: 4500, reorderLevel: 8 },
  { name: "Air filter, standard saloon", sku: "MEC-FLT-AIR1", section: "MECHANICAL", quantityInStock: 22, unitCostPesewas: 6200, reorderLevel: 8 },
  { name: "Front brake pad set", sku: "MEC-BRK-PADF", section: "MECHANICAL", quantityInStock: 14, unitCostPesewas: 18000, reorderLevel: 6 },
  { name: "Rear brake pad set", sku: "MEC-BRK-PADR", section: "MECHANICAL", quantityInStock: 9, unitCostPesewas: 16500, reorderLevel: 6 },
  { name: "Brake fluid DOT 4, 1 litre", sku: "MEC-BRK-FLD4", section: "MECHANICAL", quantityInStock: 5, unitCostPesewas: 5800, reorderLevel: 6 },
  { name: "Front shock absorber", sku: "MEC-SUS-SHKF", section: "MECHANICAL", quantityInStock: 8, unitCostPesewas: 34000, reorderLevel: 4 },
  { name: "Coolant concentrate, 4 litre", sku: "MEC-COL-CONC", section: "MECHANICAL", quantityInStock: 17, unitCostPesewas: 9800, reorderLevel: 6 },
  { name: "Radiator hose, upper", sku: "MEC-COL-HOSU", section: "MECHANICAL", quantityInStock: 4, unitCostPesewas: 7400, reorderLevel: 5 },
  { name: "Battery 12V 65Ah", sku: "ELE-BAT-65AH", section: "ELECTRICAL", quantityInStock: 11, unitCostPesewas: 62000, reorderLevel: 4 },
  { name: "Alternator, reconditioned", sku: "ELE-ALT-RECN", section: "ELECTRICAL", quantityInStock: 6, unitCostPesewas: 78000, reorderLevel: 3 },
  { name: "Starter solenoid", sku: "ELE-STR-SOLN", section: "ELECTRICAL", quantityInStock: 3, unitCostPesewas: 24000, reorderLevel: 4 },
  { name: "Ignition coil pack", sku: "ELE-IGN-COIL", section: "ELECTRICAL", quantityInStock: 13, unitCostPesewas: 29500, reorderLevel: 5 },
  { name: "Automotive wiring loom, 5 metre", sku: "ELE-WIR-LOM5", section: "ELECTRICAL", quantityInStock: 20, unitCostPesewas: 8600, reorderLevel: 6 },
  { name: "Blade fuse assortment, 100 piece", sku: "ELE-FUS-AS100", section: "ELECTRICAL", quantityInStock: 7, unitCostPesewas: 4200, reorderLevel: 5 },
];

type SymptomSeed = {
  category: string;
  /** Stored in the ServiceRequest.symptomDetails Json column. */
  details: Prisma.InputJsonObject;
};

const MECHANICAL_SYMPTOMS: readonly SymptomSeed[] = [
  {
    category: "Engine",
    details: {
      whenItHappens: "When accelerating uphill",
      warningLights: ["Check engine"],
      unusualNoise: "Knocking from the front of the engine",
      severity: "Still drivable",
      notes: "Started about two weeks ago and is getting worse.",
    },
  },
  {
    category: "Brakes",
    details: {
      whenItHappens: "Every time I brake",
      warningLights: [],
      unusualNoise: "Metal on metal grinding at the front",
      severity: "Needs attention soon",
      notes: "Pedal also feels softer than usual.",
    },
  },
  {
    category: "Suspension",
    details: {
      whenItHappens: "Over speed bumps and rough road",
      warningLights: [],
      unusualNoise: "Clunk from the rear left",
      severity: "Still drivable",
      notes: "The car leans in corners more than it used to.",
    },
  },
  {
    category: "Transmission",
    details: {
      whenItHappens: "Changing from second to third",
      warningLights: [],
      unusualNoise: "None",
      severity: "Needs attention soon",
      notes: "Revs climb but the car does not pull.",
    },
  },
  {
    category: "Cooling",
    details: {
      whenItHappens: "In traffic after 20 minutes",
      warningLights: ["Temperature"],
      unusualNoise: "None",
      severity: "Not safe to drive",
      notes: "Steam from the bonnet and coolant on the ground.",
    },
  },
];

const ELECTRICAL_SYMPTOMS: readonly SymptomSeed[] = [
  {
    category: "Battery and charging",
    details: {
      whenItHappens: "First start in the morning",
      warningLights: ["Battery"],
      unusualNoise: "Slow cranking",
      severity: "Needs attention soon",
      notes: "I have had to jump start it three times this week.",
    },
  },
  {
    category: "Starting",
    details: {
      whenItHappens: "Randomly, mostly when the engine is hot",
      warningLights: [],
      unusualNoise: "Single click and nothing",
      severity: "Not safe to drive",
      notes: "Tapping the starter sometimes gets it going.",
    },
  },
  {
    category: "Lighting",
    details: {
      whenItHappens: "At night on full beam",
      warningLights: [],
      unusualNoise: "None",
      severity: "Still drivable",
      notes: "Left headlight cuts out and comes back on bumps.",
    },
  },
  {
    category: "Air conditioning",
    details: {
      whenItHappens: "After about ten minutes of driving",
      warningLights: [],
      unusualNoise: "Click from the engine bay when it stops",
      severity: "Still drivable",
      notes: "Blows cold then warm, then cold again.",
    },
  },
  {
    category: "Wiring",
    details: {
      whenItHappens: "When I use the electric windows",
      warningLights: [],
      unusualNoise: "None",
      severity: "Still drivable",
      notes: "A fuse keeps blowing on the same circuit.",
    },
  },
];

/**
 * Twenty requests across the last six months. Older work is settled, the recent
 * weeks are still moving, so the analytics dashboard has a real curve on it.
 */
type RequestPlan = { daysAgo: number; status: RequestStatus; section: Section };

const REQUEST_PLAN: readonly RequestPlan[] = [
  { daysAgo: 176, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 168, status: "COMPLETED", section: "ELECTRICAL" },
  { daysAgo: 152, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 141, status: "CANCELLED", section: "ELECTRICAL" },
  { daysAgo: 133, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 118, status: "COMPLETED", section: "ELECTRICAL" },
  { daysAgo: 104, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 96, status: "COMPLETED", section: "ELECTRICAL" },
  { daysAgo: 88, status: "CANCELLED", section: "MECHANICAL" },
  { daysAgo: 74, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 63, status: "COMPLETED", section: "ELECTRICAL" },
  { daysAgo: 51, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 40, status: "COMPLETED", section: "ELECTRICAL" },
  { daysAgo: 29, status: "COMPLETED", section: "MECHANICAL" },
  { daysAgo: 18, status: "AWAITING_APPROVAL", section: "ELECTRICAL" },
  { daysAgo: 11, status: "IN_PROGRESS", section: "MECHANICAL" },
  { daysAgo: 7, status: "IN_PROGRESS", section: "ELECTRICAL" },
  { daysAgo: 4, status: "SCHEDULED", section: "MECHANICAL" },
  { daysAgo: 2, status: "SUBMITTED", section: "ELECTRICAL" },
  { daysAgo: 1, status: "SUBMITTED", section: "MECHANICAL" },
];

/** The path a request took to reach its current status. */
const STATUS_PATHS: Readonly<Record<RequestStatus, readonly RequestStatus[]>> = {
  SUBMITTED: ["SUBMITTED"],
  SCHEDULED: ["SUBMITTED", "SCHEDULED"],
  IN_PROGRESS: ["SUBMITTED", "SCHEDULED", "IN_PROGRESS"],
  AWAITING_APPROVAL: ["SUBMITTED", "SCHEDULED", "IN_PROGRESS", "AWAITING_APPROVAL"],
  COMPLETED: ["SUBMITTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
  CANCELLED: ["SUBMITTED", "CANCELLED"],
};

const STATUS_NOTES: Readonly<Record<RequestStatus, string>> = {
  SUBMITTED: "Booking received from the customer.",
  SCHEDULED: "Slot confirmed and a technician assigned.",
  IN_PROGRESS: "Vehicle received at the workshop, diagnosis started.",
  AWAITING_APPROVAL: "Estimate sent to the customer for approval.",
  COMPLETED: "Work finished and the vehicle handed back.",
  CANCELLED: "Cancelled at the customer's request.",
};

const LOCATIONS: readonly string[] = [
  "Chrysmec workshop, Spintex Road",
  "Chrysmec workshop, Spintex Road",
  "Customer address, East Legon",
  "Customer address, Tema Community 5",
  "Roadside, Tetteh Quarshie Interchange",
];

const DIAGNOSIS_NOTES: readonly string[] = [
  "Confirmed the fault on a road test, then verified it on the lift.",
  "Traced the fault to a worn component. Replaced and retested twice.",
  "Measured against the service manual figures. Reading was out of range.",
  "Cleaned and reseated the connections, then replaced the failed part.",
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function clearDatabase(): Promise<void> {
  // Deleted in dependency order so nothing trips a foreign key.
  await prisma.feedback.deleteMany();
  await prisma.statusEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.workLogEntry.deleteMany();
  await prisma.job.deleteMany();
  await prisma.requestedService.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.serviceCatalogItem.deleteMany();
  await prisma.user.deleteMany();
}

type UserSeed = {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  section: Section | null;
};

const USERS: readonly UserSeed[] = [
  {
    fullName: "Ama Boateng",
    email: "ama.boateng@chrysmec.com",
    phone: "+233201110001",
    role: "MANAGEMENT",
    section: null,
  },
  {
    fullName: "Kwame Mensah",
    email: "kwame.mensah@chrysmec.com",
    phone: "+233201110002",
    role: "STAFF",
    section: "MECHANICAL",
  },
  {
    fullName: "Yaw Owusu",
    email: "yaw.owusu@chrysmec.com",
    phone: "+233201110003",
    role: "STAFF",
    section: "ELECTRICAL",
  },
  {
    fullName: "Akosua Danso",
    email: "akosua.danso@example.com",
    phone: "+233241110004",
    role: "CLIENT",
    section: null,
  },
  {
    fullName: "Kofi Asare",
    email: "kofi.asare@example.com",
    phone: "+233241110005",
    role: "CLIENT",
    section: null,
  },
];

type VehicleSeed = {
  ownerEmail: string;
  make: string;
  model: string;
  year: number;
  registrationNo: string;
  notes: string | null;
};

const VEHICLES: readonly VehicleSeed[] = [
  {
    ownerEmail: "akosua.danso@example.com",
    make: "Toyota",
    model: "Corolla",
    year: 2016,
    registrationNo: "GR 4821-19",
    notes: "Serviced here since 2021. Takes 5W-30.",
  },
  {
    ownerEmail: "akosua.danso@example.com",
    make: "Nissan",
    model: "X-Trail",
    year: 2019,
    registrationNo: "GT 1094-21",
    notes: null,
  },
  {
    ownerEmail: "kofi.asare@example.com",
    make: "Hyundai",
    model: "Elantra",
    year: 2014,
    registrationNo: "GW 7733-16",
    notes: "Aftermarket alarm fitted, wiring behind the dash is untidy.",
  },
  {
    ownerEmail: "kofi.asare@example.com",
    make: "Kia",
    model: "Sportage",
    year: 2021,
    registrationNo: "GS 2210-22",
    notes: null,
  },
];

async function main(): Promise<void> {
  console.error("Clearing existing data");
  await clearDatabase();

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  console.error("Creating users");
  const users = await Promise.all(
    USERS.map((user) =>
      prisma.user.create({
        data: {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          passwordHash,
          role: user.role,
          section: user.section,
        },
      }),
    ),
  );

  const byEmail = new Map(users.map((user) => [user.email, user]));
  const management = users.filter((user) => user.role === "MANAGEMENT");
  const clients = users.filter((user) => user.role === "CLIENT");
  const staffBySection = new Map<Section, string>();
  for (const user of users) {
    if (user.role === "STAFF" && user.section) {
      staffBySection.set(user.section, user.id);
    }
  }

  console.error("Creating vehicles");
  const vehicles = await Promise.all(
    VEHICLES.map((vehicle) => {
      const owner = byEmail.get(vehicle.ownerEmail);
      if (!owner) {
        throw new Error(`Vehicle owner ${vehicle.ownerEmail} was not created.`);
      }
      return prisma.vehicle.create({
        data: {
          ownerId: owner.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          registrationNo: vehicle.registrationNo,
          notes: vehicle.notes,
        },
      });
    }),
  );

  console.error("Creating service catalogue");
  const catalogue = await Promise.all(
    CATALOGUE.map((item) =>
      prisma.serviceCatalogItem.create({
        data: {
          name: item.name,
          description: item.description,
          section: item.section,
          basePrice: money(item.basePricePesewas),
          isActive: true,
        },
      }),
    ),
  );

  console.error("Creating inventory");
  const inventory = await Promise.all(
    INVENTORY.map((item) =>
      prisma.inventoryItem.create({
        data: {
          name: item.name,
          sku: item.sku,
          section: item.section,
          quantityInStock: item.quantityInStock,
          unitCost: money(item.unitCostPesewas),
          reorderLevel: item.reorderLevel,
        },
      }),
    ),
  );

  console.error("Creating service requests");
  let paymentCounter = 0;
  let completedCount = 0;

  for (const plan of REQUEST_PLAN) {
    const client = pick(clients);
    const clientVehicles = vehicles.filter((vehicle) => vehicle.ownerId === client.id);
    const vehicle = pick(clientVehicles);
    const symptom = pick(plan.section === "MECHANICAL" ? MECHANICAL_SYMPTOMS : ELECTRICAL_SYMPTOMS);
    const sectionCatalogue = catalogue.filter((item) => item.section === plan.section);
    const sectionInventory = inventory.filter((item) => item.section === plan.section);

    const createdAt = daysAgo(plan.daysAgo, 8 + Math.floor(random() * 3), 15);
    const preferredDateTime = daysAgo(plan.daysAgo - 2, 9 + Math.floor(random() * 6), 30);

    const chosenServices = [pick(sectionCatalogue)];
    if (random() > 0.55) {
      const extra = pick(sectionCatalogue);
      if (extra.id !== chosenServices[0].id) {
        chosenServices.push(extra);
      }
    }

    const hasEstimate = plan.status === "AWAITING_APPROVAL" || plan.status === "COMPLETED";
    const estimatePesewas = chosenServices.reduce(
      (total, item) => total + Math.round(Number(item.basePrice) * 100),
      0,
    );

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        clientId: client.id,
        vehicleId: vehicle.id,
        section: plan.section,
        status: plan.status,
        preferredDateTime,
        locationText: pick(LOCATIONS),
        latitude: 5.6037 + (random() - 0.5) * 0.08,
        longitude: -0.187 + (random() - 0.5) * 0.08,
        symptomCategory: symptom.category,
        symptomDetails: symptom.details,
        estimatedCost: hasEstimate ? money(estimatePesewas) : null,
        clientRequestId: randomUUID(),
        createdAt,
        requestedServices: {
          create: chosenServices.map((item) => ({ serviceCatalogItemId: item.id })),
        },
      },
    });

    // Status timeline. One event per step the request actually went through.
    const path = STATUS_PATHS[plan.status];
    for (let step = 0; step < path.length; step += 1) {
      const toStatus = path[step];
      await prisma.statusEvent.create({
        data: {
          serviceRequestId: serviceRequest.id,
          fromStatus: step === 0 ? null : path[step - 1],
          toStatus,
          note: STATUS_NOTES[toStatus],
          createdAt: new Date(createdAt.getTime() + step * 26 * 60 * 60 * 1000),
        },
      });
    }

    const needsJob =
      plan.status === "SCHEDULED" ||
      plan.status === "IN_PROGRESS" ||
      plan.status === "AWAITING_APPROVAL" ||
      plan.status === "COMPLETED";

    if (!needsJob) {
      continue;
    }

    const assignedStaffId = staffBySection.get(plan.section);
    if (!assignedStaffId) {
      throw new Error(`No staff member seeded for the ${plan.section} section.`);
    }

    const jobStatus: JobStatus =
      plan.status === "SCHEDULED"
        ? "ASSIGNED"
        : plan.status === "COMPLETED"
          ? "COMPLETED"
          : "IN_PROGRESS";

    const startedAt = plan.status === "SCHEDULED" ? null : new Date(createdAt.getTime() + 2 * DAY_MS);
    const completedAt = plan.status === "COMPLETED" ? new Date(createdAt.getTime() + 3 * DAY_MS) : null;

    const job = await prisma.job.create({
      data: {
        serviceRequestId: serviceRequest.id,
        assignedStaffId,
        status: jobStatus,
        startedAt,
        completedAt,
        diagnosisNotes: plan.status === "SCHEDULED" ? null : pick(DIAGNOSIS_NOTES),
        workSummary:
          plan.status === "COMPLETED"
            ? `${chosenServices.map((item) => item.name).join(" and ")} carried out and road tested.`
            : null,
        createdAt: new Date(createdAt.getTime() + DAY_MS),
      },
    });

    if (jobStatus === "ASSIGNED") {
      continue;
    }

    // Work log: one labour line plus the parts consumed, with stock decremented
    // the same way the API will do it in Phase 4.
    let jobTotalPesewas = 0;

    const labourHours = 1 + Math.floor(random() * 4);
    const labourRatePesewas = 8000;
    jobTotalPesewas += labourHours * labourRatePesewas;

    await prisma.workLogEntry.create({
      data: {
        jobId: job.id,
        lineType: "LABOUR" satisfies LineType,
        description: `${chosenServices[0].name}, workshop labour`,
        quantity: labourHours,
        unitCost: money(labourRatePesewas),
        createdAt: new Date(createdAt.getTime() + 2 * DAY_MS),
      },
    });

    const partCount = 1 + Math.floor(random() * 3);
    const usedPartIds = new Set<string>();

    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      const part = pick(sectionInventory);
      if (usedPartIds.has(part.id)) {
        continue;
      }
      usedPartIds.add(part.id);

      const quantity = 1 + Math.floor(random() * 2);
      const unitCostPesewas = Math.round(Number(part.unitCost) * 100);
      jobTotalPesewas += quantity * unitCostPesewas;

      await prisma.workLogEntry.create({
        data: {
          jobId: job.id,
          inventoryItemId: part.id,
          lineType: "PART" satisfies LineType,
          description: part.name,
          quantity,
          unitCost: money(unitCostPesewas),
          createdAt: new Date(createdAt.getTime() + 2 * DAY_MS + partIndex * 60 * 60 * 1000),
        },
      });

      await prisma.inventoryItem.update({
        where: { id: part.id },
        data: { quantityInStock: { decrement: quantity } },
      });
    }

    if (plan.status !== "COMPLETED") {
      continue;
    }

    completedCount += 1;
    paymentCounter += 1;

    const method: PaymentMethod = pick(["MOMO", "PAYSTACK", "CASH"] as const);
    await prisma.payment.create({
      data: {
        serviceRequestId: serviceRequest.id,
        amount: money(jobTotalPesewas),
        currency: "GHS",
        method,
        status: "SUCCESS" satisfies PaymentStatus,
        reference: `CHR-PAY-${String(paymentCounter).padStart(5, "0")}`,
        createdAt: new Date(createdAt.getTime() + 3 * DAY_MS),
      },
    });

    // Roughly half of finished jobs come back with a rating.
    if (random() > 0.45) {
      await prisma.feedback.create({
        data: {
          serviceRequestId: serviceRequest.id,
          rating: random() > 0.25 ? 5 : 4,
          comment: pick([
            "Clear estimate before any work started. No surprises at the end.",
            "Car was ready when they said it would be.",
            "Good work, though the wait for the part took an extra day.",
            "The status updates meant I did not have to call and chase.",
          ]),
          createdAt: new Date(createdAt.getTime() + 4 * DAY_MS),
        },
      });
    }
  }

  console.error("Creating notifications");
  const lowStock = await prisma.inventoryItem.findMany();
  const lowStockItems = lowStock.filter((item) => item.quantityInStock <= item.reorderLevel);

  for (const manager of management) {
    await prisma.notification.create({
      data: {
        userId: manager.id,
        title: "Low stock needs attention",
        body: `${lowStockItems.length} items are at or below their reorder level. Open the inventory report to restock.`,
        createdAt: daysAgo(1, 7, 45),
      },
    });
  }

  for (const client of clients) {
    await prisma.notification.create({
      data: {
        userId: client.id,
        title: "Welcome to Chrysmec Auto Center",
        body: "Book a service and follow its progress from your dashboard.",
        readAt: daysAgo(30, 12),
        createdAt: daysAgo(30, 11, 30),
      },
    });
  }

  console.error(
    [
      "Seed complete:",
      `  users: ${users.length}`,
      `  vehicles: ${vehicles.length}`,
      `  catalogue items: ${catalogue.length}`,
      `  inventory items: ${inventory.length} (${lowStockItems.length} at or below reorder level)`,
      `  service requests: ${REQUEST_PLAN.length} (${completedCount} completed)`,
      `  demo password for every account: ${DEMO_PASSWORD}`,
    ].join("\n"),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
