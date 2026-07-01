import { RecurringExpenseRuleKind, TransactionDirection } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  detectRecurringExpenses,
  mergeRecurringExpenses,
  type DetectedRecurringExpense,
} from "@/lib/recurring/report";
import { normalizeRecurringMatchKey } from "@/lib/recurring/match";

function detected(overrides: Partial<DetectedRecurringExpense> = {}): DetectedRecurringExpense {
  return {
    matchKey: "netflix",
    name: "Netflix",
    category: "구독",
    categoryColor: "#0f766e",
    categoryId: "cat-sub",
    averageAmount: 17_000,
    expectedDay: 3,
    monthCount: 3,
    transactionCount: 3,
    lastPaidAt: new Date("2026-06-03T00:00:00+09:00"),
    nextExpectedAt: new Date("2026-07-03T00:00:00+09:00"),
    source: "카드",
    ...overrides,
  };
}

function recurringTransaction(overrides: {
  occurredAt: string;
  merchantName: string;
  amount?: number;
  categoryName?: string;
}) {
  return {
    id: `${overrides.merchantName}-${overrides.occurredAt}`,
    occurredAt: new Date(overrides.occurredAt),
    merchantName: overrides.merchantName,
    description: null,
    amount: overrides.amount ?? 9_900,
    direction: TransactionDirection.EXPENSE,
    isCanceled: false,
    categoryId: "cat",
    manualCategoryId: null,
    linkedFinancialAccountId: "account",
    category: {
      id: "cat",
      name: overrides.categoryName ?? "구독",
      color: "#0f766e",
    },
    manualCategory: null,
    linkedFinancialAccount: {
      id: "account",
      displayName: "카드",
    },
  } as never;
}

describe("recurring expense report", () => {
  it("normalizes merchant names into stable match keys", () => {
    expect(normalizeRecurringMatchKey(" NETFLIX_ Korea  ")).toBe("netflix korea");
  });

  it("lets active exclusions hide detected recurring expenses", () => {
    const result = mergeRecurringExpenses({
      detected: [detected()],
      rules: [
        {
          id: "rule-exclude",
          kind: RecurringExpenseRuleKind.EXCLUSION,
          matchKey: "netflix",
          displayName: "Netflix",
          expectedAmount: 17_000,
          expectedDay: 3,
          sourceHint: "카드",
          isActive: true,
          categoryId: null,
          category: null,
        },
      ] as never,
    });

    expect(result.expenses).toHaveLength(0);
    expect(result.excluded).toHaveLength(1);
  });

  it("uses a manual rule instead of double-counting a matching detected expense", () => {
    const result = mergeRecurringExpenses({
      detected: [detected()],
      rules: [
        {
          id: "rule-manual",
          kind: RecurringExpenseRuleKind.MANUAL,
          matchKey: "netflix",
          displayName: "넷플릭스",
          expectedAmount: 18_000,
          expectedDay: 5,
          sourceHint: "직접 등록",
          note: null,
          isActive: true,
          categoryId: null,
          category: null,
        },
      ] as never,
    });

    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]).toMatchObject({
      name: "넷플릭스",
      averageAmount: 18_000,
      sourceType: "manual",
    });
    expect(result.monthlyTotal).toBe(18_000);
  });

  it("does not show a matching exclusion when a manual rule manages the same key", () => {
    const result = mergeRecurringExpenses({
      detected: [detected()],
      rules: [
        {
          id: "rule-exclude",
          kind: RecurringExpenseRuleKind.EXCLUSION,
          matchKey: "netflix",
          displayName: "Netflix",
          expectedAmount: 17_000,
          expectedDay: 3,
          sourceHint: "카드",
          note: null,
          isActive: true,
          categoryId: null,
          category: null,
        },
        {
          id: "rule-manual",
          kind: RecurringExpenseRuleKind.MANUAL,
          matchKey: "netflix",
          displayName: "넷플릭스",
          expectedAmount: 18_000,
          expectedDay: 5,
          sourceHint: "직접 등록",
          note: null,
          isActive: true,
          categoryId: null,
          category: null,
        },
      ] as never,
    });

    expect(result.excluded).toHaveLength(0);
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].sourceType).toBe("manual");
  });

  it("excludes commute-like transit text from automatic recurring detection", () => {
    const result = detectRecurringExpenses([
      recurringTransaction({
        occurredAt: "2026-04-10T08:00:00+09:00",
        merchantName: "후불교통",
        amount: 72_000,
        categoryName: "교통",
      }),
      recurringTransaction({
        occurredAt: "2026-05-10T08:00:00+09:00",
        merchantName: "후불교통",
        amount: 72_000,
        categoryName: "교통",
      }),
    ]);

    expect(result).toHaveLength(0);
  });

  it("keeps non-transport recurring expenses detectable", () => {
    const result = detectRecurringExpenses([
      recurringTransaction({ occurredAt: "2026-04-10T08:00:00+09:00", merchantName: "Netflix" }),
      recurringTransaction({ occurredAt: "2026-05-10T08:00:00+09:00", merchantName: "Netflix" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ matchKey: "netflix", averageAmount: 9_900 });
  });

  it("does not over-exclude broad transport categories without commute-like text", () => {
    const result = detectRecurringExpenses([
      recurringTransaction({
        occurredAt: "2026-04-10T08:00:00+09:00",
        merchantName: "주유소 멤버십",
        amount: 50_000,
        categoryName: "교통",
      }),
      recurringTransaction({
        occurredAt: "2026-05-10T08:00:00+09:00",
        merchantName: "주유소 멤버십",
        amount: 50_000,
        categoryName: "교통",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("주유소 멤버십");
  });
});
