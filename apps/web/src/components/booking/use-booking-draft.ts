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
   * Generated once and kept across refreshes. It is the idempotency key the
   * server uses, so a booking that is retried can never become two bookings.
   */
  clientRequestId: string;
};

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Older Android WebViews do not expose randomUUID over plain http.
  return `${Date.now().toString(16)}-4000-8000-${Math.random().toString(16).slice(2, 14)}`.padEnd(
    36,
    "0",
  );
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
    clientRequestId: newClientRequestId(),
  };
}

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
    return isDraft(parsed) ? parsed : null;
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
