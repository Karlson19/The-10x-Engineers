"use client";

import { useCallback, useEffect, useState } from "react";
import type { Section, SymptomAnswers } from "@chrysmec/shared";

export const BOOKING_DRAFT_KEY = "chrysmec-booking-draft";

export type BookingDraft = {
  step: number;
  vehicleId: string | null;
  section: Section | null;
  symptomCategory: string | null;
  symptomDetails: SymptomAnswers;
  serviceCatalogItemIds: string[];
  preferredDate: string;
  preferredTime: string;
  locationText: string;
  /**
   * Where the vehicle actually is, when the customer chose to share it. Optional
   * on purpose: somebody driving the car in has no reason to, and declining the
   * browser prompt must never block a booking.
   */
  latitude: number | null;
  longitude: number | null;
  /**
   * Generated once and kept across refreshes. It is the idempotency key the
   * server uses, so a booking that is retried can never become two bookings.
   */
  clientRequestId: string;
};

/**
 * The server validates this with z.uuid(), so anything that is not shaped
 * 8-4-4-4-12 is rejected outright with "Not a valid client request identifier."
 *
 * The previous fallback built `${Date.now().toString(16)}-4000-8000-...` and
 * padded it to 36 characters. Thirty six characters is not a UUID: that lays
 * out as 11-4-4-14, so every booking made on a browser without randomUUID
 * failed validation. Worse, the id is kept in local storage, so once a device
 * generated a bad one it went on failing on every retry until the draft was
 * cleared — which is not something a customer can be asked to do.
 *
 * randomUUID is missing in exactly the places this app is used: older Android
 * WebViews, and any insecure context, since it is restricted to secure ones.
 * So the fallback has to produce a real v4, not an approximation of one.
 */
function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // Version 4, and the RFC 4122 variant bits.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function emptyDraft(): BookingDraft {
  return {
    step: 0,
    vehicleId: null,
    section: null,
    symptomCategory: null,
    symptomDetails: {},
    serviceCatalogItemIds: [],
    preferredDate: "",
    preferredTime: "09:00",
    locationText: "",
    latitude: null,
    longitude: null,
    clientRequestId: newClientRequestId(),
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDraft(value: unknown): value is BookingDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<BookingDraft>;
  return (
    typeof candidate.step === "number" &&
    typeof candidate.clientRequestId === "string" &&
    typeof candidate.symptomDetails === "object" &&
    candidate.symptomDetails !== null
  );
}

function read(): BookingDraft | null {
  try {
    const raw = window.localStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);

    if (!isDraft(parsed)) {
      return null;
    }

    /*
      A draft saved by an earlier version can be carrying one of the malformed
      identifiers, and it would fail validation on every send for as long as it
      stayed there. Replace just the identifier and keep everything the customer
      typed: the booking has not reached the server, so there is nothing for a
      fresh one to duplicate.
    */
    if (!UUID_PATTERN.test(parsed.clientRequestId)) {
      return { ...parsed, clientRequestId: newClientRequestId() };
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Wizard state, kept in local storage so a dropped connection or an accidental
 * refresh in a car park never loses what someone has already typed.
 */
export function useBookingDraft() {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    const stored = read();
    if (stored) {
      setDraft(stored);
    }
    setIsRestored(true);
  }, []);

  useEffect(() => {
    if (!isRestored) {
      return;
    }
    try {
      window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage can be full or blocked. The wizard still works for this visit.
    }
  }, [draft, isRestored]);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(BOOKING_DRAFT_KEY);
    } catch {
      // Nothing to do, the next draft simply overwrites it.
    }
    setDraft(emptyDraft());
  }, []);

  return { draft, update, reset, isRestored };
}
