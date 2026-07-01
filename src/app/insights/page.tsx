import {
  AlertCircle,
  Beef,
  Bus,
  Gauge,
  PieChart,
  Store,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SpendingBars } from "@/components/dashboard/spending-bars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getInsightsReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

function signedCurrency(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
}

export default async function InsightsPage() {
  const report = await getInsightsReport();
  const hasBudgetTarget = report.budgetReport.targetAmount !== null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">인사이트</h1>
        <p className="text-sm text-muted-foreground">
          평균 식비, 월말 예상 지출, 전월 대비 변화, 미분류 정리 대상을 자동으로 계산합니다.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Gauge}
          label="월말 예상 지출"
          value={formatCurrency(report.projectedSpend)}
          helper={`${report.elapsedDays}일 기준 현재 ${formatCurrency(report.totalSpend)}`}
        />
        <MetricCard
          icon={Target}
          label="목표 대비"
          value={hasBudgetTarget ? `${report.budgetReport.progressPercent}%` : "미설정"}
          helper={
            hasBudgetTarget && report.budgetReport.targetAmount === 0
              ? "기록 전용 모드"
              : hasBudgetTarget
              ? `남은 예산 ${formatCurrency(report.budgetReport.remainingAmount ?? 0)}`
              : "설정에서 월 목표를 지정"
          }
        />
        <MetricCard
          icon={Beef}
          label="평균 식비"
          value={formatCurrency(report.foodDailyAverage)}
          helper={`월 예상 ${formatCurrency(report.foodProjected)}`}
        />
        <MetricCard
          icon={WalletCards}
          label="고정/변동 비중"
          value={`${report.recurringRatio}%`}
          helper={`고정 ${formatCurrency(report.recurringMonthlyTotal)} · 변동 ${formatCurrency(report.variableSpend)}`}
        />
        <MetricCard
          icon={TrendingUp}
          label="전월 대비"
          value={signedCurrency(report.spendDelta)}
          helper={`${report.previousRange.label} ${formatCurrency(report.previousSpend)}`}
        />
      </section>

      <BudgetProgress report={report.budgetReport} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>카테고리 변화</CardTitle>
          </CardHeader>
          <CardContent>
            {report.categoryInsights.length === 0 ? (
              <div className="rounded-md border px-3 py-8 text-center text-sm text-muted-foreground">
                비교할 지출 데이터가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                <SpendingBars
                  items={report.categoryInsights.map((category) => ({
                    name: category.name,
                    amount: category.amount,
                    color: category.color,
                  }))}
                  total={report.totalSpend}
                />
                <div className="space-y-2">
                  {report.categoryInsights.slice(0, 5).map((category) => (
                    <div
                      key={category.name}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{category.name}</div>
                        <div className="text-xs text-muted-foreground">
                          전월 {formatCurrency(category.previousAmount)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-medium">{formatCurrency(category.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {signedCurrency(category.delta)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>출퇴근 교통비 추정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
                <Bus className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium">
                    {formatCurrency(report.commuteReport.monthlyEstimate)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    1회 출퇴근 평균{" "}
                    {formatCurrency(report.commuteReport.averageCommuteDayCost)} x{" "}
                    {report.commuteReport.projectionCommuteDaysPerMonth}일
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {report.commuteReport.confidence === "none"
                      ? "후불교통, 티머니, 버스, 지하철 거래가 충분히 쌓이면 자동으로 추정합니다."
                      : `${report.commuteReport.sampleMonths}개월 · ${report.commuteReport.sampleDays}일 표본 · 신뢰도 ${report.commuteReport.confidence}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>지출 집중도</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
                <Store className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium">
                    {report.topMerchant ? report.topMerchant.name : "상위 가맹점 없음"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {report.topMerchant
                      ? `이번 달 지출의 ${report.topMerchant.share}% · ${formatCurrency(report.topMerchant.amount)}`
                      : "동기화 후 표시됩니다."}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
                <PieChart className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">주중/주말 평균</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    주중 {formatCurrency(report.weekdayAverage)} · 주말 {formatCurrency(report.weekendAverage)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>정리 필요 거래</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    미분류 {report.uncategorizedCount}건 · {formatCurrency(report.uncategorizedAmount)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    자주 나오는 항목은 카테고리 규칙으로 등록하면 다음 동기화부터 자동 분류됩니다.
                  </div>
                </div>
              </div>
              {report.uncategorizedMerchants.length > 0 && (
                <div className="space-y-2">
                  {report.uncategorizedMerchants.map((merchant) => (
                    <div
                      key={merchant.name}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{merchant.name}</div>
                        <div className="text-xs text-muted-foreground">{merchant.count}건</div>
                      </div>
                      <div className="shrink-0 font-medium">{formatCurrency(merchant.amount)}</div>
                    </div>
                  ))}
                  <Link
                    href="/transactions?uncategorized=1"
                    className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                  >
                    미분류 거래 정리
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
