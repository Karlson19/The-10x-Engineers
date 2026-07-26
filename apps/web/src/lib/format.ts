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

/** Dates read as "12 Aug 2026". */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Times are 24 hour, so "14:30". */
export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}
