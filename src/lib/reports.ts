import "server-only";
import { TransactionDirection, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

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
    topMerchants,
    sourceSummary: [...sourceMap.values()].sort((a, b) => b.amount - a.amount),
    recentTransactions: recentTransactions.map(formatTransactionRow),
    dailySpending,
    lastSyncAt: lastSync?.finishedAt ?? null,
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
