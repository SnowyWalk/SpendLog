import { TransactionDirection, type Prisma } from "@prisma/client";
import { seoulDateParts, seoulDayOfWeek } from "@/lib/recurring/date";
import { isCommuteLikeTransitText } from "@/lib/transport/commute-patterns";

export const COMMUTE_DAYS_PER_MONTH = 23.7;

export type CommuteConfidence = "none" | "low" | "medium" | "high";

export type CommuteTransaction = {
  occurredAt: Date;
  merchantName?: string | null;
  description?: string | null;
  amount: Prisma.Decimal | number | string;
  direction: TransactionDirection;
  isCanceled: boolean;
};

export type CommuteReport = {
  averageCommuteDayCost: number;
  monthlyEstimate: number;
  yearlyEstimate: number;
  sampleDays: number;
  sampleMonths: number;
  projectionCommuteDaysPerMonth: number;
  confidence: CommuteConfidence;
  confidenceReason: string;
  observedAverageCommuteDaysPerMonth: number;
};

type DayTotal = {
  dateKey: string;
  monthKey: string;
  amount: number;
};

function toNumber(value: Prisma.Decimal | number | string) {
  return Number(value);
}

function expenseAmount(transaction: CommuteTransaction) {
  if (transaction.direction !== TransactionDirection.EXPENSE || transaction.isCanceled) {
    return 0;
  }
  return Math.abs(toNumber(transaction.amount));
}

function seoulDateKey(date: Date) {
  const parts = seoulDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(
    2,
    "0"
  )}`;
}

function nearestRankPercentile(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(percentile * sortedValues.length) - 1)
  );
  return sortedValues[index];
}

function coefficientOfVariation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) {
    return 0;
  }

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function emptyReport(reason = "출퇴근성 대중교통 거래가 충분하지 않습니다."): CommuteReport {
  return {
    averageCommuteDayCost: 0,
    monthlyEstimate: 0,
    yearlyEstimate: 0,
    sampleDays: 0,
    sampleMonths: 0,
    projectionCommuteDaysPerMonth: COMMUTE_DAYS_PER_MONTH,
    confidence: "none",
    confidenceReason: reason,
    observedAverageCommuteDaysPerMonth: 0,
  };
}

function confidenceFor(values: number[], sampleMonths: number): Pick<
  CommuteReport,
  "confidence" | "confidenceReason"
> {
  if (values.length === 0) {
    return {
      confidence: "none",
      confidenceReason: "출퇴근성 대중교통 거래가 없습니다.",
    };
  }
  if (values.length < 8 || sampleMonths < 2) {
    return {
      confidence: "low",
      confidenceReason: "표본 일수나 포함된 월 수가 적어 낮은 신뢰도로 표시합니다.",
    };
  }

  const variation = coefficientOfVariation(values);
  if (values.length >= 18 && sampleMonths >= 3 && variation <= 0.35) {
    return {
      confidence: "high",
      confidenceReason: "여러 달에 걸친 출퇴근성 교통비가 안정적으로 반복됩니다.",
    };
  }

  return {
    confidence: "medium",
    confidenceReason: "출퇴근성 교통비 표본은 충분하지만 변동성이 있어 중간 신뢰도로 표시합니다.",
  };
}

export function detectCommuteTransport(transactions: CommuteTransaction[]): CommuteReport {
  const dayMap = new Map<string, DayTotal>();

  for (const transaction of transactions) {
    const amount = expenseAmount(transaction);
    if (amount <= 0 || !isCommuteLikeTransitText(transaction)) {
      continue;
    }
    if ([0, 6].includes(seoulDayOfWeek(transaction.occurredAt))) {
      continue;
    }

    const dateKey = seoulDateKey(transaction.occurredAt);
    const monthKey = dateKey.slice(0, 7);
    const day = dayMap.get(dateKey) ?? { dateKey, monthKey, amount: 0 };
    day.amount += amount;
    dayMap.set(dateKey, day);
  }

  const candidateDays = [...dayMap.values()]
    .filter((day) => day.amount >= 1_000 && day.amount <= 25_000)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (candidateDays.length === 0) {
    return emptyReport();
  }

  let retainedDays = candidateDays;
  if (candidateDays.length >= 8) {
    const sortedAmounts = candidateDays.map((day) => day.amount).sort((a, b) => a - b);
    const p10 = nearestRankPercentile(sortedAmounts, 0.1);
    const p90 = nearestRankPercentile(sortedAmounts, 0.9);
    retainedDays = candidateDays.filter((day) => day.amount >= p10 && day.amount <= p90);
  }

  if (retainedDays.length === 0) {
    return emptyReport("출퇴근성 대중교통 거래가 이상치 필터 이후 남지 않았습니다.");
  }

  const amounts = retainedDays.map((day) => day.amount);
  const sampleMonths = new Set(retainedDays.map((day) => day.monthKey)).size;
  const averageCommuteDayCost = Math.round(
    amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
  );
  const monthlyEstimate = Math.round(averageCommuteDayCost * COMMUTE_DAYS_PER_MONTH);
  const { confidence, confidenceReason } = confidenceFor(amounts, sampleMonths);

  return {
    averageCommuteDayCost,
    monthlyEstimate,
    yearlyEstimate: monthlyEstimate * 12,
    sampleDays: amounts.length,
    sampleMonths,
    projectionCommuteDaysPerMonth: COMMUTE_DAYS_PER_MONTH,
    confidence,
    confidenceReason,
    observedAverageCommuteDaysPerMonth: Math.round((amounts.length / sampleMonths) * 10) / 10,
  };
}
