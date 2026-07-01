import {
  RecurringExpenseRuleKind,
  TransactionDirection,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  nextExpectedDate,
  nextExpectedDateFromDay,
  seoulDateParts,
} from "@/lib/recurring/date";
import { normalizeRecurringMatchKey } from "@/lib/recurring/match";
import { isAutomaticRecurringCommuteTransitText } from "@/lib/transport/commute-patterns";

const UNCATEGORIZED = {
  id: "uncategorized",
  name: "미분류",
  color: "#475569",
};
const RECURRING_SCOPE_KEY = "global";

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: true;
    manualCategory: true;
    linkedFinancialAccount: true;
  };
}>;

type RuleWithCategory = Prisma.RecurringExpenseRuleGetPayload<{
  include: { category: true };
}>;

export type ManagedRecurringExpense = {
  id: string;
  ruleId: string | null;
  matchKey: string;
  name: string;
  category: string;
  categoryColor: string;
  categoryId: string | null;
  averageAmount: number;
  expectedDay: number | null;
  monthCount: number;
  transactionCount: number;
  lastPaidAt: Date | null;
  nextExpectedAt: Date;
  source: string;
  sourceType: "detected" | "manual" | "confirmed";
  note: string | null;
};

export type ExcludedRecurringExpense = {
  id: string;
  matchKey: string;
  name: string;
  category: string;
  categoryColor: string;
  averageAmount: number;
  source: string;
  exclusionRuleId: string;
};

export type DetectedRecurringExpense = Omit<
  ManagedRecurringExpense,
  "id" | "ruleId" | "sourceType" | "note"
> & {
  id?: string;
};

export function recurringExpenseKey(transaction: TransactionWithRelations) {
  const name = transaction.merchantName || transaction.description;
  return name?.replace(/\s+/g, " ").trim() ?? "";
}

function monthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function lookbackStart(months: number, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - months, 1, -9));
}

function effectiveCategory(transaction: TransactionWithRelations) {
  return transaction.manualCategory ?? transaction.category ?? UNCATEGORIZED;
}

function toNumber(value: Prisma.Decimal | number | string) {
  return Number(value);
}

function expenseAmount(transaction: TransactionWithRelations) {
  const amount = toNumber(transaction.amount);
  if (transaction.direction === TransactionDirection.REVERSAL || transaction.isCanceled) {
    return -Math.abs(amount);
  }
  if (transaction.direction === TransactionDirection.EXPENSE) {
    return Math.abs(amount);
  }
  return 0;
}

export function detectRecurringExpenses(
  transactions: TransactionWithRelations[],
  now = new Date()
) {
  const groups = new Map<
    string,
    {
      matchKey: string;
      name: string;
      category: string;
      categoryColor: string;
      categoryId: string | null;
      amounts: number[];
      days: number[];
      months: Set<string>;
      lastPaidAt: Date;
      source: string;
    }
  >();

  for (const transaction of transactions) {
    if (isAutomaticRecurringCommuteTransitText(transaction)) {
      continue;
    }

    const name = recurringExpenseKey(transaction);
    const matchKey = normalizeRecurringMatchKey(name);
    const amount = expenseAmount(transaction);
    if (!matchKey || amount < 1000) {
      continue;
    }

    const category = effectiveCategory(transaction);
    const item = groups.get(matchKey) ?? {
      matchKey,
      name,
      category: category.name,
      categoryColor: category.color,
      categoryId: category.id === UNCATEGORIZED.id ? null : category.id,
      amounts: [],
      days: [],
      months: new Set<string>(),
      lastPaidAt: transaction.occurredAt,
      source: transaction.linkedFinancialAccount.displayName,
    };

    item.amounts.push(amount);
    item.days.push(seoulDateParts(transaction.occurredAt).day);
    item.months.add(monthKey(transaction.occurredAt));
    if (transaction.occurredAt > item.lastPaidAt) {
      item.lastPaidAt = transaction.occurredAt;
      item.name = name;
      item.category = category.name;
      item.categoryColor = category.color;
      item.categoryId = category.id === UNCATEGORIZED.id ? null : category.id;
      item.source = transaction.linkedFinancialAccount.displayName;
    }
    groups.set(matchKey, item);
  }

  return [...groups.values()]
    .map((item) => {
      const averageAmount =
        item.amounts.reduce((sum, amount) => sum + amount, 0) / item.amounts.length;
      const maxDeviation = Math.max(
        ...item.amounts.map((amount) => Math.abs(amount - averageAmount))
      );
      const averageDay = item.days.reduce((sum, day) => sum + day, 0) / item.days.length;
      return {
        ...item,
        averageAmount,
        averageDay,
        maxDeviation,
        monthCount: item.months.size,
        transactionCount: item.amounts.length,
      };
    })
    .filter(
      (item) =>
        item.monthCount >= 2 &&
        item.amounts.length >= 2 &&
        item.maxDeviation <= Math.max(2000, item.averageAmount * 0.15)
    )
    .sort((a, b) => b.averageAmount - a.averageAmount)
    .map((item): DetectedRecurringExpense => ({
      matchKey: item.matchKey,
      name: item.name,
      category: item.category,
      categoryColor: item.categoryColor,
      categoryId: item.categoryId,
      averageAmount: Math.round(item.averageAmount),
      expectedDay: Math.round(item.averageDay),
      monthCount: item.monthCount,
      transactionCount: item.transactionCount,
      lastPaidAt: item.lastPaidAt,
      nextExpectedAt: nextExpectedDate(item.lastPaidAt, item.averageDay, now),
      source: item.source,
    }));
}

