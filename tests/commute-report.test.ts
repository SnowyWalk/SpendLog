import { TransactionDirection } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { detectCommuteTransport } from "@/lib/transport/commute";
import {
  isAutomaticRecurringCommuteTransitText,
  isCommuteLikeTransitText,
} from "@/lib/transport/commute-patterns";

function tx(overrides: {
  occurredAt: string;
  amount: number;
  merchantName?: string | null;
  description?: string | null;
}) {
  return {
    occurredAt: new Date(overrides.occurredAt),
    merchantName: overrides.merchantName ?? "후불교통",
    description: overrides.description ?? null,
    amount: overrides.amount,
    direction: TransactionDirection.EXPENSE,
    isCanceled: false,
  };
}

describe("commute transport report", () => {
  it("keeps commute and recurring transit predicates aligned by an explicit matrix", () => {
    const cases = [
      ["T-money 후불교통", true],
      ["city bus fare", true],
      ["transit card payment", true],
      ["business lunch", false],
      ["Subway sandwich", false],
      ["Metro mart membership", false],
    ] as const;

    for (const [text, expected] of cases) {
      expect(isCommuteLikeTransitText(text), text).toBe(expected);
      expect(isAutomaticRecurringCommuteTransitText(text), text).toBe(expected);
    }
  });

  it("returns explicit no-data defaults", () => {
    expect(detectCommuteTransport([])).toMatchObject({
      averageCommuteDayCost: 0,
      monthlyEstimate: 0,
      yearlyEstimate: 0,
      sampleDays: 0,
      sampleMonths: 0,
      projectionCommuteDaysPerMonth: 23.7,
      confidence: "none",
    });
  });

  it("groups commute-like transactions by Seoul-local weekday before applying 23.7", () => {
    const report = detectCommuteTransport([
      tx({ occurredAt: "2026-06-01T08:00:00+09:00", amount: 1_450, merchantName: "티머니" }),
      tx({ occurredAt: "2026-06-01T19:00:00+09:00", amount: 1_450, merchantName: "티머니" }),
      tx({ occurredAt: "2026-06-02T08:00:00+09:00", amount: 3_000, merchantName: "택시" }),
      tx({ occurredAt: "2026-06-06T08:00:00+09:00", amount: 1_450, merchantName: "티머니" }),
    ]);

    expect(report.averageCommuteDayCost).toBe(2_900);
    expect(report.monthlyEstimate).toBe(Math.round(2_900 * 23.7));
    expect(report.yearlyEstimate).toBe(report.monthlyEstimate * 12);
    expect(report.sampleDays).toBe(1);
    expect(report.confidence).toBe("low");
  });

  it("uses nearest-rank P10/P90 trimming when at least eight days are retained", () => {
    const amounts = [1_000, 2_000, 3_000, 4_000, 5_000, 6_000, 7_000, 8_000, 9_000, 25_000];
    const weekdays = [
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ];
    const transactions = amounts.map((amount, index) =>
      tx({
        occurredAt: `${weekdays[index]}T08:00:00+09:00`,
        amount,
        merchantName: "후불교통",
      })
    );

    const report = detectCommuteTransport(transactions);

    expect(report.sampleDays).toBe(9);
    expect(report.averageCommuteDayCost).toBe(5_000);
  });

  it("reports high confidence for stable samples across at least three months", () => {
    const weekdaysByMonth = [
      ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09", "2026-01-12"],
      ["2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06", "2026-02-09"],
      ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-09"],
    ].flat();
    const transactions = weekdaysByMonth.map((date) => {
      return tx({
        occurredAt: `${date}T08:00:00+09:00`,
        amount: 3_000,
        merchantName: "후불교통",
      });
    });

    expect(detectCommuteTransport(transactions)).toMatchObject({
      averageCommuteDayCost: 3_000,
      sampleMonths: 3,
      confidence: "high",
    });
  });
});
