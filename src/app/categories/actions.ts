"use server";

import { CategoryRuleMatchType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertSessionAndSameOrigin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function createCategoryRule(formData: FormData) {
  await assertSessionAndSameOrigin();

  const categoryId = String(formData.get("categoryId") ?? "");
  const matchType = String(formData.get("matchType") ?? "");
  const pattern = String(formData.get("pattern") ?? "").trim();
  const priority = Number(formData.get("priority") ?? 100);

  if (!categoryId || !pattern) {
    throw new Error("카테고리와 규칙 문자열은 필수입니다.");
  }

  if (!Object.values(CategoryRuleMatchType).includes(matchType as CategoryRuleMatchType)) {
    throw new Error("지원하지 않는 규칙 유형입니다.");
  }

  await prisma.categoryRule.create({
    data: {
      categoryId,
      matchType: matchType as CategoryRuleMatchType,
      pattern,
      priority: Number.isFinite(priority) ? priority : 100,
    },
  });

  revalidatePath("/categories");
}

export async function deleteCategoryRule(formData: FormData) {
  await assertSessionAndSameOrigin();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    throw new Error("삭제할 규칙이 없습니다.");
  }

  await prisma.categoryRule.delete({ where: { id } });
  revalidatePath("/categories");
}
