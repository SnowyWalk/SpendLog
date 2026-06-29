"use server";

import { revalidatePath } from "next/cache";
import { assertSessionAndSameOrigin } from "@/lib/auth/guards";
import { normalizeIsoDate } from "@/lib/codef/date";
import { isCodefProvider, runProviderSync } from "@/lib/codef/sync";
import { prisma } from "@/lib/db/prisma";

export async function runManualSync(formData: FormData) {
  await assertSessionAndSameOrigin();

  const provider = String(formData.get("provider") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!isCodefProvider(provider)) {
    throw new Error("지원하지 않는 동기화 대상입니다.");
  }

  if (!startDate || !endDate) {
    throw new Error("조회 시작일과 종료일이 필요합니다.");
  }

  await runProviderSync(prisma, provider, {
    startDate: normalizeIsoDate(startDate),
    endDate: normalizeIsoDate(endDate),
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  revalidatePath("/sync");
}
