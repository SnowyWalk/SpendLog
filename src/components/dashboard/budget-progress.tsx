import { Gauge } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type BudgetProgressProps = {
  report: {
    status: "no-target" | "zero-target" | "on-track" | "watch" | "over";
    label: string;
    targetAmount: number | null;
    spentAmount: number;
    projectedAmount: number;
    remainingAmount: number | null;
    dailyAllowance: number | null;
    variableDailyAllowance: number | null;
    progressPercent: number;
    remainingDays: number;
  };
};

function statusLabel(status: BudgetProgressProps["report"]["status"]) {
  if (status === "no-target") return "목표 없음";
  if (status === "zero-target") return "기록 전용";
  if (status === "over") return "목표 초과";
  if (status === "watch") return "속도 주의";
  return "정상 범위";
}

export function BudgetProgress({ report }: BudgetProgressProps) {
  const hasTarget = report.targetAmount !== null && report.targetAmount > 0;
  const barColor =
    report.status === "over"
      ? "bg-destructive"
      : report.status === "watch"
        ? "bg-secondary"
        : "bg-primary";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span>{report.label} 목표 지출</span>
          </div>
          <div className="mt-1 text-xl font-semibold">
            {hasTarget
              ? `${formatCurrency(report.spentAmount)} / ${formatCurrency(report.targetAmount ?? 0)}`
              : formatCurrency(report.spentAmount)}
          </div>
        </div>
        <div className="shrink-0 rounded-md border px-3 py-2 text-sm">
          <div className="font-medium">{statusLabel(report.status)}</div>
          <div className="text-xs text-muted-foreground">
            월말 예상 {formatCurrency(report.projectedAmount)}
          </div>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-sm bg-muted">
        <div
          className={`h-full rounded-sm ${barColor}`}
          style={{ width: `${hasTarget ? report.progressPercent : 0}%` }}
        />
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="text-xs text-muted-foreground">남은 예산</div>
          <div className="font-medium">
            {report.remainingAmount === null ? "-" : formatCurrency(report.remainingAmount)}
          </div>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="text-xs text-muted-foreground">하루 사용 가능</div>
          <div className="font-medium">
            {report.dailyAllowance === null ? "-" : formatCurrency(report.dailyAllowance)}
          </div>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="text-xs text-muted-foreground">고정지출 제외 하루치</div>
          <div className="font-medium">
            {report.variableDailyAllowance === null
              ? "-"
              : formatCurrency(report.variableDailyAllowance)}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        남은 {report.remainingDays}일 기준으로 계산합니다.
      </p>
    </div>
  );
}