function fromRule(rule: RuleWithCategory, sourceType: "manual" | "confirmed") {
  const amount = Math.round(Number(rule.expectedAmount ?? 0));
  const expectedDay = rule.expectedDay ?? 1;
  return {
    id: `${sourceType}:${rule.id}`,
    ruleId: rule.id,
    matchKey: rule.matchKey,
    name: rule.displayName,
    category: rule.category?.name ?? UNCATEGORIZED.name,
    categoryColor: rule.category?.color ?? UNCATEGORIZED.color,
    categoryId: rule.categoryId,
    averageAmount: amount,
    expectedDay,
    monthCount: 0,
    transactionCount: 0,
    lastPaidAt: null,
    nextExpectedAt: nextExpectedDateFromDay(expectedDay),
    source: rule.sourceHint ?? "직접 관리",
    sourceType,
    note: rule.note,
  } satisfies ManagedRecurringExpense;
}

function firstRuleByMatchKey(rules: RuleWithCategory[]) {
  const result = new Map<string, RuleWithCategory>();
  for (const rule of rules) {
    if (!result.has(rule.matchKey)) {
      result.set(rule.matchKey, rule);
    }
  }
  return result;
}

export function mergeRecurringExpenses(input: {
  detected: DetectedRecurringExpense[];
  rules: RuleWithCategory[];
}) {
  const activeRules = input.rules.filter((rule) => rule.isActive);
  const exclusions = firstRuleByMatchKey(
    activeRules.filter((rule) => rule.kind === RecurringExpenseRuleKind.EXCLUSION)
  );
  const confirmed = firstRuleByMatchKey(
    activeRules.filter((rule) => rule.kind === RecurringExpenseRuleKind.CONFIRMED)
  );
  const manual = firstRuleByMatchKey(
    activeRules.filter((item) => item.kind === RecurringExpenseRuleKind.MANUAL)
  );
  const expenses = new Map<string, ManagedRecurringExpense>();
  const excluded: ExcludedRecurringExpense[] = [];

  for (const detected of input.detected) {
    const exclusion = exclusions.get(detected.matchKey);
    const hasManagedOverride = manual.has(detected.matchKey) || confirmed.has(detected.matchKey);
    if (exclusion && !hasManagedOverride) {
      excluded.push({
        id: `excluded:${detected.matchKey}`,
        matchKey: detected.matchKey,
        name: detected.name,
        category: detected.category,
        categoryColor: detected.categoryColor,
        averageAmount: detected.averageAmount,
        source: detected.source,
        exclusionRuleId: exclusion.id,
      });
      continue;
    }

    const confirmation = confirmed.get(detected.matchKey);
    if (confirmation) {
      expenses.set(detected.matchKey, {
        ...detected,
        id: `confirmed:${confirmation.id}`,
        ruleId: confirmation.id,
        name: confirmation.displayName || detected.name,
        category: confirmation.category?.name ?? detected.category,
        categoryColor: confirmation.category?.color ?? detected.categoryColor,
        categoryId: confirmation.categoryId ?? detected.categoryId,
        averageAmount: Math.round(Number(confirmation.expectedAmount ?? detected.averageAmount)),
        expectedDay: confirmation.expectedDay ?? detected.expectedDay,
        nextExpectedAt: confirmation.expectedDay
          ? nextExpectedDateFromDay(confirmation.expectedDay)
          : detected.nextExpectedAt,
        source: confirmation.sourceHint ?? detected.source,
        sourceType: "confirmed",
        note: confirmation.note,
      });
    } else {
      expenses.set(detected.matchKey, {
        ...detected,
        id: `detected:${detected.matchKey}`,
        ruleId: null,
        sourceType: "detected",
        note: null,
      });
    }
  }

  for (const rule of confirmed.values()) {
    if (!expenses.has(rule.matchKey) && !exclusions.has(rule.matchKey)) {
      expenses.set(rule.matchKey, fromRule(rule, "confirmed"));
    }
  }

  for (const rule of manual.values()) {
    expenses.set(rule.matchKey, fromRule(rule, "manual"));
  }

  const managedExpenses = [...expenses.values()].sort(
    (a, b) => b.averageAmount - a.averageAmount
  );
  const categoryMap = new Map<
    string,
    { name: string; color: string; amount: number; count: number }
  >();

  for (const expense of managedExpenses) {
    const item = categoryMap.get(expense.category) ?? {
      name: expense.category,
      color: expense.categoryColor,
      amount: 0,
      count: 0,
    };
    item.amount += expense.averageAmount;
    item.count += 1;
    categoryMap.set(expense.category, item);
  }

  const monthlyTotal = managedExpenses.reduce((sum, expense) => sum + expense.averageAmount, 0);

  return {
    expenses: managedExpenses,
    excluded: excluded.sort((a, b) => b.averageAmount - a.averageAmount),
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    categorySummary: [...categoryMap.values()].sort((a, b) => b.amount - a.amount),
  };
}

export async function getManagedRecurringExpenses() {
  const now = new Date();
  const transactions = await prisma.transaction.findMany({
    where: {
      occurredAt: { gte: lookbackStart(6, now), lte: now },
      direction: TransactionDirection.EXPENSE,
      isCanceled: false,
    },
    orderBy: { occurredAt: "desc" },
    include: {
      category: true,
      manualCategory: true,
      linkedFinancialAccount: true,
    },
  });
  const rules = await prisma.recurringExpenseRule.findMany({
    where: { scopeKey: RECURRING_SCOPE_KEY, isActive: true },
    orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
    include: { category: true },
  });

  return mergeRecurringExpenses({
    detected: detectRecurringExpenses(transactions, now),
    rules,
  });
}
