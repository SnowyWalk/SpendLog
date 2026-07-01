import { describe, expect, it } from "vitest";
import { buildAttentionItems } from "@/lib/attention/selector";

const now = new Date("2026-07-10T00:00:00+09:00");

function baseInput() {
  return {
    now,
    budget: {
      status: "on-track" as const,
      targetAmount: 1_000_000,
      spentAmount: 400_000,
      projectedAmount: 800_000,
      remainingAmount: 600_000,
    },
    recurring: [],
    sync: {
      latestStatus: "SUCCESS" as const,
      latestErrorMessage: null,
      lastSuccessAt: now,
    },
    uncategorized: {
      count: 0,
      amount: 0,
      topMerchantName: null,
    },
  };
}

describe("attention selector", () => {
  it("returns no noisy items for healthy empty input", () => {
    expect(buildAttentionItems(baseInput())).toEqual([]);
  });

  it("does not show stale sync while a sync is running", () => {
    const items = buildAttentionItems({
      ...baseInput(),
      sync: {
        latestStatus: "RUNNING",
        latestErrorMessage: null,
        lastSuccessAt: null,
      },
    });

    expect(items).toEqual([]);
  });

  it("orders sync failures before budget warnings and cleanup", () => {
    const input = baseInput();
    const items = buildAttentionItems({
      ...input,
      budget: {
        ...input.budget,
        status: "watch",
        projectedAmount: 1_200_000,
      },
      sync: {
        ...input.sync,
        latestStatus: "FAILED",
        latestErrorMessage: "provider timeout",
      },
      uncategorized: {
        count: 3,
        amount: 45_000,
        topMerchantName: "테스트상점",
      },
    });

    expect(items.map((item) => item.type)).toEqual([
      "sync-failed",
      "budget-watch",
      "uncategorized",
    ]);
  });

  it("shows upcoming recurring expenses within a week once", () => {
    const items = buildAttentionItems({
      ...baseInput(),
      recurring: [
        {
          name: "넷플릭스",
          amount: 17_000,
          nextExpectedAt: new Date("2026-07-13T00:00:00+09:00"),
        },
        {
          name: "보험",
          amount: 80_000,
          nextExpectedAt: new Date("2026-07-25T00:00:00+09:00"),
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "upcoming-recurring",
      href: "/recurring",
    });
  });
});
