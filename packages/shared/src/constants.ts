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

/**
 * Neutral labels, used on the workshop's own screens and in API messages.
 * "Awaiting approval" rather than "awaiting your approval", because on a
 * technician's job card the approval is not theirs to give.
 */
export const REQUEST_STATUS_LABELS: Readonly<Record<RequestStatus, string>> = {
  SUBMITTED: "Submitted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  AWAITING_APPROVAL: "Awaiting approval",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * The same statuses said to the customer, where the second person is right and
 * the waiting is on them.
 */
export const CUSTOMER_STATUS_LABELS: Readonly<Record<RequestStatus, string>> = {
  ...REQUEST_STATUS_LABELS,
  AWAITING_APPROVAL: "Awaiting your approval",
};

/**
 * Business details shown on the public site and on printed invoices. The name,
 * short name, tagline, phone number and the four locations are taken from the
 * company's own flier.
 *
 * The email is still a placeholder rather than an invented one, and there is no
 * street line because the flier does not give one.
 */
export const BUSINESS = {
  name: "Chrysmec Auto Center",
  shortName: "CAC",
  tagline: "Your online mechanical engineer.",
  city: "Kumasi",
  /** Kumasi is the main workshop. The rest are the other branches on the flier. */
  locations: ["Kumasi", "Techiman", "Accra", "Sunyani"],
  addressLines: ["Kumasi, Techiman, Accra and Sunyani"],
  phone: "0555695431",
  /** The same number in the form a phone dialer needs. */
  phoneHref: "+233555695431",
  email: "hello@chrysmec.com",
  services: [
    "General mechanical solutions",
    "Car diagnosis",
    "Auto electrical solutions",
  ],
  openingHours: [
    { days: "Monday to Friday", hours: "07:30 to 18:00" },
    { days: "Saturday", hours: "08:00 to 15:00" },
    { days: "Sunday", hours: "Closed" },
  ],
} as const;
