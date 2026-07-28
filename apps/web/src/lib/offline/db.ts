import Dexie, { type Table } from "dexie";

/**
 * The outbox. Mutations made while the network is down land here and are
 * flushed in order when it comes back.
 *
 * Every entry carries a clientRequestId generated on the device. The server
 * treats it as an idempotency key, so a queued booking that gets flushed twice,
 * because the tab was reopened or two tabs raced, still creates exactly one
 * record.
 */

export type OutboxStatus = "pending" | "sending" | "synced" | "failed";

export type OutboxKind = "booking";

export type OutboxEntry = {
  /** Auto-incremented, and also the order the queue is flushed in. */
  id?: number;
  kind: OutboxKind;
  /** The idempotency key. Also how the UI matches a queued item to its record. */
  clientRequestId: string;
  /** The exact request body, ready to send unchanged. */
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  /** Set when the last attempt failed, so the UI can say what went wrong. */
  lastError?: string;
  /** Set once the server has accepted it, so the UI can link to the record. */
  serverId?: string;
};

class ChrysmecDatabase extends Dexie {
  outbox!: Table<OutboxEntry, number>;

  constructor() {
    super("chrysmec");

    this.version(1).stores({
      // ++id gives us insertion order for free, which is the flush order.
      outbox: "++id, status, clientRequestId, createdAt",
    });
  }
}

let instance: ChrysmecDatabase | null = null;

/**
 * Created lazily and never on the server. Next renders these components during
 * the build, where indexedDB does not exist.
 */
export function getDatabase(): ChrysmecDatabase {
  if (typeof window === "undefined") {
    throw new Error("The outbox is only available in the browser.");
  }

  instance ??= new ChrysmecDatabase();
  return instance;
}

export function isOutboxAvailable(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

/** Test seam: lets a suite point at a fresh database per run. */
export function __setDatabaseForTests(database: ChrysmecDatabase | null): void {
  instance = database;
}

export { ChrysmecDatabase };
