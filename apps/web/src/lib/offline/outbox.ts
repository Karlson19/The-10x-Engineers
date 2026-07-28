import type { CreateServiceRequest, ServiceRequest } from "@chrysmec/shared";
import { ApiError } from "@/lib/api/client";
import { createServiceRequest } from "@/lib/api/service-requests";
import { type OutboxEntry, getDatabase, isOutboxAvailable } from "@/lib/offline/db";

/** How many times we retry one entry before parking it as failed. */
const MAX_ATTEMPTS = 5;

export type FlushResult = {
  synced: number;
  failed: number;
  remaining: number;
};

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Adds a booking to the queue and returns immediately. */
export async function enqueueBooking(payload: CreateServiceRequest): Promise<OutboxEntry> {
  const database = getDatabase();
  const now = Date.now();

  const entry: OutboxEntry = {
    kind: "booking",
    clientRequestId: payload.clientRequestId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const id = await database.outbox.add(entry);
  return { ...entry, id };
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  if (!isOutboxAvailable()) {
    return [];
  }
  return getDatabase().outbox.orderBy("createdAt").toArray();
}

/**
 * Bookings still on their way to the server. Failed ones are not counted:
 * they are terminal and need a decision from the customer, so counting them
 * as "sending" would be a lie that never resolves.
 */
export async function pendingCount(): Promise<number> {
  if (!isOutboxAvailable()) {
    return 0;
  }
  return getDatabase().outbox.where("status").anyOf("pending", "sending").count();
}

/** Everything that has not reached the workshop, including the parked ones. */
export async function unsentCount(): Promise<number> {
  if (!isOutboxAvailable()) {
    return 0;
  }
  return getDatabase().outbox.where("status").anyOf("pending", "sending", "failed").count();
}

/** Clears entries the server has confirmed, once the UI has shown them as synced. */
export async function clearSynced(): Promise<number> {
  if (!isOutboxAvailable()) {
    return 0;
  }
  return getDatabase().outbox.where("status").equals("synced").delete();
}

export async function removeEntry(id: number): Promise<void> {
  await getDatabase().outbox.delete(id);
}

/**
 * A failure that will never succeed no matter how often we retry: the payload
 * itself is wrong, or the booking is no longer the caller's to make. Parking
 * these immediately stops the queue jamming behind one bad entry.
 */
function isPermanent(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  return error.status === 400 || error.status === 403 || error.status === 404;
}

let flushInFlight: Promise<FlushResult> | null = null;

/**
 * Sends everything queued, oldest first, stopping at the first network failure
 * so entries keep their order. Only one flush runs at a time: the online event
 * and the visibility event both fire on a phone waking up, and without this
 * they would race and send the same entry twice.
 */
export function flushOutbox(): Promise<FlushResult> {
  flushInFlight ??= runFlush().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}

async function runFlush(): Promise<FlushResult> {
  if (!isOutboxAvailable() || !isOnline()) {
    return { synced: 0, failed: 0, remaining: await pendingCount() };
  }

  const database = getDatabase();

  /**
   * Only pending entries. Failed is terminal: either the payload will never be
   * accepted, or we have already tried enough times. Picking those up again
   * would spend a metered connection on a request that cannot succeed, and
   * would jam the queue behind it.
   */
  const queued = await database.outbox.where("status").equals("pending").sortBy("createdAt");

  let synced = 0;
  let failed = 0;

  for (const entry of queued) {
    if (entry.id === undefined) {
      continue;
    }

    await database.outbox.update(entry.id, { status: "sending", updatedAt: Date.now() });

    try {
      const created: ServiceRequest = await createServiceRequest(
        entry.payload as CreateServiceRequest,
      );

      await database.outbox.update(entry.id, {
        status: "synced",
        serverId: created.id,
        updatedAt: Date.now(),
      });
      synced += 1;
    } catch (error) {
      const attempts = entry.attempts + 1;
      const permanent = isPermanent(error);

      await database.outbox.update(entry.id, {
        status: permanent || attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        attempts,
        lastError:
          error instanceof ApiError ? error.message : "Could not reach the workshop.",
        updatedAt: Date.now(),
      });

      if (permanent) {
        failed += 1;
        continue;
      }

      // A network failure means the connection went again. Stop, keep the
      // order, and try the whole queue on the next reconnect.
      if (error instanceof ApiError && error.code === "NETWORK_ERROR") {
        break;
      }

      failed += 1;
    }
  }

  return { synced, failed, remaining: await pendingCount() };
}

export { MAX_ATTEMPTS };
