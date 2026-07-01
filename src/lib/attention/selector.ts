import type { BudgetStatus } from "@/lib/budget/math";

export type AttentionTone = "danger" | "warning" | "info";

export type AttentionItem = {
  id: string;
  type:
    | "sync-failed"
    | "sync-stale"
    | "budget-over"
    | "budget-watch"
    | "upcoming-recurring"
    | "uncategorized";
  title: string;
  description: string;
  href: string;
  severity: number;
  tone: AttentionTone;
};

export type AttentionBudgetInput = {
  status: BudgetStatus;
  targetAmount: number | null;
  spentAmount: number;
  projectedAmount: number;
  remainingAmount: number | null;
};

export type AttentionRecurringInput = {
  name: string;
  amount: number;
  nextExpectedAt: Date;
};

export type AttentionSyncInput = {
  latestStatus: "RUNNING" | "SUCCESS" | "FAILED" | null;
  latestErrorMessage: string | null;
  lastSuccessAt: Date | null;
};

export type AttentionUncategorizedInput = {
  count: number;
  amount: number;
  topMerchantName: string | null;
};

export type BuildAttentionItemsInput = {
  now: Date;
  budget: AttentionBudgetInput;
  recurring: AttentionRecurringInput[];
  sync: AttentionSyncInput;
  uncategorized: AttentionUncategorizedInput;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

function pushIf<T>(items: T[], condition: boolean, item: T) {
  if (condition) {
    items.push(item);
  }
}

export function buildAttentionItems(input: BuildAttentionItemsInput) {
  const items: AttentionItem[] = [];
  const syncAgeDays = input.sync.lastSuccessAt
    ? Math.floor((input.now.getTime() - input.sync.lastSuccessAt.getTime()) / DAY_MS)
    : null;
  const nextRecurring = [...input.recurring]
    .filter((item) => daysUntil(item.nextExpectedAt, input.now) >= 0)
    .sort((a, b) => a.nextExpectedAt.getTime() - b.nextExpectedAt.getTime())[0];
  const nextRecurringDays = nextRecurring
    ? daysUntil(nextRecurring.nextExpectedAt, input.now)
    : null;

  pushIf(items, input.sync.latestStatus === "FAILED", {
    id: "sync-failed",
    type: "sync-failed",
    title: "최근 동기화 실패",
    description: input.sync.latestErrorMessage
      ? `마지막 오류: ${input.sync.latestErrorMessage}`
      : "동기화 이력을 확인해 주세요.",
    href: "/sync",
    severity: 100,
    tone: "danger",
  });

  pushIf(
    items,
    input.sync.latestStatus !== "FAILED" &&
      input.sync.latestStatus !== "RUNNING" &&
      (input.sync.lastSuccessAt === null || (syncAgeDays !== null && syncAgeDays >= 2)),
    {
      id: "sync-stale",
      type: "sync-stale",
      title: "동기화 확인 필요",
      description:
        syncAgeDays === null
          ? "아직 성공한 동기화가 없습니다."
          : `마지막 성공 후 ${syncAgeDays}일이 지났습니다.`,
      href: "/sync",
      severity: 90,
      tone: "warning",
    }
  );

  pushIf(items, input.budget.status === "over", {
    id: "budget-over",
    type: "budget-over",
    title: "월 목표를 초과했습니다",
    description: `${formatWon(input.budget.spentAmount)} 사용, 목표 ${formatWon(
      input.budget.targetAmount ?? 0
    )}`,
    href: "/insights",
    severity: 80,
    tone: "danger",
  });

  pushIf(items, input.budget.status === "watch", {
    id: "budget-watch",
    type: "budget-watch",
    title: "월말 예상 지출이 목표를 넘습니다",
    description: `예상 ${formatWon(input.budget.projectedAmount)} · 남은 예산 ${formatWon(
      input.budget.remainingAmount ?? 0
    )}`,
    href: "/insights",
    severity: 70,
    tone: "warning",
  });

  if (nextRecurring && nextRecurringDays !== null && nextRecurringDays <= 7) {
    items.push({
      id: `upcoming-recurring:${nextRecurring.name}`,
      type: "upcoming-recurring",
      title: "이번 주 고정지출 예정",
      description: `${nextRecurring.name} · ${formatWon(nextRecurring.amount)} · ${
        nextRecurringDays === 0 ? "오늘" : `${nextRecurringDays}일 후`
      }`,
      href: "/recurring",
      severity: 60,
      tone: "info",
    });
  }

  pushIf(items, input.uncategorized.count > 0, {
    id: "uncategorized",
    type: "uncategorized",
    title: "정리할 미분류 거래",
    description: `${input.uncategorized.count}건 · ${formatWon(input.uncategorized.amount)}${
      input.uncategorized.topMerchantName ? ` · ${input.uncategorized.topMerchantName}` : ""
    }`,
    href: "/transactions?uncategorized=1",
    severity: 50,
    tone: "info",
  });

  return items.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
}
