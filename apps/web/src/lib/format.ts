import { CURRENCY_CODE, CURRENCY_LOCALE } from "@chrysmec/shared";

/**
 * Money arrives from the API as a string so no precision is lost in JSON.
 * It is always shown as "GHS 450.00".
 */
export function formatCurrency(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;

  if (!Number.isFinite(value)) {
    return `${CURRENCY_CODE} 0.00`;
  }

  return `${CURRENCY_CODE} ${value.toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * What is shown when a date cannot be read. These formatters are called
 * straight from render with values that came off the network or out of local
 * storage, and Intl.DateTimeFormat throws RangeError on an invalid date rather
 * than returning anything. Thrown from render, that reaches the error boundary
 * and takes the whole page down over one unreadable timestamp, so a bad value
 * is shown as unknown instead.
 */
const UNKNOWN_DATE = "Unknown";

function toDate(value: string | Date): Date | null {
  const date = typeof value === "string" ? new Date(value) : value;

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Dates read as "12 Aug 2026". */
export function formatDate(value: string | Date): string {
  const date = toDate(value);

  if (!date) {
    return UNKNOWN_DATE;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Times are 24 hour, so "14:30". */
export function formatTime(value: string | Date): string {
  const date = toDate(value);

  if (!date) {
    return UNKNOWN_DATE;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  // Checked here as well, so an unreadable value reads "Unknown" rather than
  // the "Unknown, Unknown" that formatting both halves separately would give.
  if (!toDate(value)) {
    return UNKNOWN_DATE;
  }

  return `${formatDate(value)}, ${formatTime(value)}`;
}

/**
 * "Just now", "20 minutes ago", "3 days ago", and the plain date once it is
 * far enough back that counting stops being useful.
 *
 * Used on notifications, where how long ago something happened matters more
 * than the exact time it happened.
 */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  // A clock a few seconds out of step should not read "in 4 seconds".
  if (seconds < 60) {
    return "Just now";
  }

  const units: ReadonlyArray<{ limit: number; per: number; name: string }> = [
    { limit: 3600, per: 60, name: "minute" },
    { limit: 86400, per: 3600, name: "hour" },
    { limit: 604800, per: 86400, name: "day" },
  ];

  for (const unit of units) {
    if (seconds < unit.limit) {
      const count = Math.floor(seconds / unit.per);
      return `${count} ${unit.name}${count === 1 ? "" : "s"} ago`;
    }
  }

  return formatDate(date);
}
