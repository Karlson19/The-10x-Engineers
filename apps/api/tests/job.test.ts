import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  analyticsSummaryResponseSchema,
  authResponseSchema,
  jobResponseSchema,
  workLogResponseSchema,
} from "@chrysmec/shared";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createTestUser, createTestVehicle, deleteTestUsers } from "./helpers";
import type { SeededUser } from "./helpers";

const TEST_SKU_MARKER = "ZZTEST";

let client: SeededUser;
let mechanic: SeededUser;
let electrician: SeededUser;
let management: SeededUser;

let vehicleId: string;
let clientToken: string;
let mechanicToken: string;
let electricianToken: string;
let managementToken: string;

/** A mechanical part with a known starting quantity, created per test run. */
let partId: string;
const STARTING_STOCK = 10;

async function signIn(user: SeededUser): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: user.email, password: user.password });

  expect(response.status).toBe(200);
  return authResponseSchema.parse(response.body).accessToken;
}

async function createBooking(): Promise<string> {
  const response = await request(app)
    .post("/api/v1/service-requests")
    .set("Authorization", `Bearer ${clientToken}`)
    .send({
      clientRequestId: randomUUID(),
      vehicleId,
      section: "MECHANICAL",
      symptomCategory: "brakes",
      symptomDetails: { brakeSign: "grinding", whenItHappens: "braking", severity: "soon" },
      serviceCatalogItemIds: [],
      preferredDateTime: new Date(Date.now() + 86_400_000).toISOString(),
      locationText: "Chrysmec workshop, Kumasi",
    });

  expect(response.status).toBe(201);
  return response.body.serviceRequest.id as string;
}

