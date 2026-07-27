import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  authResponseSchema,
  serviceRequestResponseSchema,
  timelineResponseSchema,
} from "@chrysmec/shared";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createTestUser, createTestVehicle, deleteTestUsers } from "./helpers";
import type { SeededUser } from "./helpers";

let owner: SeededUser;
let otherClient: SeededUser;
let mechanicalStaff: SeededUser;
let electricalStaff: SeededUser;
let management: SeededUser;

let ownerVehicleId: string;
let otherVehicleId: string;

let ownerToken: string;
let otherToken: string;
let mechanicalToken: string;
let electricalToken: string;
let managementToken: string;

async function signIn(user: SeededUser): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: user.email, password: user.password });

  expect(response.status).toBe(200);
  return authResponseSchema.parse(response.body).accessToken;
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** A valid mechanical booking for the brakes category. */
function bookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    clientRequestId: randomUUID(),
    vehicleId: ownerVehicleId,
    section: "MECHANICAL",
    symptomCategory: "brakes",
    symptomDetails: {
      brakeSign: "grinding",
      brakePosition: "front",
      whenItHappens: "braking",
      severity: "soon",
      warningLights: ["none"],
      notes: "Started about a week ago.",
    },
    serviceCatalogItemIds: [],
    preferredDateTime: inDays(2),
    locationText: "Chrysmec workshop, Kumasi",
    ...overrides,
  };
}

async function createBooking(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ status: number; body: unknown }> {
  const response = await request(app)
    .post("/api/v1/service-requests")
    .set("Authorization", `Bearer ${token}`)
    .send(bookingPayload(overrides));

  return { status: response.status, body: response.body };
}

beforeAll(async () => {
  await deleteTestUsers();

  owner = await createTestUser({ label: "sr-owner", role: "CLIENT" });
  otherClient = await createTestUser({ label: "sr-other", role: "CLIENT" });
  mechanicalStaff = await createTestUser({
    label: "sr-mech",
    role: "STAFF",
    section: "MECHANICAL",
  });
  electricalStaff = await createTestUser({
    label: "sr-elec",
    role: "STAFF",
    section: "ELECTRICAL",
  });
  management = await createTestUser({ label: "sr-mgmt", role: "MANAGEMENT" });

  ownerVehicleId = (await createTestVehicle(owner.id)).id;
  otherVehicleId = (await createTestVehicle(otherClient.id)).id;

  [ownerToken, otherToken, mechanicalToken, electricalToken, managementToken] = await Promise.all([
    signIn(owner),
    signIn(otherClient),
    signIn(mechanicalStaff),
    signIn(electricalStaff),
    signIn(management),
  ]);
});

afterAll(async () => {
  await deleteTestUsers();
  await prisma.$disconnect();
});

/** Test 4 in the build spec: the ownership check. */
describe("a client cannot read another client's service request", () => {
  it("answers 404 rather than confirming the record exists", async () => {
    const created = await createBooking(ownerToken);
    expect(created.status).toBe(201);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    const response = await request(app)
      .get(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("keeps another client's request out of the list", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    const response = await request(app)
      .get("/api/v1/service-requests?limit=100")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(200);
    const ids = (response.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).not.toContain(serviceRequest.id);
  });

  it("refuses a booking made against someone else's vehicle", async () => {
    const response = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(bookingPayload({ vehicleId: otherVehicleId }));

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("vehicleId");
  });

  it("refuses a client reading another client's vehicle", async () => {
    const response = await request(app)
      .get(`/api/v1/vehicles/${otherVehicleId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(404);
  });
});

/** Test 5 in the build spec: full CRUD on a service request. */
describe("full CRUD on a service request", () => {
  it("creates, reads, lists, updates, changes status and deletes", async () => {
    // Create
    const created = await createBooking(ownerToken);
    expect(created.status).toBe(201);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);
    expect(serviceRequest.status).toBe("SUBMITTED");
    expect(serviceRequest.reference).toMatch(/^CH-[0-9A-F]{6}$/);
    expect(serviceRequest.vehicle.id).toBe(ownerVehicleId);

    // Read
    const read = await request(app)
      .get(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(read.status).toBe(200);
    expect(serviceRequestResponseSchema.parse(read.body).serviceRequest.id).toBe(serviceRequest.id);

    // List
    const listed = await request(app)
      .get("/api/v1/service-requests?limit=100")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listed.status).toBe(200);
    expect((listed.body.data as Array<{ id: string }>).map((item) => item.id)).toContain(
      serviceRequest.id,
    );

    // Update, allowed because it is still SUBMITTED
    const updated = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ locationText: "Customer address, Kumasi" });
    expect(updated.status).toBe(200);
    expect(updated.body.serviceRequest.locationText).toBe("Customer address, Kumasi");

    // Status change by staff in the matching section
    const scheduled = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${mechanicalToken}`)
      .send({ status: "SCHEDULED", note: "Booked in for Tuesday morning." });
    expect(scheduled.status).toBe(200);
    expect(scheduled.body.serviceRequest.status).toBe("SCHEDULED");

    // Delete, by management since the booking has moved on
    const deleted = await request(app)
      .delete(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${managementToken}`);
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app)
      .get(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${managementToken}`);
    expect(afterDelete.status).toBe(404);
  });

  it("stops the owner editing once the booking has been scheduled", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ status: "SCHEDULED" });

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ locationText: "Somewhere else entirely" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("refuses a client changing the status themselves", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "COMPLETED" });

    expect(response.status).toBe(403);
  });
});

