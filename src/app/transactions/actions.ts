"use server";

import { CategoryRuleMatchType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/lib/auth/guards";
import {
  isSupportedCategoryRuleMatchType,
  reapplyCategoryRules,
} from "@/lib/categories/rules";
import { prisma } from "@/lib/db/prisma";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} 값이 필요합니다.`);
  }
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function revalidateTransactionViews() {
  revalidatePath("/");
  revalidatePath("/insights");
  revalidatePath("/transactions");
  revalidatePath("/categories");
}

export async function updateTransactionManualCategory(formData: FormData) {
  await assertSameOrigin();

  const transactionId = requiredString(formData, "transactionId");
  const categoryId = optionalString(formData, "categoryId");
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, direction: true },
  });
  if (!transaction) {
    throw new Error("거래를 찾을 수 없습니다.");
  }
  if (transaction.direction !== "EXPENSE") {
    throw new Error("지출 거래만 수동 분류할 수 있습니다.");
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, kind: "EXPENSE" },
      select: { id: true },
    });
    if (!category) {
      throw new Error("지출 카테고리를 찾을 수 없습니다.");
    }
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { manualCategoryId: categoryId },
  });

  revalidateTransactionViews();
}

export async function createCategoryRuleFromTransaction(formData: FormData) {
  await assertSameOrigin();

  const transactionId = requiredString(formData, "transactionId");
  const categoryId = requiredString(formData, "categoryId");
  const matchType = requiredString(formData, "matchType");
  if (!isSupportedCategoryRuleMatchType(matchType)) {
    throw new Error("지원하지 않는 규칙 유형입니다.");
  }

  const [transaction, category] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { merchantName: true, description: true, direction: true },
    }),
    prisma.category.findFirst({
      where: { id: categoryId, kind: "EXPENSE" },
      select: { id: true },
    }),
  ]);

  if (!transaction) {
    throw new Error("거래를 찾을 수 없습니다.");
  }
  if (transaction.direction !== "EXPENSE") {
    throw new Error("지출 거래만 분류 규칙으로 등록할 수 있습니다.");
  }
  if (!category) {
    throw new Error("지출 카테고리를 찾을 수 없습니다.");
  }

  const pattern =
    matchType === CategoryRuleMatchType.MERCHANT_CONTAINS
      ? transaction.merchantName?.trim()
      : transaction.description?.trim();
  if (!pattern || pattern.length < 2) {
    throw new Error("규칙으로 사용할 거래 문자열이 너무 짧습니다.");
  }

  const existingRule = await prisma.categoryRule.findFirst({
    where: {
      categoryId,
      matchType,
      pattern,
      isActive: true,
    },
    select: { id: true },
  });
  if (!existingRule) {
    await prisma.categoryRule.create({
      data: {
        categoryId,
        matchType,
        pattern,
        priority: 100,
      },
    });
    await reapplyCategoryRules(prisma);
  }
  revalidateTransactionViews();
}
