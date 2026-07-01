export type BudgetStatus = "no-target" | "zero-target" | "on-track" | "watch" | "over";

export type MonthlyBudgetMathInput = {
  targetAmount: number | null;
  spentAmount: number;
  projectedAmount: number;
  recurringAmount: number;
  elapsedDays: number;
  daysInMonth: number;
};

export function calculateMonthlyBudget(input: MonthlyBudgetMathInput) {
  const elapsedDays = Math.max(1, input.elapsedDays);
  const daysInMonth = Math.max(elapsedDays, input.daysInMonth);
  const remainingDays = Math.max(1, daysInMonth - elapsedDays + 1);
  const targetAmount = input.targetAmount;

  if (targetAmount === null) {
    return {
      status: "no-target" as BudgetStatus,
      targetAmount,
      spentAmount: input.spentAmount,
      projectedAmount: input.projectedAmount,
      recurringAmount: input.recurringAmount,
      remainingAmount: null,
      dailyAllowance: null,
      variableDailyAllowance: null,
      spentRatio: 0,
      projectedRatio: 0,
      progressPercent: 0,
      remainingDays,
    };
  }

  if (targetAmount === 0) {
    return {
      status: "zero-target" as BudgetStatus,
      targetAmount,
      spentAmount: input.spentAmount,
      projectedAmount: input.projectedAmount,
      recurringAmount: input.recurringAmount,
      remainingAmount: null,
      dailyAllowance: null,
      variableDailyAllowance: null,
      spentRatio: 0,
      projectedRatio: 0,
      progressPercent: 0,
      remainingDays,
    };
  }

  const remainingAmount = targetAmount - input.spentAmount;
  const dailyAllowance = remainingAmount / remainingDays;
  const variableRemainingAmount = targetAmount - input.recurringAmount - input.spentAmount;
  const variableDailyAllowance = variableRemainingAmount / remainingDays;
  const spentRatio = input.spentAmount / targetAmount;
  const projectedRatio = input.projectedAmount / targetAmount;
  const status: BudgetStatus =
    spentRatio >= 1 ? "over" : projectedRatio > 1 ? "watch" : "on-track";

  return {
    status,
    targetAmount,
    spentAmount: input.spentAmount,
    projectedAmount: input.projectedAmount,
    recurringAmount: input.recurringAmount,
    remainingAmount,
    dailyAllowance,
    variableDailyAllowance,
    spentRatio,
    projectedRatio,
    progressPercent: Math.min(100, Math.max(0, Math.round(spentRatio * 100))),
    remainingDays,
  };
}
