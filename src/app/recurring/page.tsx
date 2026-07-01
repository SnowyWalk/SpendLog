import { CalendarClock, Check, EyeOff, Repeat2, RotateCcw, Trash2, WalletCards } from "lucide-react";
import {
  confirmDetectedRecurringExpense,
  createManualRecurringExpense,
  deactivateRecurringExpenseRule,
  excludeDetectedRecurringExpense,
  restoreRecurringExpense,
  updateManualRecurringExpense,
} from "@/app/recurring/actions";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SpendingBars } from "@/components/dashboard/spending-bars";
import { Button } from "@/components/ui/button";
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

function sourceLabel(sourceType: "detected" | "manual" | "confirmed") {
  if (sourceType === "manual") return "직접 등록";
  if (sourceType === "confirmed") return "확정";
  return "자동 감지";
}

export default async function RecurringExpensesPage() {
  const { expenses, excluded, monthlyTotal, yearlyTotal, categorySummary, categories } =
    await getRecurringExpensesReport();
  const nextExpense = [...expenses].sort(
    (a, b) => a.nextExpectedAt.getTime() - b.nextExpectedAt.getTime()
  )[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">고정지출</h1>
        <p className="text-sm text-muted-foreground">
          반복 결제를 자동 감지하고, 직접 등록한 항목과 제외한 항목을 함께 관리합니다.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={Repeat2}
          label="월 예상 고정지출"
          value={formatCurrency(monthlyTotal)}
          helper={`${expenses.length}개 관리 항목`}
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
            <CardTitle>직접 고정지출 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createManualRecurringExpense} className="grid gap-2 md:grid-cols-6">
              <input
                name="displayName"
                required
                placeholder="항목명"
                className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
              />
              <input
                name="expectedAmount"
                required
                type="number"
                min="0"
                step="100"
                placeholder="월 예상액"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <input
                name="expectedDay"
                required
                type="number"
                min="1"
                max="31"
                placeholder="결제일"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <select
                name="categoryId"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">미분류</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button type="submit">추가</Button>
              <input
                name="sourceHint"
                placeholder="출처 메모"
                className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
              />
              <input
                name="note"
                placeholder="메모"
                className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
              />
            </form>
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

      <Card>
        <CardHeader>
          <CardTitle>고정지출 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenses.length === 0 ? (
              <div className="rounded-md border px-3 py-8 text-center text-sm text-muted-foreground">
                아직 관리 중인 고정지출이 없습니다.
              </div>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="grid gap-3 rounded-md border px-3 py-3 text-sm lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  {expense.sourceType === "manual" ? (
                    <form
                      action={updateManualRecurringExpense}
                      className="grid min-w-0 gap-2 md:grid-cols-6"
                    >
                      <input type="hidden" name="id" value={expense.ruleId ?? ""} />
                      <input
                        name="displayName"
                        defaultValue={expense.name}
                        className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
                      />
                      <input
                        name="expectedAmount"
                        type="number"
                        min="0"
                        step="100"
                        defaultValue={expense.averageAmount}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <input
                        name="expectedDay"
                        type="number"
                        min="1"
                        max="31"
                        defaultValue={expense.expectedDay ?? 1}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <select
                        name="categoryId"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        defaultValue={expense.categoryId ?? ""}
                      >
                        <option value="">미분류</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="secondary">
                        저장
                      </Button>
                      <input
                        name="sourceHint"
                        defaultValue={expense.source}
                        className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
                      />
                      <input
                        name="note"
                        defaultValue={expense.note ?? ""}
                        className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
                      />
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div className="truncate font-medium">{expense.name}</div>
                        <span className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {sourceLabel(expense.sourceType)}
                        </span>
                      </div>
                      <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: expense.categoryColor }}
                          />
                          <span className="truncate">{expense.category}</span>
                        </span>
                        <span>{expense.source}</span>
                        <span>
                          {expense.monthCount > 0
                            ? `${expense.monthCount}개월 반복`
                            : "직접 확정"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                    <div className="shrink-0 text-right">
                      <div className="font-semibold">{formatCurrency(expense.averageAmount)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        다음 {formatDate(expense.nextExpectedAt)}
                      </div>
                    </div>
                    {expense.sourceType === "detected" && (
                      <>
                        <form action={confirmDetectedRecurringExpense}>
                          <input type="hidden" name="matchKey" value={expense.matchKey} />
                          <input type="hidden" name="displayName" value={expense.name} />
                          <input
                            type="hidden"
                            name="expectedAmount"
                            value={expense.averageAmount}
                          />
                          <input
                            type="hidden"
                            name="expectedDay"
                            value={expense.expectedDay ?? 1}
                          />
                          <input
                            type="hidden"
                            name="categoryId"
                            value={expense.categoryId ?? ""}
                          />
                          <input type="hidden" name="sourceHint" value={expense.source} />
                          <Button type="submit" variant="outline">
                            <Check className="h-4 w-4" />
                            확정
                          </Button>
                        </form>
                        <form action={excludeDetectedRecurringExpense}>
                          <input type="hidden" name="matchKey" value={expense.matchKey} />
                          <input type="hidden" name="displayName" value={expense.name} />
                          <input
                            type="hidden"
                            name="expectedAmount"
                            value={expense.averageAmount}
                          />
                          <input
                            type="hidden"
                            name="expectedDay"
                            value={expense.expectedDay ?? 1}
                          />
                          <input
                            type="hidden"
                            name="categoryId"
                            value={expense.categoryId ?? ""}
                          />
                          <input type="hidden" name="sourceHint" value={expense.source} />
                          <Button type="submit" variant="ghost">
                            <EyeOff className="h-4 w-4" />
                            제외
                          </Button>
                        </form>
                      </>
                    )}
                    {expense.ruleId && (
                      <form action={deactivateRecurringExpenseRule}>
                        <input type="hidden" name="id" value={expense.ruleId} />
                        <Button type="submit" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                          비활성화
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {excluded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>제외한 자동 감지 항목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {excluded.map((expense) => (
              <div
                key={expense.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{expense.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {expense.category} · {formatCurrency(expense.averageAmount)}
                  </div>
                </div>
                <form action={restoreRecurringExpense}>
                  <input type="hidden" name="id" value={expense.exclusionRuleId} />
                  <Button type="submit" variant="outline">
                    <RotateCcw className="h-4 w-4" />
                    복원
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
