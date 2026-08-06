import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { emptyDraft, BOOKING_DRAFT_KEY } = await import("@/components/booking/use-booking-draft");

/**
 * The exact validator the server applies to clientRequestId, so a failure here
 * is a booking the API would reject with "Not a valid client request
 * identifier." rather than a stylistic complaint about the format.
 */
const serverValidator = z.uuid();

/** A UUID generator, minus randomUUID, which is what an older WebView offers. */
function cryptoWithoutRandomUUID(): Crypto {
  return {
    getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
      const bytes = new Uint8Array((array as unknown as Uint8Array).buffer);
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  } as Crypto;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clientRequestId", () => {
  it("is a uuid the server accepts when randomUUID is available", () => {
    expect(serverValidator.safeParse(emptyDraft().clientRequestId).success).toBe(true);
  });

  /*
    The regression. The old fallback padded a timestamp out to thirty six
    characters, which is the right length and the wrong shape, so every booking
    from a browser without randomUUID was rejected before it reached the
    database.
  */
  it("is a uuid the server accepts when randomUUID is missing", () => {
    vi.stubGlobal("crypto", cryptoWithoutRandomUUID());

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const id = emptyDraft().clientRequestId;
      expect(serverValidator.safeParse(id).success, `rejected ${id}`).toBe(true);
    }
  });

  it("is a uuid the server accepts with no crypto at all", () => {
    vi.stubGlobal("crypto", undefined);

    expect(serverValidator.safeParse(emptyDraft().clientRequestId).success).toBe(true);
  });

  it("does not repeat itself", () => {
    const ids = new Set(Array.from({ length: 200 }, () => emptyDraft().clientRequestId));

    expect(ids.size).toBe(200);
  });

  it("keeps the storage key stable, so saved drafts are still found", () => {
    expect(BOOKING_DRAFT_KEY).toBe("chrysmec-booking-draft");
  });
});