async function assignJob(serviceRequestId: string, staffId: string): Promise<string> {
  const response = await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${managementToken}`)
    .send({ serviceRequestId, assignedStaffId: staffId });

  expect(response.status).toBe(201);
  return jobResponseSchema.parse(response.body).job.id;
}

async function stockOf(id: string): Promise<number> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
  return item.quantityInStock;
}

beforeAll(async () => {
  await deleteTestUsers();
  await prisma.inventoryItem.deleteMany({ where: { sku: { contains: TEST_SKU_MARKER } } });

  client = await createTestUser({ label: "job-client", role: "CLIENT" });
  mechanic = await createTestUser({ label: "job-mech", role: "STAFF", section: "MECHANICAL" });
  electrician = await createTestUser({ label: "job-elec", role: "STAFF", section: "ELECTRICAL" });
  management = await createTestUser({ label: "job-mgmt", role: "MANAGEMENT" });

  vehicleId = (await createTestVehicle(client.id)).id;

  [clientToken, mechanicToken, electricianToken, managementToken] = await Promise.all([
    signIn(client),
    signIn(mechanic),
    signIn(electrician),
    signIn(management),
  ]);

  const part = await prisma.inventoryItem.create({
    data: {
      name: "Test brake pad set",
      sku: `${TEST_SKU_MARKER}-${Date.now()}`,
      section: "MECHANICAL",
      quantityInStock: STARTING_STOCK,
      unitCost: "180.00",
      reorderLevel: 2,
    },
  });
  partId = part.id;
});

afterAll(async () => {
  // Users first: that clears the service requests, which cascades to the jobs
  // and their work log lines. The parts can only go once nothing references
  // them.
  await deleteTestUsers();
  await prisma.inventoryItem.deleteMany({ where: { sku: { contains: TEST_SKU_MARKER } } });
  await prisma.$disconnect();
});

describe("assigning a job", () => {
  it("assigns a booking to a technician and schedules it in one step", async () => {
    const serviceRequestId = await createBooking();

    const response = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ serviceRequestId, assignedStaffId: mechanic.id });

    expect(response.status).toBe(201);
    const { job } = jobResponseSchema.parse(response.body);
    expect(job.status).toBe("ASSIGNED");
    expect(job.assignedStaff.id).toBe(mechanic.id);
    expect(job.requestStatus).toBe("SCHEDULED");
    expect(job.reference).toMatch(/^CH-[0-9A-F]{6}$/);

    // The move to scheduled is on the customer's timeline too.
    const timeline = await request(app)
      .get(`/api/v1/service-requests/${serviceRequestId}/timeline`)
      .set("Authorization", `Bearer ${clientToken}`);
    expect(
      (timeline.body.data as Array<{ toStatus: string }>).map((event) => event.toStatus),
    ).toEqual(["SUBMITTED", "SCHEDULED"]);
  });

  it("refuses a technician from the other section", async () => {
    const serviceRequestId = await createBooking();

    const response = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ serviceRequestId, assignedStaffId: electrician.id });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("assignedStaffId");
  });

  it("refuses a second job on the same booking", async () => {
    const serviceRequestId = await createBooking();
    await assignJob(serviceRequestId, mechanic.id);

    const response = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ serviceRequestId, assignedStaffId: mechanic.id });

    expect(response.status).toBe(409);
  });

  it("refuses a technician assigning work to themselves", async () => {
    const serviceRequestId = await createBooking();

    const response = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ serviceRequestId, assignedStaffId: mechanic.id });

    expect(response.status).toBe(403);
  });

  it("keeps a job out of another technician's queue", async () => {
    const serviceRequestId = await createBooking();
    const jobId = await assignJob(serviceRequestId, mechanic.id);

    const hidden = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${electricianToken}`);
    expect(hidden.status).toBe(404);

    const visible = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${mechanicToken}`);
    expect(visible.status).toBe(200);
  });

  it("refuses a customer any access to the job queue", async () => {
    const response = await request(app)
      .get("/api/v1/jobs")
      .set("Authorization", `Bearer ${clientToken}`);

    expect(response.status).toBe(403);
  });
});

/** Test 8 in the build spec. */
describe("work log lines and stock", () => {
  it("decrements inventory when a part line is added", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);
    const before = await stockOf(partId);

    const response = await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "PART", inventoryItemId: partId, quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body.entry.lineType).toBe("PART");
    expect(response.body.entry.quantity).toBe(2);
    // Priced at what the part costs the workshop, not at whatever was sent.
    expect(response.body.entry.unitCost).toBe("180.00");
    expect(response.body.entry.lineTotal).toBe("360.00");

    expect(await stockOf(partId)).toBe(before - 2);
  });

  it("rejects a line for more than is in stock and leaves the count alone", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);
    const before = await stockOf(partId);

    const response = await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "PART", inventoryItemId: partId, quantity: before + 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(response.body.error.details.available).toBe(before);

    // Nothing was taken, and no orphan line was written.
    expect(await stockOf(partId)).toBe(before);
    const log = await request(app)
      .get(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`);
    expect(log.body.data).toHaveLength(0);
  });

  it("does not let two lines take the same last item", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);

    const item = await prisma.inventoryItem.create({
      data: {
        name: "Test last item",
        sku: `${TEST_SKU_MARKER}-LAST-${Date.now()}`,
        section: "MECHANICAL",
        quantityInStock: 1,
        unitCost: "50.00",
        reorderLevel: 0,
      },
    });

    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/v1/jobs/${jobId}/worklog`)
        .set("Authorization", `Bearer ${mechanicToken}`)
        .send({ lineType: "PART", inventoryItemId: item.id, quantity: 1 }),
      request(app)
        .post(`/api/v1/jobs/${jobId}/worklog`)
        .set("Authorization", `Bearer ${mechanicToken}`)
        .send({ lineType: "PART", inventoryItemId: item.id, quantity: 1 }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(await stockOf(item.id)).toBe(0);
  });

  it("puts the stock back when a part line is removed", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);
    const before = await stockOf(partId);

    const added = await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "PART", inventoryItemId: partId, quantity: 3 });
    expect(added.status).toBe(201);
    expect(await stockOf(partId)).toBe(before - 3);

    const removed = await request(app)
      .delete(`/api/v1/jobs/${jobId}/worklog/${added.body.entry.id}`)
      .set("Authorization", `Bearer ${mechanicToken}`);

    expect(removed.status).toBe(200);
    expect(await stockOf(partId)).toBe(before);
  });

  it("adds labour lines without touching stock and totals the job", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);
    const before = await stockOf(partId);

    await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "LABOUR", description: "Brake strip and rebuild", quantity: 3, unitCost: "80.00" });

    await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "PART", inventoryItemId: partId, quantity: 1 });

    expect(await stockOf(partId)).toBe(before - 1);

    const log = await request(app)
      .get(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`);

    expect(log.status).toBe(200);
    const parsed = workLogResponseSchema.parse(log.body);
    expect(parsed.data).toHaveLength(2);
    // 3 hours at 80.00 plus one part at 180.00.
    expect(parsed.total).toBe("420.00");
  });

  it("refuses a part from the other section", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);

    const electricalPart = await prisma.inventoryItem.create({
      data: {
        name: "Test coil",
        sku: `${TEST_SKU_MARKER}-ELEC-${Date.now()}`,
        section: "ELECTRICAL",
        quantityInStock: 5,
        unitCost: "295.00",
        reorderLevel: 1,
      },
    });

    const response = await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "PART", inventoryItemId: electricalPart.id, quantity: 1 });

    expect(response.status).toBe(400);
    expect(await stockOf(electricalPart.id)).toBe(5);
  });

  it("refuses a labour line with no rate", async () => {
    const jobId = await assignJob(await createBooking(), mechanic.id);

    const response = await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "LABOUR", description: "Diagnosis", quantity: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("unitCost");
  });
});

