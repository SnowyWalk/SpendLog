import { describe, expect, it } from "vitest";
import { buildSeoulDate, nextExpectedDate } from "@/lib/recurring/date";

describe("recurring date helpers", () => {
  it("moves next expected payment to next month when this month's expected day is past", () => {
    const next = nextExpectedDate(
      new Date("2026-05-05T00:00:00+09:00"),
      5,
      new Date("2026-06-29T12:00:00+09:00")
    );

    expect(next.toISOString()).toBe(new Date("2026-07-05T00:00:00+09:00").toISOString());
  });

  it("keeps this month's expected payment when it has not passed yet", () => {
    const next = nextExpectedDate(
      new Date("2026-05-30T00:00:00+09:00"),
      30,
      new Date("2026-06-29T12:00:00+09:00")
    );

    expect(next.toISOString()).toBe(new Date("2026-06-30T00:00:00+09:00").toISOString());
  });

  it("normalizes Seoul date month arithmetic across the previous year", () => {
    expect(buildSeoulDate(2026, -4, 1).toISOString()).toBe(
      new Date("2025-08-01T00:00:00+09:00").toISOString()
    );
    expect(buildSeoulDate(2026, 0, 1).toISOString()).toBe(
      new Date("2025-12-01T00:00:00+09:00").toISOString()
    );
  });
});
