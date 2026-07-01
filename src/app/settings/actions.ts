"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/lib/auth/guards";
import { currentSeoulMonthKey } from "@/lib/budget/report";
import { prisma } from "@/lib/db/prisma";

export async function saveMonthlyBudgetSetting(formData: FormData) {
  await assertSameOrigin();

  const month = currentSeoulMonthKey();
  const targetAmount = Number(formData.get("targetAmount") ?? 0);

  if (!Number.isFinite(targetAmount) || targetAmount < 0) {
    throw new Error("월 목표 지출은 0원 이상이어야 합니다.");
  }

  await prisma.monthlyBudgetSetting.upsert({
    where: { month },
    create: {
      month,
      targetAmount: new Prisma.Decimal(Math.round(targetAmount)),
    },
    update: {
      targetAmount: new Prisma.Decimal(Math.round(targetAmount)),
    },
  });

  revalidatePath("/");
  revalidatePath("/insights");
  revalidatePath("/settings");
}