describe("the estimate and approval loop", () => {
  it("lets staff send an estimate and the customer approve it", async () => {
    const serviceRequestId = await createBooking();
    await assignJob(serviceRequestId, mechanic.id);

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ status: "IN_PROGRESS" });

    const estimate = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ status: "AWAITING_APPROVAL", estimatedCost: "1250.00" });

    expect(estimate.status).toBe(200);
    expect(estimate.body.serviceRequest.estimatedCost).toBe("1250.00");

    const approved = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ status: "IN_PROGRESS" });

    expect(approved.status).toBe(200);
    expect(approved.body.serviceRequest.status).toBe("IN_PROGRESS");
  });

  it("lets the customer decline an estimate, which cancels the booking", async () => {
    const serviceRequestId = await createBooking();
    await assignJob(serviceRequestId, mechanic.id);

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ status: "IN_PROGRESS" });
    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ status: "AWAITING_APPROVAL", estimatedCost: "640.00" });

    const declined = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ status: "CANCELLED" });

    expect(declined.status).toBe(200);
    expect(declined.body.serviceRequest.status).toBe("CANCELLED");

    // The decision has to be on the timeline, because it is the record of who
    // stopped the work and when.
    const timeline = await request(app)
      .get(`/api/v1/service-requests/${serviceRequestId}/timeline`)
      .set("Authorization", `Bearer ${clientToken}`);

    expect(timeline.body.data.at(-1)).toMatchObject({
      fromStatus: "AWAITING_APPROVAL",
      toStatus: "CANCELLED",
    });
  });

  it("refuses a customer any other status move", async () => {
    const serviceRequestId = await createBooking();

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ status: "SCHEDULED" });

    expect(response.status).toBe(403);
  });

  it("refuses a customer setting their own estimate", async () => {
    const serviceRequestId = await createBooking();
    await assignJob(serviceRequestId, mechanic.id);

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ status: "IN_PROGRESS" });
    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ status: "AWAITING_APPROVAL", estimatedCost: "900.00" });

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequestId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ status: "IN_PROGRESS", estimatedCost: "1.00" });

    expect(response.status).toBe(403);
  });
});

describe("a technician who still has work", () => {
  it("cannot be stood down until their jobs are reassigned", async () => {
    const leaver = await createTestUser({
      label: "leaver",
      role: "STAFF",
      section: "MECHANICAL",
    });
    const jobId = await assignJob(await createBooking(), leaver.id);

    const blocked = await request(app)
      .delete(`/api/v1/users/${leaver.id}`)
      .set("Authorization", `Bearer ${managementToken}`);

    expect(blocked.status).toBe(409);
    expect(blocked.body.error.details.openJobs).toBe(1);

    // Moved to somebody else, and now they can go.
    await request(app)
      .patch(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ assignedStaffId: mechanic.id });

    const allowed = await request(app)
      .delete(`/api/v1/users/${leaver.id}`)
      .set("Authorization", `Bearer ${managementToken}`);

    expect(allowed.status).toBe(200);
    expect(allowed.body.user.isActive).toBe(false);
  });

  it("cannot be moved to the other section while holding jobs in this one", async () => {
    const mover = await createTestUser({
      label: "mover",
      role: "STAFF",
      section: "MECHANICAL",
    });
    await assignJob(await createBooking(), mover.id);

    const blocked = await request(app)
      .patch(`/api/v1/users/${mover.id}`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ section: "ELECTRICAL" });

    /*
      Without this the section rule could be walked around entirely: a booking
      may only go to a technician from its own section, but moving the person
      afterwards took their mechanical work into electrical with them.
    */
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.details.openJobs).toBe(1);
  });
});

