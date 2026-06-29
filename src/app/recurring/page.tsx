import { CalendarClock, Repeat2, WalletCards } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SpendingBars } from "@/components/dashboard/spending-bars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getRecurringExpensesReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function RecurringExpensesPage() {
  const { expenses, monthlyTotal, yearlyTotal, categorySummary } =
    await getRecurringExpensesReport();
  const nextExpense = [...expenses].sort(
    (a, b) => a.nextExpectedAt.getTime() - b.nextExpectedAt.getTime()
  )[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">고정지출</h1>
        <p className="text-sm text-muted-foreground">
          최근 6개월 거래에서 반복 결제를 자동으로 감지합니다.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={Repeat2}
          label="월 예상 고정지출"
          value={formatCurrency(monthlyTotal)}
          helper={`${expenses.length}개 반복 결제 후보`}
        />
        <MetricCard
          icon={WalletCards}
          label="연 예상 고정지출"
          value={formatCurrency(yearlyTotal)}
          helper="월 예상액 기준 단순 환산"
        />
        <MetricCard
          icon={CalendarClock}
          label="다음 결제"
          value={nextExpense ? formatDate(nextExpense.nextExpectedAt) : "-"}
          helper={nextExpense?.name ?? "예상 결제 없음"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>반복 결제 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="rounded-md border px-3 py-8 text-center text-sm text-muted-foreground">
                  아직 고정지출로 볼 만한 반복 결제가 없습니다.
                </div>
              ) : expenses.map((expense) => (
                <div
                  key={expense.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{expense.name}</div>
                    <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: expense.categoryColor }}
                        />
                        <span className="truncate">{expense.category}</span>
                      </span>
                      <span>{expense.source}</span>
                      <span>{expense.monthCount}개월 반복</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold">{formatCurrency(expense.averageAmount)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      다음 {formatDate(expense.nextExpectedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>카테고리별 고정지출</CardTitle>
          </CardHeader>
          <CardContent>
            {categorySummary.length === 0 ? (
              <div className="rounded-md border px-3 py-8 text-center text-sm text-muted-foreground">
                카테고리별로 정리할 고정지출이 없습니다.
              </div>
            ) : (
              <SpendingBars
                items={categorySummary.map((item) => ({
                  name: `${item.name} · ${item.count}개`,
                  amount: item.amount,
                  color: item.color,
                }))}
                total={monthlyTotal}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
