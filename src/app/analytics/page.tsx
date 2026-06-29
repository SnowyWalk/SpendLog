import { SpendingBars } from "@/components/dashboard/spending-bars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageSession } from "@/lib/auth/page-guard";
import { formatCurrency } from "@/lib/format";
import { getDashboardReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requirePageSession();
  const { categorySpending, topMerchants, sourceSummary, totalSpend, range } =
    await getDashboardReport();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">소비 분석</h1>
        <p className="text-sm text-muted-foreground">
          {range.label} 카테고리, 가맹점, 결제 수단별 집중도를 확인합니다.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>카테고리 집중도</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingBars items={categorySpending} total={totalSpend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>가맹점 집중도</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMerchants.length === 0 ? (
              <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                분석할 지출 데이터가 없습니다.
              </div>
            ) : topMerchants.map((merchant) => (
              <div
                key={merchant.name}
                className="flex justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{merchant.name}</span>
                <span className="font-medium">
                  {Math.round((merchant.amount / Math.max(totalSpend, 1)) * 100)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>결제 수단별 금액</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceSummary.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{source.name}</span>
                <span className="font-medium">{formatCurrency(source.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