describe("the stock ledger", () => {
  /** A part of its own per test, so counts cannot be disturbed by neighbours. */
  async function createPart(unitCost: string, quantity: number) {
    const created = await request(app)
      .post("/api/v1/inventory")
      .set("Authorization", `Bearer ${managementToken}`)
      .send({
        name: `Ledger test part ${randomUUID().slice(0, 8)}`,
        // Carries the marker so afterAll clears it with everything else.
        sku: `${TEST_SKU_MARKER}-${randomUUID().slice(0, 8).toUpperCase()}`,
        section: "MECHANICAL",
        quantityInStock: quantity,
        unitCost,
        reorderLevel: 1,
      });

    expect(created.status).toBe(201);
    return created.body.item.id as string;
  }

  it("records what was paid, so a part has a price history", async () => {
    const id = await createPart("100.00", 10);

    const received = await request(app)
      .post(`/api/v1/inventory/${id}/receive`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ quantity: 10, unitCost: "200.00", supplier: "Adum Auto Spares", reference: "INV-1" });

    expect(received.status).toBe(200);

    const history = await request(app)
      .get(`/api/v1/inventory/${id}/history`)
      .set("Authorization", `Bearer ${managementToken}`);

    expect(history.status).toBe(200);
    expect(history.body.summary.lastPaid).toBe("200.00");
    expect(history.body.summary.onHand).toBe(20);

    // Ten at 100 and ten at 200 is 150 on average, which is the figure a job
    // should be costed at rather than either price on its own.
    expect(history.body.summary.averageUnitCost).toBe("150.00");
    expect(history.body.summary.totalPurchased).toBe("3000.00");

    const receipts = (history.body.movements as Array<{ type: string; supplier: string | null }>)
      .filter((movement) => movement.type === "RECEIPT");
    expect(receipts).toHaveLength(2);
    expect(receipts[0].supplier).toBe("Adum Auto Spares");
  });

  it("writes a movement when a part goes out on a job, and when it comes back", async () => {
    const id = await createPart("50.00", 5);
    const serviceRequestId = await createBooking();
    const jobId = await assignJob(serviceRequestId, mechanic.id);

    const added = await request(app)
      .post(`/api/v1/jobs/${jobId}/worklog`)
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({ lineType: "PART", inventoryItemId: id, quantity: 2 });

    expect(added.status).toBe(201);

    const afterUse = await request(app)
      .get(`/api/v1/inventory/${id}/history`)
      .set("Authorization", `Bearer ${managementToken}`);

    expect(afterUse.body.summary.onHand).toBe(3);
    const consumption = afterUse.body.movements[0];
    expect(consumption.type).toBe("CONSUMPTION");
    expect(consumption.quantity).toBe(-2);
    expect(consumption.balanceAfter).toBe(3);

    await request(app)
      .delete(`/api/v1/jobs/${jobId}/worklog/${added.body.entry.id}`)
      .set("Authorization", `Bearer ${mechanicToken}`);

    const afterReturn = await request(app)
      .get(`/api/v1/inventory/${id}/history`)
      .set("Authorization", `Bearer ${managementToken}`);

    expect(afterReturn.body.summary.onHand).toBe(5);

    // The part going out stays on the record next to it coming back, rather
    // than the history pretending it never left.
    const types = (afterReturn.body.movements as Array<{ type: string }>).map((m) => m.type);
    expect(types).toContain("CONSUMPTION");
    expect(types).toContain("RETURN");
  });

  it("makes a stock take correction explain itself", async () => {
    const id = await createPart("40.00", 12);

    const noReason = await request(app)
      .post(`/api/v1/inventory/${id}/adjust`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ countedQuantity: 9 });

    expect(noReason.status).toBe(400);

    const counted = await request(app)
      .post(`/api/v1/inventory/${id}/adjust`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ countedQuantity: 9, reason: "Two damaged, one unaccounted for" });

    expect(counted.status).toBe(200);
    expect(counted.body.item.quantityInStock).toBe(9);

    const history = await request(app)
      .get(`/api/v1/inventory/${id}/history`)
      .set("Authorization", `Bearer ${managementToken}`);

    const adjustment = history.body.movements[0];
    expect(adjustment.type).toBe("ADJUSTMENT");
    expect(adjustment.quantity).toBe(-3);
    expect(adjustment.note).toBe("Two damaged, one unaccounted for");
  });

  it("refuses to let the count be typed over", async () => {
    const id = await createPart("60.00", 4);

    await request(app)
      .patch(`/api/v1/inventory/${id}`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ quantityInStock: 999, unitCost: "1.00" });

    const history = await request(app)
      .get(`/api/v1/inventory/${id}/history`)
      .set("Authorization", `Bearer ${managementToken}`);

    // The edit route simply has nowhere to put these, so the shelf and its
    // ledger cannot be pushed out of step by hand.
    expect(history.body.summary.onHand).toBe(4);
    expect(history.body.summary.averageUnitCost).toBe("60.00");
  });
});

