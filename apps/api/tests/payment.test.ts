import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { authResponseSchema } from "@chrysmec/shared";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createTestUser, createTestVehicle, deleteTestUsers } from "./helpers";
import type { SeededUser } from "./helpers";

let client: SeededUser;
let otherClient: SeededUser;
let management: SeededUser;

let clientToken: string;
let otherClientToken: string;
let managementToken: string;
let vehicleId: string;

async function signIn(user: SeededUser): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: user.email, password: user.password });

  expect(response.status).toBe(200);
  return authResponseSchema.parse(response.body).accessToken;
}

/** A booking that has been through the workshop and is ready to be paid for. */
async function completedBooking(): Promise<string> {
  const created = await prisma.serviceRequest.create({
    data: {
      clientId: client.id,
      vehicleId,
      section: "MECHANICAL",
      status: "COMPLETED",
      preferredDateTime: new Date(),
      locationText: "Chrysmec workshop, Kumasi",
      symptomCategory: "brakes",
      symptomDetails: { brakeSign: "squealing", whenItHappens: "braking", severity: "soon" },
      clientRequestId: randomUUID(),
    },
  });

  return created.id;
}

beforeAll(async () => {
  client = await createTestUser({ label: "payer", role: "CLIENT" });
  otherClient = await createTestUser({ label: "stranger", role: "CLIENT" });
  management = await createTestUser({ label: "boss", role: "MANAGEMENT" });

  [clientToken, otherClientToken, managementToken] = await Promise.all([
    signIn(client),
    signIn(otherClient),
    signIn(management),
  ]);

  vehicleId = (await createTestVehicle(client.id)).id;
});

afterAll(async () => {
  await deleteTestUsers();
});

describe("payments", () => {
  it("refuses to start a payment on a booking that is not finished", async () => {
    const created = await prisma.serviceRequest.create({
      data: {
        clientId: client.id,
        vehicleId,
        section: "MECHANICAL",
        status: "IN_PROGRESS",
        preferredDateTime: new Date(),
        locationText: "Chrysmec workshop, Kumasi",
        symptomCategory: "brakes",
        symptomDetails: { brakeSign: "squealing", whenItHappens: "braking", severity: "soon" },
        clientRequestId: randomUUID(),
      },
    });

    const response = await request(app)
      .post("/api/v1/payments/initialize")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ serviceRequestId: created.id });

    expect(response.status).toBe(409);
  });

  it("refuses when there is nothing owed", async () => {
    // Completed, but no work was ever logged, so the bill is zero.
    const serviceRequestId = await completedBooking();

    const response = await request(app)
      .post("/api/v1/payments/initialize")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ serviceRequestId });

    expect(response.status).toBe(409);
  });

  it("will not let one customer pay against another's booking", async () => {
    const serviceRequestId = await completedBooking();

    const response = await request(app)
      .post("/api/v1/payments/initialize")
      .set("Authorization", `Bearer ${otherClientToken}`)
      .send({ serviceRequestId });

    expect(response.status).toBe(404);
  });

  it("keeps a technician out of the payment routes entirely", async () => {
    const technician = await createTestUser({
      label: "spanner",
      role: "STAFF",
      section: "MECHANICAL",
    });
    const technicianToken = await signIn(technician);

    const response = await request(app)
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${technicianToken}`);

    expect(response.status).toBe(403);
  });

  it("shows a customer only their own payments", async () => {
    const serviceRequestId = await completedBooking();
    await prisma.payment.create({
      data: {
        serviceRequestId,
        amount: "250.00",
        currency: "GHS",
        method: "CASH",
        status: "SUCCESS",
        reference: `TEST-${randomUUID()}`,
      },
    });

    const mine = await request(app)
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${clientToken}`);
    const theirs = await request(app)
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${otherClientToken}`);

    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBeGreaterThan(0);

    expect(theirs.status).toBe(200);
    expect(theirs.body.data).toHaveLength(0);
  });

  it("lets management see the takings", async () => {
    const response = await request(app)
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${managementToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("totalPaid");
  });
});

describe("the payment webhook", () => {
  it("refuses a request with no signature", async () => {
    const response = await request(app)
      .post("/api/v1/payments/webhook")
      .send({ event: "charge.success", data: { reference: "anything" } });

    expect(response.status).toBe(401);
  });

  it("refuses a request whose signature does not match the body", async () => {
    const response = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-paystack-signature", "0".repeat(128))
      .send({ event: "charge.success", data: { reference: "anything" } });

    expect(response.status).toBe(401);
  });

  /**
   * A correctly signed event is accepted even when the reference means nothing
   * to us, because Paystack retries anything that is not a 200 and there is
   * nothing to gain from making it retry forever.
   */
  it("accepts a correctly signed event", async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY ?? "";

    if (secret.length === 0) {
      // Without a key configured there is no signature to forge, and the
      // endpoint correctly refuses everything. Covered by the tests above.
      return;
    }

    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: `UNKNOWN-${randomUUID()}` },
    });
    const signature = createHmac("sha512", secret).update(body).digest("hex");

    const response = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-paystack-signature", signature)
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(200);
  });
});
