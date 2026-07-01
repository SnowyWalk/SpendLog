import { describe, expect, it } from "vitest";
import { calculateMonthlyBudget } from "@/lib/budget/math";

describe("monthly budget math", () => {
  it("calculates remaining daily allowance from the remaining days", () => {
    const result = calculateMonthlyBudget({
      targetAmount: 1_000_000,
      spentAmount: 400_000,
      projectedAmount: 800_000,
      recurringAmount: 200_000,
      elapsedDays: 10,
      daysInMonth: 30,
    });

    expect(result.status).toBe("on-track");
    expect(result.remainingDays).toBe(21);
    expect(result.remainingAmount).toBe(600_000);
    expect(Math.round(result.dailyAllowance ?? 0)).toBe(28_571);
    expect(Math.round(result.variableDailyAllowance ?? 0)).toBe(19_048);
    expect(result.progressPercent).toBe(40);
  });

  it("treats zero target as tracking-only and negative remaining as over budget", () => {
    expect(
      calculateMonthlyBudget({
        targetAmount: 0,
        spentAmount: 120_000,
        projectedAmount: 240_000,
        recurringAmount: 0,
        elapsedDays: 15,
        daysInMonth: 30,
      }).status
    ).toBe("zero-target");

    expect(
      calculateMonthlyBudget({
        targetAmount: 100_000,
        spentAmount: 120_000,
        projectedAmount: 160_000,
        recurringAmount: 0,
        elapsedDays: 20,
        daysInMonth: 30,
      }).status
    ).toBe("over");
  });
});
