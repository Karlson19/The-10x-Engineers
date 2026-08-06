import { describe, expect, it } from "vitest";

const { formatDate, formatDateTime, formatTime } = await import("@/lib/format");

/*
  Intl.DateTimeFormat throws RangeError on an invalid date rather than returning
  anything, and these are called straight from render. One unreadable timestamp
  from the API or from a stored draft used to take the whole page down to the
  error boundary, which is a poor trade for a field nobody would have missed.
*/
const UNREADABLE = ["", "not a date", "2026-13-45", "undefined", "null"];

describe("date formatting", () => {
  it("formats a real date", () => {
    expect(formatDate("2026-08-12T14:30:00.000Z")).toBe("12 Aug 2026");
  });

  it("formats a real time", () => {
    expect(formatTime("2026-08-12T14:30:00.000Z")).toContain(":");
  });

  it.each(UNREADABLE)("does not throw on %j", (value) => {
    expect(() => formatDate(value)).not.toThrow();
    expect(() => formatTime(value)).not.toThrow();
    expect(() => formatDateTime(value)).not.toThrow();
  });

  it.each(UNREADABLE)("says unknown rather than half a date for %j", (value) => {
    expect(formatDateTime(value)).toBe("Unknown");
  });

  it("does not throw on an invalid Date object", () => {
    expect(() => formatDateTime(new Date("nonsense"))).not.toThrow();
    expect(formatDateTime(new Date("nonsense"))).toBe("Unknown");
  });
});