/** Test 6 in the build spec. */
describe("status transitions are enforced on the server", () => {
  it("rejects a jump from submitted straight to completed with 400", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ status: "COMPLETED" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_TRANSITION");
    expect(response.body.error.details.allowed).toEqual(["SCHEDULED", "CANCELLED"]);
  });

  it("refuses to move a cancelled booking anywhere", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ status: "CANCELLED" });

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ status: "SCHEDULED" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("writes a timeline entry for every accepted change", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ status: "SCHEDULED", note: "Slot confirmed." });

    await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${managementToken}`)
      .send({ status: "IN_PROGRESS" });

    const response = await request(app)
      .get(`/api/v1/service-requests/${serviceRequest.id}/timeline`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    const { data } = timelineResponseSchema.parse(response.body);
    expect(data.map((event) => event.toStatus)).toEqual([
      "SUBMITTED",
      "SCHEDULED",
      "IN_PROGRESS",
    ]);
    expect(data[1]?.fromStatus).toBe("SUBMITTED");
    expect(data[1]?.note).toBe("Slot confirmed.");
  });
});

/** Test 7 in the build spec: the offline outbox idempotency key. */
describe("the same clientRequestId creates exactly one record", () => {
  it("returns the original booking on a replay and does not duplicate it", async () => {
    const clientRequestId = randomUUID();

    const first = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(bookingPayload({ clientRequestId }));

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(bookingPayload({ clientRequestId, locationText: "A different location entirely" }));

    // A replay answers 200 with the original record rather than creating again.
    expect(second.status).toBe(200);
    expect(second.body.serviceRequest.id).toBe(first.body.serviceRequest.id);
    expect(second.body.serviceRequest.locationText).toBe(
      first.body.serviceRequest.locationText,
    );

    const count = await prisma.serviceRequest.count({ where: { clientRequestId } });
    expect(count).toBe(1);
  });

  it("holds when both copies arrive at the same time", async () => {
    const clientRequestId = randomUUID();

    const responses = await Promise.all([
      request(app)
        .post("/api/v1/service-requests")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(bookingPayload({ clientRequestId })),
      request(app)
        .post("/api/v1/service-requests")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(bookingPayload({ clientRequestId })),
    ]);

    for (const response of responses) {
      expect([200, 201]).toContain(response.status);
    }

    const count = await prisma.serviceRequest.count({ where: { clientRequestId } });
    expect(count).toBe(1);
  });
});

describe("the guided symptom intake is validated on the server", () => {
  it("rejects a category that belongs to the other section", async () => {
    const response = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(bookingPayload({ section: "ELECTRICAL" }));

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("symptomCategory");
  });

  it("rejects a missing required answer", async () => {
    const response = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(
        bookingPayload({
          symptomDetails: { brakeSign: "grinding", whenItHappens: "braking" },
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("symptomDetails.severity");
  });

  it("rejects an answer that is not one of the options offered", async () => {
    const response = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(
        bookingPayload({
          symptomDetails: {
            brakeSign: "made-up-answer",
            whenItHappens: "braking",
            severity: "soon",
          },
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("symptomDetails.brakeSign");
  });
});

describe("technicians only see their own section", () => {
  it("hides a mechanical booking from an electrical technician", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    const hidden = await request(app)
      .get(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${electricalToken}`);
    expect(hidden.status).toBe(404);

    const visible = await request(app)
      .get(`/api/v1/service-requests/${serviceRequest.id}`)
      .set("Authorization", `Bearer ${mechanicalToken}`);
    expect(visible.status).toBe(200);
  });

  it("refuses an electrical technician moving a mechanical booking", async () => {
    const created = await createBooking(ownerToken);
    const { serviceRequest } = serviceRequestResponseSchema.parse(created.body);

    const response = await request(app)
      .patch(`/api/v1/service-requests/${serviceRequest.id}/status`)
      .set("Authorization", `Bearer ${electricalToken}`)
      .send({ status: "SCHEDULED" });

    expect(response.status).toBe(404);
  });
});

describe("vehicle CRUD", () => {
  it("creates, updates and refuses to remove a vehicle with history", async () => {
    const created = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ make: "Kia", model: "Sportage", year: 2021, registrationNo: "as 9911-22" });

    expect(created.status).toBe(201);
    // The schema normalises the plate on the way in.
    expect(created.body.vehicle.registrationNo).toBe("AS 9911-22");

    const vehicleId = created.body.vehicle.id;

    const updated = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ notes: "Takes 5W-30." });
    expect(updated.status).toBe(200);
    expect(updated.body.vehicle.notes).toBe("Takes 5W-30.");

    // Nothing booked against it yet, so it can go.
    const removed = await request(app)
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(removed.status).toBe(204);

    // The vehicle that does have history cannot be removed.
    await createBooking(ownerToken);
    const refused = await request(app)
      .delete(`/api/v1/vehicles/${ownerVehicleId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(refused.status).toBe(409);
  });

  it("refuses a duplicate registration number on the same account", async () => {
    const plate = `GR ${Math.floor(1000 + Math.random() * 8999)}-20`;

    const first = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ make: "Honda", model: "Civic", year: 2015, registrationNo: plate });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ make: "Honda", model: "Civic", year: 2015, registrationNo: plate });
    expect(second.status).toBe(409);
  });
});

describe("the service catalogue", () => {
  it("lists active items for the chosen section", async () => {
    const response = await request(app)
      .get("/api/v1/services?section=MECHANICAL")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    const items = response.body.data as Array<{ section: string; isActive: boolean; basePrice: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.section === "MECHANICAL")).toBe(true);
    expect(items.every((item) => item.isActive)).toBe(true);
    // Money is a fixed two decimal string, never a float.
    expect(items.every((item) => /^\d+\.\d{2}$/.test(item.basePrice))).toBe(true);
  });
});
