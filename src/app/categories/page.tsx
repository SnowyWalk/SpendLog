import { CategoryRuleMatchType } from "@prisma/client";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  createCategoryRule,
  deleteCategoryRule,
  reapplyCategoryRulesAction,
} from "@/app/categories/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoriesReport } from "@/lib/reports";

const ruleLabels: Record<CategoryRuleMatchType, string> = {
  MERCHANT_CONTAINS: "가맹점 포함",
  DESCRIPTION_CONTAINS: "설명 포함",
  REGEX: "정규식(지원 중단)",
};
const creatableRuleTypes = [
  CategoryRuleMatchType.MERCHANT_CONTAINS,
  CategoryRuleMatchType.DESCRIPTION_CONTAINS,
];

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { categories, rules } = await getCategoriesReport();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">카테고리</h1>
        <p className="text-sm text-muted-foreground">
          기본 카테고리와 가맹점 규칙을 관리합니다.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>기본 카테고리</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.name}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {category._count.autoTransactions + category._count.manualTransactions}건
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>가맹점 자동분류 규칙</CardTitle>
            <form action={reapplyCategoryRulesAction}>
              <Button type="submit" variant="outline">
                <RefreshCw className="h-4 w-4" />
                재분류
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createCategoryRule} className="grid gap-2 lg:grid-cols-[1fr_1fr_2fr_100px_auto]">
            <select
              name="categoryId"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              name="matchType"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={CategoryRuleMatchType.MERCHANT_CONTAINS}
            >
              {creatableRuleTypes.map((value) => (
                <option key={value} value={value}>
                  {ruleLabels[value]}
                </option>
              ))}
            </select>
            <input
              name="pattern"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              placeholder="예: 스타벅스"
              required
            />
            <input
              name="priority"
              type="number"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={100}
              min={1}
            />
            <Button type="submit">추가</Button>
          </form>

          <div className="space-y-2">
            {rules.length === 0 ? (
              <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                등록된 자동분류 규칙이 없습니다.
              </div>
            ) : rules.map((rule) => (
              <div
                key={rule.id}
                className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div className="font-medium">{rule.pattern}</div>
                <div className="text-muted-foreground">
                  {ruleLabels[rule.matchType]} → {rule.category.name}
                </div>
                <div className="text-xs text-muted-foreground">우선순위 {rule.priority}</div>
                <form action={deleteCategoryRule}>
                  <input type="hidden" name="id" value={rule.id} />
                  <Button type="submit" variant="ghost" aria-label="규칙 삭제">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
