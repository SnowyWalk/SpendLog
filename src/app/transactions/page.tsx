import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageSession } from "@/lib/auth/page-guard";
import { formatCurrency } from "@/lib/format";
import { getTransactionsReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  await requirePageSession();
  const { range, transactions, totalCount, pageSize } = await getTransactionsReport();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">거래내역</h1>
        <p className="text-sm text-muted-foreground">
          {range.label} 동기화 거래를 날짜+시각, 이름, 가격 중심으로 확인합니다.
          {totalCount > pageSize ? ` 최근 ${pageSize}건만 표시 중입니다.` : ""}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>최근 거래</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">일자</th>
                <th className="py-2 font-medium">이름</th>
                <th className="py-2 font-medium">카테고리</th>
                <th className="py-2 text-right font-medium">금액</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    동기화된 거래가 없습니다.
                  </td>
                </tr>
              ) : transactions.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.dateTime}</td>
                  <td className="py-3">{item.name}</td>
                  <td className="py-3">{item.category}</td>
                  <td className="py-3 text-right font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
