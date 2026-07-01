import { TransactionDirection } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseTransactionFilters } from "@/lib/transactions/filters";

const defaults = {
  startDate: "2026-07-01",
  endDate: "2026-07-31",
};

describe("transaction filters", () => {
  it("keeps current month defaults when no query params are provided", () => {
    expect(parseTransactionFilters(undefined, defaults)).toMatchObject({
      q: "",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      categoryId: "",
      sourceId: "",
      direction: "",
      uncategorized: false,
    });
  });

  it("normalizes supported filter values", () => {
    expect(
      parseTransactionFilters(
        {
          q: "  스타벅스  ",
          startDate: "2026-07-03",
          endDate: "2026-07-20",
          categoryId: "cat-food",
          sourceId: "account-card",
          direction: TransactionDirection.EXPENSE,
          uncategorized: "1",
        },
        defaults
      )
    ).toMatchObject({
      q: "스타벅스",
      startDate: "2026-07-03",
      endDate: "2026-07-20",
      categoryId: "cat-food",
      sourceId: "account-card",
      direction: TransactionDirection.EXPENSE,
      uncategorized: true,
    });
  });

  it("falls back from malformed dates and unsupported directions", () => {
    expect(
      parseTransactionFilters(
        {
          startDate: "bad",
          endDate: "2026-7-31",
          direction: "BROKEN",
        },
        defaults
      )
    ).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      direction: "",
    });
  });

  it("falls back from regex-shaped invalid calendar dates", () => {
    expect(
      parseTransactionFilters(
        {
          startDate: "2026-13-40",
          endDate: "2026-02-29",
        },
        defaults
      )
    ).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
  });
});
