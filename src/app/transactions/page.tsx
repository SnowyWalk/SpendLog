import { CategoryRuleMatchType, TransactionDirection } from "@prisma/client";
import { Sparkles } from "lucide-react";
import {
  createCategoryRuleFromTransaction,
  updateTransactionManualCategory,
} from "@/app/transactions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getTransactionsReport } from "@/lib/reports";
import type { TransactionFilterInput } from "@/lib/transactions/filters";

export const dynamic = "force-dynamic";

type TransactionsPageProps = {
  searchParams?: Promise<TransactionFilterInput>;
};

const directionLabels: Record<TransactionDirection, string> = {
  EXPENSE: "지출",
  INCOME: "수입",
  TRANSFER: "이체",
  REVERSAL: "취소/환급",
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const { range, filters, transactions, totalCount, pageSize, categories, accounts } =
    await getTransactionsReport(params);

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
          <CardTitle>검색 및 정리</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-2 lg:grid-cols-[1fr_140px_140px_150px_150px_130px_auto_auto]">
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="가맹점/설명 검색"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
            <input
              name="startDate"
              type="date"
              defaultValue={filters.startDate}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
            <input
              name="endDate"
              type="date"
              defaultValue={filters.endDate}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
            <select
              name="categoryId"
              defaultValue={filters.categoryId}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              name="sourceId"
              defaultValue={filters.sourceId}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">전체 계정</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName}
                </option>
              ))}
            </select>
            <select
              name="direction"
              defaultValue={filters.direction}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">전체 유형</option>
              {Object.values(TransactionDirection).map((direction) => (
                <option key={direction} value={direction}>
                  {directionLabels[direction]}
                </option>
              ))}
            </select>
            <label className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
              <input
                type="checkbox"
                name="uncategorized"
                value="1"
                defaultChecked={filters.uncategorized}
              />
              미분류
            </label>
            <Button type="submit">적용</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 거래</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">일자</th>
                <th className="py-2 font-medium">이름</th>
                <th className="py-2 font-medium">카테고리</th>
                <th className="py-2 font-medium">수동 분류</th>
                <th className="py-2 font-medium">규칙 생성</th>
                <th className="py-2 text-right font-medium">금액</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    동기화된 거래가 없습니다.
                  </td>
                </tr>
              ) : transactions.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.dateTime}</td>
                  <td className="py-3">{item.name}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: item.categoryColor }}
                      />
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3">
                    {item.direction === TransactionDirection.EXPENSE ? (
                      <form
                        action={updateTransactionManualCategory}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="transactionId" value={item.id} />
                        <select
                          name="categoryId"
                          defaultValue={item.manualCategoryId ?? ""}
                          className="h-8 w-36 rounded-md border bg-background px-2 text-xs"
                          aria-label="수동 카테고리"
                        >
                          <option value="">자동/미분류</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" variant="secondary">
                          저장
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">지출만 지원</span>
                    )}
                  </td>
                  <td className="py-3">
                    {item.direction === TransactionDirection.EXPENSE ? (
                      <form
                        action={createCategoryRuleFromTransaction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="transactionId" value={item.id} />
                        <input
                          type="hidden"
                          name="matchType"
                          value={
                            item.merchantName
                              ? CategoryRuleMatchType.MERCHANT_CONTAINS
                              : CategoryRuleMatchType.DESCRIPTION_CONTAINS
                          }
                        />
                        <select
                          name="categoryId"
                          defaultValue={item.manualCategoryId ?? item.autoCategoryId ?? ""}
                          className="h-8 w-36 rounded-md border bg-background px-2 text-xs"
                          aria-label="규칙 카테고리"
                        >
                          <option value="">카테고리 선택</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={!item.merchantName && !item.description}
                        >
                          <Sparkles className="h-4 w-4" />
                          규칙
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">지출만 지원</span>
                    )}
                  </td>
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
