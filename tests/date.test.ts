import { describe, expect, it } from "vitest";
import { fromCodefDate, fromCodefDateTime, normalizeIsoDate, toCodefDate } from "@/lib/codef/date";

describe("CODEF date helpers", () => {
  it("formats browser date input for CODEF", () => {
    expect(toCodefDate("2026-06-29")).toBe("20260629");
  });

  it("normalizes accepted sync API date formats to ISO", () => {
    expect(normalizeIsoDate("20260629")).toBe("2026-06-29");
    expect(normalizeIsoDate("2026-06-29")).toBe("2026-06-29");
  });

  it("parses CODEF local date and time", () => {
    expect(fromCodefDateTime("20260629", "153000").toISOString()).toBe("2026-06-29T06:30:00.000Z");
    expect(fromCodefDate("20260629").toISOString()).toBe("2026-06-28T15:00:00.000Z");
  });

  it("rejects malformed CODEF provider dates", () => {
    expect(() => fromCodefDateTime(undefined, "153000")).toThrow("date");
    expect(() => fromCodefDateTime("20260629", undefined)).toThrow("time");
    expect(() => fromCodefDateTime("20260629", "1530")).toThrow("time");
  });
});
