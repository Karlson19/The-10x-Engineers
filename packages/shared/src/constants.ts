import type { RequestStatus, Section } from "./enums";

/** Every amount in the system is Ghana Cedis, formatted as "GHS 450.00". */
export const CURRENCY_CODE = "GHS";
export const CURRENCY_LOCALE = "en-GH";

export const API_VERSION = "v1";
export const API_BASE_PATH = `/api/${API_VERSION}`;

/** Access token lives in memory for 15 minutes, refresh cookie for 7 days. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Rate limit applied to /auth routes: 10 requests per 15 minutes per IP. */
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX = 10;

/** Request body ceiling, kept small because clients are on metered mobile data. */
export const MAX_JSON_BODY_SIZE = "100kb";

/**
 * Allowed service request status moves. Enforced on the server, mirrored on the
 * client so the UI only offers transitions the API will accept.
 */
export const STATUS_TRANSITIONS: Readonly<Record<RequestStatus, readonly RequestStatus[]>> = {
  SUBMITTED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_APPROVAL", "COMPLETED"],
  AWAITING_APPROVAL: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** The ordered stages shown in the customer facing status timeline. */
export const TIMELINE_STAGES: readonly RequestStatus[] = [
  "SUBMITTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "COMPLETED",
];

export const SECTION_LABELS: Readonly<Record<Section, string>> = {
  MECHANICAL: "Mechanical",
  ELECTRICAL: "Electrical",
};

export const REQUEST_STATUS_LABELS: Readonly<Record<RequestStatus, string>> = {
  SUBMITTED: "Submitted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  AWAITING_APPROVAL: "Awaiting your approval",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Business details shown on the public site and on printed invoices.
 *
 * The phone number and email are placeholders until the real ones are
 * confirmed, and there is no street line yet on purpose rather than an
 * invented one. The city is correct: the workshop is in Kumasi.
 */
export const BUSINESS = {
  name: "Chrysmec Auto Center",
  tagline: "Vehicle repair and servicing, booked properly.",
  city: "Kumasi",
  addressLines: ["Kumasi, Ashanti Region"],
  phone: "+233 32 000 0000",
  email: "hello@chrysmec.com",
  openingHours: [
    { days: "Monday to Friday", hours: "07:30 to 18:00" },
    { days: "Saturday", hours: "08:00 to 15:00" },
    { days: "Sunday", hours: "Closed" },
  ],
} as const;