describe("inventory", () => {
  it("shows a technician only their own section, read only", async () => {
    const listed = await request(app)
      .get("/api/v1/inventory?limit=100")
      .set("Authorization", `Bearer ${mechanicToken}`);

    expect(listed.status).toBe(200);
    const items = listed.body.data as Array<{ section: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.section === "MECHANICAL")).toBe(true);

    const blocked = await request(app)
      .post("/api/v1/inventory")
      .set("Authorization", `Bearer ${mechanicToken}`)
      .send({
        name: "Sneaky part",
        sku: `${TEST_SKU_MARKER}-NOPE`,
        section: "MECHANICAL",
        quantityInStock: 1,
        unitCost: "1.00",
        reorderLevel: 1,
      });
    expect(blocked.status).toBe(403);
  });

  it("filters to low stock and restocks", async () => {
    const item = await prisma.inventoryItem.create({
      data: {
        name: "Test low item",
        sku: `${TEST_SKU_MARKER}-LOW-${Date.now()}`,
        section: "MECHANICAL",
        quantityInStock: 1,
        unitCost: "20.00",
        reorderLevel: 5,
      },
    });

    const low = await request(app)
      .get("/api/v1/inventory?lowStock=true&limit=100")
      .set("Authorization", `Bearer ${managementToken}`);

    expect(low.status).toBe(200);
    const ids = (low.body.data as Array<{ id: string; isLowStock: boolean }>).map((row) => row.id);
    expect(ids).toContain(item.id);
    expect((low.body.data as Array<{ isLowStock: boolean }>).every((row) => row.isLowStock)).toBe(
      true,
    );

    const restocked = await request(app)
      .post(`/api/v1/inventory/${item.id}/restock`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ quantity: 20 });

    expect(restocked.status).toBe(200);
    expect(restocked.body.item.quantityInStock).toBe(21);
    expect(restocked.body.item.isLowStock).toBe(false);
  });
});

describe("analytics", () => {
  it("refuses anyone who is not management", async () => {
    for (const token of [clientToken, mechanicToken]) {
      const response = await request(app)
        .get("/api/v1/analytics/summary")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    }
  });

  it("returns a summary that matches the shared schema", async () => {
    const response = await request(app)
      .get("/api/v1/analytics/summary")
      .set("Authorization", `Bearer ${managementToken}`);

    expect(response.status).toBe(200);
    const { summary } = analyticsSummaryResponseSchema.parse(response.body);

    expect(summary.period).toMatch(/^\d{4}-\d{2}$/);
    // Six months of points, so the chart has an even x axis.
    expect(summary.revenueByMonth).toHaveLength(6);
    // Every status is present, so the breakdown does not reshape as data lands.
    expect(summary.statusBreakdown).toHaveLength(6);
    expect(summary.conversionRate).toBeGreaterThanOrEqual(0);
    expect(summary.conversionRate).toBeLessThanOrEqual(1);
    expect(Number.parseFloat(summary.net)).toBeCloseTo(
      Number.parseFloat(summary.revenue) - Number.parseFloat(summary.expenses),
      2,
    );
  });

  it("rejects a malformed period", async () => {
    const response = await request(app)
      .get("/api/v1/analytics/summary?period=july")
      .set("Authorization", `Bearer ${managementToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
