import { RefreshCw } from "lucide-react";
import { runManualSync } from "@/app/sync/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageSession } from "@/lib/auth/page-guard";
import { getSyncReport } from "@/lib/reports";

const providers = [
  { id: "samsung-card", name: "Samsung Card" },
  { id: "bc-card", name: "BC Card" },
  { id: "ibk-bank", name: "IBK Bank" },
];

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  await requirePageSession();
  const { range, runs, accounts } = await getSyncReport();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">동기화</h1>
        <p className="text-sm text-muted-foreground">
          CODEF 조회는 서버에서만 실행되고 결과는 정규화된 거래로 저장됩니다.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>수동 동기화</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {providers.map((provider) => (
              <form
                key={provider.id}
                action={runManualSync}
                className="space-y-3 rounded-md border px-3 py-3 text-sm"
              >
                <input type="hidden" name="provider" value={provider.id} />
                <div className="font-medium">{provider.name}</div>
                <div className="grid gap-2">
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={range.startInput}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={range.endInput}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <Button type="submit" className="w-full">
                  <RefreshCw className="h-4 w-4" />
                  동기화
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>연결 계정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accounts.length === 0 ? (
              <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                아직 저장된 연결 계정이 없습니다.
              </div>
            ) : accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{account.displayName}</span>
                <span className="text-muted-foreground">{account.maskedIdentifier}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 동기화</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.length === 0 ? (
              <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                동기화 이력이 없습니다.
              </div>
            ) : runs.map((run) => (
              <div key={run.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{run.provider}</span>
                  <span className="text-muted-foreground">{run.status}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {run.startedAt.toLocaleString("ko-KR")} · {run.fetchedCount}건
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
