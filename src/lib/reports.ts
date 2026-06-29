import "server-only";
import { TransactionDirection, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  nextExpectedDate,
  seoulDateParts,
  seoulDayOfWeek,
} from "@/lib/recurring/date";

const SEOUL_TIME_ZONE = "Asia/Seoul";
const UNCATEGORIZED = {
  id: "uncategorized",
  name: "미분류",
  color: "#475569",
};

function monthRange(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month] = formatter.format(now).split("-").map(Number);
  return {
    label: `${year}년 ${month}월`,
    start: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`),
    end: new Date(now.getTime()),
    startInput: `${year}-${String(month).padStart(2, "0")}-01`,
    endInput: formatter.format(now),
  };
}

function monthRangeWithOffset(offset: number, now = new Date(), endDay?: number) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(now).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const startInput = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  const isCurrentMonth = offset === 0;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const rangeEndDay = Math.min(endDay ?? lastDay, lastDay);

  return {
    label: `${targetYear}년 ${targetMonth}월`,
    start: new Date(`${startInput}T00:00:00+09:00`),
    end: isCurrentMonth
      ? new Date(now.getTime())
      : new Date(
          `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(
            rangeEndDay
          ).padStart(2, "0")}T23:59:59+09:00`
        ),
    year: targetYear,
    month: targetMonth,
    daysInMonth: lastDay,
  };
}

function lookbackStart(months: number, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - months, 1, -9));
}

function monthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function toNumber(value: Prisma.Decimal | number | string) {
  return Number(value);
}

function effectiveCategory(
  transaction: TransactionWithRelations
) {
  return transaction.manualCategory ?? transaction.category ?? UNCATEGORIZED;
}

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: true;
    manualCategory: true;
    linkedFinancialAccount: true;
  };
}>;

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

function incomeAmount(transaction: TransactionWithRelations) {
  return transaction.direction === TransactionDirection.INCOME
    ? Math.abs(toNumber(transaction.amount))
    : 0;
}

function positiveExpenseAmount(transaction: TransactionWithRelations) {
  return Math.max(0, expenseAmount(transaction));
}

function recurringExpenseKey(transaction: TransactionWithRelations) {
  const name = transaction.merchantName || transaction.description;
  return name?.replace(/\s+/g, " ").trim() ?? "";
}

function detectRecurringExpenses(transactions: TransactionWithRelations[]) {
  const groups = new Map<
    string,
    {
      name: string;
      category: string;
      categoryColor: string;
      amounts: number[];
      days: number[];
      months: Set<string>;
      lastPaidAt: Date;
      source: string;
    }
  >();

  for (const transaction of transactions) {
    const key = recurringExpenseKey(transaction);
    const amount = expenseAmount(transaction);
    if (!key || amount < 1000) {
      continue;
    }

    const category = effectiveCategory(transaction);
    const item = groups.get(key) ?? {
      name: key,
      category: category.name,
      categoryColor: category.color,
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
      item.category = category.name;
      item.categoryColor = category.color;
      item.source = transaction.linkedFinancialAccount.displayName;
    }
    groups.set(key, item);
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
    .map((item) => ({
      name: item.name,
      category: item.category,
      categoryColor: item.categoryColor,
      averageAmount: Math.round(item.averageAmount),
      monthCount: item.monthCount,
      transactionCount: item.transactionCount,
      lastPaidAt: item.lastPaidAt,
      nextExpectedAt: nextExpectedDate(item.lastPaidAt, item.averageDay),
      source: item.source,
    }));
}

async function getRecurringExpenseCandidates(limit?: number) {
  const range = monthRange();
  const transactions = await prisma.transaction.findMany({
    where: {
      occurredAt: { gte: lookbackStart(6), lte: range.end },
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
  const expenses = detectRecurringExpenses(transactions);
  return typeof limit === "number" ? expenses.slice(0, limit) : expenses;
}

function signedExpenseFromGroup(group: {
  direction: TransactionDirection;
  isCanceled: boolean;
  _sum: { amount: Prisma.Decimal | null };
}) {
  const amount = Math.abs(toNumber(group._sum.amount ?? 0));
  if (group.direction === TransactionDirection.REVERSAL || group.isCanceled) {
    return -amount;
  }
  if (group.direction === TransactionDirection.EXPENSE) {
    return amount;
  }
  return 0;
}

export async function getDashboardReport() {
  const range = monthRange();
  const [
    recentTransactions,
    totalGroups,
    categoryGroups,
    sourceGroups,
    merchantGroups,
    recurringExpenseCandidates,
    categories,
    accounts,
    lastSync,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { occurredAt: { gte: range.start, lte: range.end } },
      orderBy: { occurredAt: "desc" },
      include: {
        category: true,
        manualCategory: true,
        linkedFinancialAccount: true,
      },
      take: 8,
    }),
    prisma.transaction.groupBy({
      by: ["direction", "isCanceled"],
      where: { occurredAt: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "manualCategoryId", "direction", "isCanceled"],
      where: { occurredAt: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["linkedFinancialAccountId", "direction", "isCanceled"],
      where: { occurredAt: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["merchantName"],
      where: {
        occurredAt: { gte: range.start, lte: range.end },
        direction: TransactionDirection.EXPENSE,
        isCanceled: false,
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
    getRecurringExpenseCandidates(),
    prisma.category.findMany(),
    prisma.linkedFinancialAccount.findMany(),
    prisma.syncRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
    }),
  ]);

  const categoryLookup = new Map(categories.map((category) => [category.id, category]));
  const accountLookup = new Map(accounts.map((account) => [account.id, account]));
  const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
  const sourceMap = new Map<string, { name: string; amount: number; count: number }>();
  const totalSpend = totalGroups.reduce((sum, group) => sum + signedExpenseFromGroup(group), 0);
  const totalIncome = totalGroups.reduce(
    (sum, group) =>
      group.direction === TransactionDirection.INCOME
        ? sum + Math.abs(toNumber(group._sum.amount ?? 0))
        : sum,
    0
  );

  for (const group of categoryGroups) {
    const spend = signedExpenseFromGroup(group);
    if (spend > 0) {
      const category =
        categoryLookup.get(group.manualCategoryId ?? "") ??
        categoryLookup.get(group.categoryId ?? "") ??
        UNCATEGORIZED;
      const categoryItem = categoryMap.get(category.id) ?? {
        name: category.name,
        amount: 0,
        color: category.color,
      };
      categoryItem.amount += spend;
      categoryMap.set(category.id, categoryItem);
    }
  }

  for (const group of sourceGroups) {
    const account = accountLookup.get(group.linkedFinancialAccountId);
    const sourceName = account?.displayName ?? "알 수 없음";
    const sourceItem = sourceMap.get(sourceName) ?? {
      name: sourceName,
      amount: 0,
      count: 0,
    };
    sourceItem.amount += signedExpenseFromGroup(group);
    sourceItem.count += group._count._all;
    sourceMap.set(sourceName, sourceItem);
  }

  const categorySpending = [...categoryMap.values()].sort((a, b) => b.amount - a.amount);
  const recurringMonthlyTotal = recurringExpenseCandidates.reduce(
    (sum, item) => sum + item.averageAmount,
    0
  );
  const recurringExpenses = recurringExpenseCandidates.slice(0, 5);
  const topMerchants = merchantGroups.map((merchant) => ({
    name: merchant.merchantName || "이름 없음",
    amount: toNumber(merchant._sum.amount ?? 0),
  }));
  const maxRecentAmount = Math.max(
    1,
    ...recentTransactions.map((transaction) => expenseAmount(transaction))
  );
  const dailySpending = recentTransactions
    .map((transaction) => {
      const amount = expenseAmount(transaction);
      return {
        day: new Intl.DateTimeFormat("ko-KR", {
          timeZone: SEOUL_TIME_ZONE,
          month: "2-digit",
          day: "2-digit",
        }).format(transaction.occurredAt),
        amount,
        percent: Math.round((amount / maxRecentAmount) * 100),
      };
    })
    .reverse();

  return {
    range,
    totalSpend,
    totalIncome,
    categorySpending,
    topCategory: categorySpending[0],
    recurringExpenses,
    recurringMonthlyTotal,
    topMerchants,
    sourceSummary: [...sourceMap.values()].sort((a, b) => b.amount - a.amount),
    recentTransactions: recentTransactions.map(formatTransactionRow),
    dailySpending,
    lastSyncAt: lastSync?.finishedAt ?? null,
  };
}

export async function getRecurringExpensesReport() {
  const expenses = await getRecurringExpenseCandidates();
  const monthlyTotal = expenses.reduce((sum, item) => sum + item.averageAmount, 0);
  const categoryMap = new Map<
    string,
    { name: string; color: string; amount: number; count: number }
  >();

  for (const expense of expenses) {
    const category = categoryMap.get(expense.category) ?? {
      name: expense.category,
      color: expense.categoryColor,
      amount: 0,
      count: 0,
    };
    category.amount += expense.averageAmount;
    category.count += 1;
    categoryMap.set(expense.category, category);
  }

  return {
    expenses,
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    categorySummary: [...categoryMap.values()].sort((a, b) => b.amount - a.amount),
  };
}

export async function getInsightsReport() {
  const currentRange = monthRangeWithOffset(0);
  const today = seoulDateParts(new Date());
  const elapsedDays =
    today.year === currentRange.year && today.month === currentRange.month
      ? Math.max(1, today.day)
      : currentRange.daysInMonth;
  const previousRange = monthRangeWithOffset(-1, new Date(), elapsedDays);

  const [currentTransactions, previousTransactions, recurringExpenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { occurredAt: { gte: currentRange.start, lte: currentRange.end } },
      orderBy: { occurredAt: "desc" },
      include: {
        category: true,
        manualCategory: true,
        linkedFinancialAccount: true,
      },
    }),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: previousRange.start, lte: previousRange.end } },
      orderBy: { occurredAt: "desc" },
      include: {
        category: true,
        manualCategory: true,
        linkedFinancialAccount: true,
      },
    }),
    getRecurringExpenseCandidates(),
  ]);

  const currentExpenses = currentTransactions.filter(
    (transaction) => positiveExpenseAmount(transaction) > 0
  );
  const previousExpenses = previousTransactions.filter(
    (transaction) => positiveExpenseAmount(transaction) > 0
  );
  const totalSpend = currentExpenses.reduce(
    (sum, transaction) => sum + positiveExpenseAmount(transaction),
    0
  );
  const previousSpend = previousExpenses.reduce(
    (sum, transaction) => sum + positiveExpenseAmount(transaction),
    0
  );
  const projectedSpend = Math.round((totalSpend / elapsedDays) * currentRange.daysInMonth);
  const recurringMonthlyTotal = recurringExpenses.reduce(
    (sum, expense) => sum + expense.averageAmount,
    0
  );
  const variableSpend = Math.max(0, projectedSpend - recurringMonthlyTotal);

  const categoryMap = new Map<
    string,
    { name: string; color: string; amount: number; previousAmount: number }
  >();
  const merchantMap = new Map<string, { name: string; amount: number; count: number }>();
  const uncategorizedMap = new Map<string, { name: string; amount: number; count: number }>();

  for (const transaction of currentExpenses) {
    const amount = positiveExpenseAmount(transaction);
    const category = effectiveCategory(transaction);
    const categoryItem = categoryMap.get(category.name) ?? {
      name: category.name,
      color: category.color,
      amount: 0,
      previousAmount: 0,
    };
    categoryItem.amount += amount;
    categoryMap.set(category.name, categoryItem);

    const merchantName = transaction.merchantName || transaction.description || "이름 없음";
    const merchantItem = merchantMap.get(merchantName) ?? {
      name: merchantName,
      amount: 0,
      count: 0,
    };
    merchantItem.amount += amount;
    merchantItem.count += 1;
    merchantMap.set(merchantName, merchantItem);

    if (!transaction.categoryId && !transaction.manualCategoryId) {
      const uncategorized = uncategorizedMap.get(merchantName) ?? {
        name: merchantName,
        amount: 0,
        count: 0,
      };
      uncategorized.amount += amount;
      uncategorized.count += 1;
      uncategorizedMap.set(merchantName, uncategorized);
    }
  }

  for (const transaction of previousExpenses) {
    const amount = positiveExpenseAmount(transaction);
    const category = effectiveCategory(transaction);
    const categoryItem = categoryMap.get(category.name) ?? {
      name: category.name,
      color: category.color,
      amount: 0,
      previousAmount: 0,
    };
    categoryItem.previousAmount += amount;
    categoryMap.set(category.name, categoryItem);
  }

  const foodCategory = categoryMap.get("식비");
  const foodSpend = foodCategory?.amount ?? 0;
  const foodDailyAverage = Math.round(foodSpend / elapsedDays);
  const foodProjected = Math.round(foodDailyAverage * currentRange.daysInMonth);
  const topMerchant = [...merchantMap.values()].sort((a, b) => b.amount - a.amount)[0];

  const dayMap = new Map<string, { amount: number; isWeekend: boolean }>();
  for (const transaction of currentExpenses) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: SEOUL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(transaction.occurredAt);
    const day = dayMap.get(key) ?? {
      amount: 0,
      isWeekend: [0, 6].includes(seoulDayOfWeek(transaction.occurredAt)),
    };
    day.amount += positiveExpenseAmount(transaction);
    dayMap.set(key, day);
  }
  const weekdayDays = [...dayMap.values()].filter((day) => !day.isWeekend);
  const weekendDays = [...dayMap.values()].filter((day) => day.isWeekend);
  const weekdayAverage =
    weekdayDays.length > 0
      ? Math.round(weekdayDays.reduce((sum, day) => sum + day.amount, 0) / weekdayDays.length)
      : 0;
  const weekendAverage =
    weekendDays.length > 0
      ? Math.round(weekendDays.reduce((sum, day) => sum + day.amount, 0) / weekendDays.length)
      : 0;

  const categoryInsights = [...categoryMap.values()]
    .map((category) => ({
      ...category,
      delta: category.amount - category.previousAmount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    currentRange,
    previousRange,
    elapsedDays,
    totalSpend,
    previousSpend,
    projectedSpend,
    spendDelta: totalSpend - previousSpend,
    foodSpend,
    foodDailyAverage,
    foodProjected,
    recurringMonthlyTotal,
    variableSpend,
    recurringRatio:
      projectedSpend > 0 ? Math.round((recurringMonthlyTotal / projectedSpend) * 100) : 0,
    topMerchant: topMerchant
      ? {
          ...topMerchant,
          share: totalSpend > 0 ? Math.round((topMerchant.amount / totalSpend) * 100) : 0,
        }
      : null,
    weekdayAverage,
    weekendAverage,
    categoryInsights,
    uncategorizedCount: [...uncategorizedMap.values()].reduce((sum, item) => sum + item.count, 0),
    uncategorizedAmount: [...uncategorizedMap.values()].reduce((sum, item) => sum + item.amount, 0),
    uncategorizedMerchants: [...uncategorizedMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  };
}

export async function getTransactionsReport() {
  const range = monthRange();
  const pageSize = 300;
  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { occurredAt: { gte: range.start, lte: range.end } },
      orderBy: { occurredAt: "desc" },
      include: {
        category: true,
        manualCategory: true,
        linkedFinancialAccount: true,
      },
      take: pageSize,
    }),
    prisma.transaction.count({
      where: { occurredAt: { gte: range.start, lte: range.end } },
    }),
  ]);

  return {
    range,
    transactions: transactions.map(formatTransactionRow),
    totalCount,
    pageSize,
  };
}

export async function getCategoriesReport() {
  const [categories, rules] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            autoTransactions: true,
            manualTransactions: true,
            rules: true,
          },
        },
      },
    }),
    prisma.categoryRule.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: { category: true },
    }),
  ]);

  return { categories, rules };
}

export async function getSyncReport() {
  const range = monthRange();
  const [runs, accounts] = await Promise.all([
    prisma.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 12,
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.linkedFinancialAccount.findMany({
      where: { isActive: true },
      orderBy: [{ sourceKind: "asc" }, { displayName: "asc" }],
    }),
  ]);

  return { range, runs, accounts };
}

function formatTransactionRow(transaction: TransactionWithRelations) {
  const category = effectiveCategory(transaction);
  return {
    id: transaction.id,
    occurredAt: transaction.occurredAt,
    dateTime: new Intl.DateTimeFormat("ko-KR", {
      timeZone: SEOUL_TIME_ZONE,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(transaction.occurredAt),
    name: transaction.merchantName || transaction.description || "이름 없음",
    category: category.name,
    categoryColor: category.color,
    amount: toNumber(transaction.amount),
    direction: transaction.direction,
    source: transaction.linkedFinancialAccount.displayName,
    isCanceled: transaction.isCanceled,
  };
}
