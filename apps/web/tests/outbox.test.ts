import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateServiceRequest } from "@chrysmec/shared";

// Mocked before the module under test is imported, so the outbox talks to this
// rather than to the network.
const createServiceRequest = vi.fn();

vi.mock("@/lib/api/service-requests", () => ({
  createServiceRequest: (input: CreateServiceRequest) => createServiceRequest(input),
}));

const { ApiError } = await import("@/lib/api/client");
const { ChrysmecDatabase, __setDatabaseForTests } = await import("@/lib/offline/db");
const { enqueueBooking, flushOutbox, listOutbox, pendingCount, clearSynced, MAX_ATTEMPTS } =
  await import("@/lib/offline/outbox");

let database: InstanceType<typeof ChrysmecDatabase>;

function booking(overrides: Partial<CreateServiceRequest> = {}): CreateServiceRequest {
  return {
    clientRequestId: crypto.randomUUID(),
    vehicleId: crypto.randomUUID(),
    section: "MECHANICAL",
    symptomCategory: "brakes",
    symptomDetails: { brakeSign: "grinding", whenItHappens: "braking", severity: "soon" },
    serviceCatalogItemIds: [],
    preferredDateTime: new Date(Date.now() + 86_400_000).toISOString(),
    locationText: "Chrysmec workshop, Kumasi",
    ...overrides,
  } as CreateServiceRequest;
}

function serverResponse(id = crypto.randomUUID()) {
  return { id };
}

beforeEach(async () => {
  createServiceRequest.mockReset();

  database = new ChrysmecDatabase();
  __setDatabaseForTests(database);
  await database.outbox.clear();

  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(async () => {
  await database.delete();
  __setDatabaseForTests(null);
  vi.restoreAllMocks();
});

describe("queueing a booking", () => {
  it("stores it as pending and keeps the idempotency key", async () => {
    const payload = booking();
    const entry = await enqueueBooking(payload);

    expect(entry.status).toBe("pending");
    expect(entry.clientRequestId).toBe(payload.clientRequestId);
    expect(await pendingCount()).toBe(1);
  });

  it("survives being read back, which is what a reopened tab does", async () => {
    const payload = booking();
    await enqueueBooking(payload);

    const stored = await listOutbox();
    expect(stored).toHaveLength(1);
    expect((stored[0]?.payload as CreateServiceRequest).locationText).toBe(payload.locationText);
  });
});

describe("flushing", () => {
  it("sends the queue and marks entries synced", async () => {
    createServiceRequest.mockResolvedValue(serverResponse());

    await enqueueBooking(booking());
    const result = await flushOutbox();

    expect(result.synced).toBe(1);
    expect(result.remaining).toBe(0);
    expect((await listOutbox())[0]?.status).toBe("synced");
  });

  it("sends in the order they were queued", async () => {
    createServiceRequest.mockImplementation(() => Promise.resolve(serverResponse()));

    const first = booking({ locationText: "First" });
    const second = booking({ locationText: "Second" });
    await enqueueBooking(first);
    await enqueueBooking(second);

    await flushOutbox();

    const sent = createServiceRequest.mock.calls.map(
      (call) => (call[0] as CreateServiceRequest).locationText,
    );
    expect(sent).toEqual(["First", "Second"]);
  });

  it("sends the same clientRequestId the booking was queued with", async () => {
    createServiceRequest.mockResolvedValue(serverResponse());

    const payload = booking();
    await enqueueBooking(payload);
    await flushOutbox();

    expect((createServiceRequest.mock.calls[0]?.[0] as CreateServiceRequest).clientRequestId).toBe(
      payload.clientRequestId,
    );
  });

  it("does nothing while offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await enqueueBooking(booking());

    const result = await flushOutbox();

    expect(createServiceRequest).not.toHaveBeenCalled();
    expect(result.synced).toBe(0);
    expect(result.remaining).toBe(1);
  });

  it("runs once even when two triggers fire together", async () => {
    // The online event and visibilitychange both fire when a phone wakes up.
    createServiceRequest.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(serverResponse()), 20)),
    );

    await enqueueBooking(booking());
    await Promise.all([flushOutbox(), flushOutbox(), flushOutbox()]);

    expect(createServiceRequest).toHaveBeenCalledTimes(1);
  });
});

describe("failures", () => {
  it("keeps a booking queued when the network drops mid flush", async () => {
    createServiceRequest.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Could not reach the workshop."),
    );

    await enqueueBooking(booking());
    const result = await flushOutbox();

    expect(result.synced).toBe(0);
    expect(result.remaining).toBe(1);
    expect((await listOutbox())[0]?.status).toBe("pending");
  });

  it("stops at the first network failure so order is preserved", async () => {
    createServiceRequest.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Could not reach the workshop."),
    );

    await enqueueBooking(booking());
    await enqueueBooking(booking());
    await flushOutbox();

    // The second is never attempted, otherwise it could arrive before the first.
    expect(createServiceRequest).toHaveBeenCalledTimes(1);
    expect(await pendingCount()).toBe(2);
  });

  it("parks a rejected booking rather than retrying it forever", async () => {
    createServiceRequest.mockRejectedValue(
      new ApiError(400, "VALIDATION_ERROR", "That vehicle is not on your list."),
    );

    await enqueueBooking(booking());
    await flushOutbox();

    const entry = (await listOutbox())[0];
    expect(entry?.status).toBe("failed");
    expect(entry?.lastError).toBe("That vehicle is not on your list.");

    // A second flush does not try it again.
    await flushOutbox();
    expect(createServiceRequest).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt limit", async () => {
    createServiceRequest.mockRejectedValue(
      new ApiError(500, "INTERNAL_ERROR", "Something went wrong."),
    );

    await enqueueBooking(booking());

    for (let attempt = 0; attempt < MAX_ATTEMPTS + 2; attempt += 1) {
      await flushOutbox();
    }

    expect((await listOutbox())[0]?.status).toBe("failed");
    expect(createServiceRequest.mock.calls.length).toBeLessThanOrEqual(MAX_ATTEMPTS);
  });
});

describe("tidying up", () => {
  it("clears synced entries and leaves the rest", async () => {
    createServiceRequest.mockResolvedValueOnce(serverResponse());
    await enqueueBooking(booking());
    await flushOutbox();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await enqueueBooking(booking());

    expect(await clearSynced()).toBe(1);

    const left = await listOutbox();
    expect(left).toHaveLength(1);
    expect(left[0]?.status).toBe("pending");
  });
});
