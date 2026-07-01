import "server-only";
import { prisma } from "@/lib/db/prisma";
import { seoulDateParts } from "@/lib/recurring/date";
import { calculateMonthlyBudget } from "./math";

export function currentSeoulMonthKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

export function seoulMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year}년 ${monthNumber}월`;
}

export async function getMonthlyBudgetReport(input: {
  totalSpend: number;
  projectedSpend: number;
  recurringMonthlyTotal: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const month = currentSeoulMonthKey(now);
  const today = seoulDateParts(now);
  const daysInMonth = new Date(Date.UTC(today.year, today.month, 0)).getUTCDate();
  const setting = await prisma.monthlyBudgetSetting.findUnique({ where: { month } });
  const targetAmount = setting ? Number(setting.targetAmount) : null;

  return {
    month,
    label: seoulMonthLabel(month),
    ...calculateMonthlyBudget({
      targetAmount,
      spentAmount: input.totalSpend,
      projectedAmount: input.projectedSpend,
      recurringAmount: input.recurringMonthlyTotal,
      elapsedDays: today.day,
      daysInMonth,
    }),
  };
}
