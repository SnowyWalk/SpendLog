import { Target } from "lucide-react";
import { saveMonthlyBudgetSetting } from "@/app/settings/actions";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getDashboardReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { budgetReport } = await getDashboardReport();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground">
          월 목표 지출과 서버 운영 값을 관리합니다.
        </p>
      </div>

      <BudgetProgress report={budgetReport} />

      <Card>
        <CardHeader>
          <CardTitle>월 목표 지출</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveMonthlyBudgetSetting} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
            <input
              value={budgetReport.label}
              readOnly
              className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
            <input
              name="targetAmount"
              type="number"
              min="0"
              step="1000"
              defaultValue={budgetReport.targetAmount ?? 0}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="월 목표 지출"
            />
            <Button type="submit">
              <Target className="h-4 w-4" />
              저장
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            0원으로 저장하면 목표 없이 현재 지출과 월말 예상액만 추적합니다.
            현재 지출은 {formatCurrency(budgetReport.spentAmount)}입니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>서버 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>CODEF 자격증명은 클라이언트에 노출하지 않습니다.</p>
          <p>Postgres 백업/복원 절차는 배포 문서에서 관리합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
