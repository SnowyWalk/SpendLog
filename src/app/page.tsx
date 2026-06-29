import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SpendingBars } from "@/components/dashboard/spending-bars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageSession } from "@/lib/auth/page-guard";
import { formatCurrency } from "@/lib/format";
import { getDashboardReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageSession();
  const {
    range,
    totalSpend,
    totalIncome,
    topCategory,
    categorySpending,
    sourceSummary,
    topMerchants,
    recentTransactions,
    dailySpending,
    lastSyncAt,
  } = await getDashboardReport();
  const transport = categorySpending.find((item) => item.name === "교통")?.amount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">통합가계부</h1>
          <p className="text-sm text-muted-foreground">
            {range.label} 기준 소비 흐름
          </p>
        </div>
        <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          {lastSyncAt ? `마지막 동기화 ${lastSyncAt.toLocaleString("ko-KR")}` : "동기화 대기 중"}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ArrowDownRight}
          label="이번 달 지출"
          value={formatCurrency(totalSpend)}
          helper="카드 승인 + 계좌 출금 기준"
        />
        <MetricCard
          icon={ArrowUpRight}
          label="입금/환급"
          value={formatCurrency(totalIncome)}
          helper="급여, 환급, 이체 제외 전"
        />
        <MetricCard
          icon={TrendingUp}
          label="상위 카테고리"
          value={topCategory?.name ?? "미분류"}
          helper={topCategory ? `${formatCurrency(topCategory.amount)} 사용` : "분류된 지출 없음"}
        />
        <MetricCard
          icon={CreditCard}
          label="교통비"
          value={formatCurrency(transport)}
          helper="후불교통 승인 포함"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingBars items={categorySpending} total={totalSpend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceSummary.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{source.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {source.count}건
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(source.amount)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>상위 가맹점</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
            {topMerchants.length === 0 ? (
              <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                아직 동기화된 지출이 없습니다.
              </div>
            ) : topMerchants.map((merchant, index) => (
                <div
                  key={merchant.name}
                  className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="text-muted-foreground">{index + 1}</div>
                  <div>{merchant.name}</div>
                  <div className="font-medium">{formatCurrency(merchant.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 거래</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTransactions.length === 0 ? (
                <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                  최근 거래가 없습니다.
                </div>
              ) : recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[20px_1fr_auto] items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{transaction.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {transaction.dateTime} · {transaction.category}
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>일별 지출 흐름</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dailySpending.length === 0 ? (
              <div className="col-span-7 rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                일별 지출 그래프는 거래 동기화 후 표시됩니다.
              </div>
            ) : dailySpending.map((day) => (
              <div key={day.day} className="space-y-2">
                <div className="flex h-32 items-end rounded-md bg-muted p-1">
                  <div
                    className="w-full rounded-sm bg-primary"
                    style={{ height: `${Math.max(8, day.percent)}%` }}
                  />
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  {day.day}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
