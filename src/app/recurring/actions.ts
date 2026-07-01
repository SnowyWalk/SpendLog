"use server";

import { Prisma, RecurringExpenseRuleKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { normalizeRecurringMatchKey } from "@/lib/recurring/match";

const RECURRING_SCOPE_KEY = "global";

function parseRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} 값이 필요합니다.`);
  }
  return value;
}

function parseOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function parseAmount(formData: FormData) {
  const value = Number(formData.get("expectedAmount") ?? 0);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("예상 금액은 0원 이상이어야 합니다.");
  }
  return new Prisma.Decimal(Math.round(value));
}

function parseExpectedDay(formData: FormData) {
  const value = Number(formData.get("expectedDay") ?? 1);
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error("결제 예정일은 1일부터 31일 사이여야 합니다.");
  }
  return value;
}

function parseCategoryId(formData: FormData) {
  return parseOptionalString(formData, "categoryId");
}

function parseMatchKey(value: string) {
  const matchKey = normalizeRecurringMatchKey(value);
  if (!matchKey) {
    throw new Error("고정지출 식별 문자열이 비어 있습니다.");
  }
  return matchKey;
}

function revalidateRecurringViews() {
  revalidatePath("/");
  revalidatePath("/insights");
  revalidatePath("/recurring");
  revalidatePath("/settings");
}

async function deactivateActiveRulesForMatchKey(matchKey: string, exceptId?: string) {
  await prisma.recurringExpenseRule.updateMany({
    where: {
      scopeKey: RECURRING_SCOPE_KEY,
      matchKey,
      isActive: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isActive: false },
  });
}

export async function createManualRecurringExpense(formData: FormData) {
  await assertSameOrigin();

  const displayName = parseRequiredString(formData, "displayName");
  const matchKey = parseMatchKey(displayName);
  const data = {
    scopeKey: RECURRING_SCOPE_KEY,
    matchKey,
    displayName,
    categoryId: parseCategoryId(formData),
    expectedAmount: parseAmount(formData),
    expectedDay: parseExpectedDay(formData),
    sourceHint: parseOptionalString(formData, "sourceHint") ?? "직접 등록",
    note: parseOptionalString(formData, "note"),
  };
  const existing = await prisma.recurringExpenseRule.findFirst({
    where: {
      kind: RecurringExpenseRuleKind.MANUAL,
      scopeKey: RECURRING_SCOPE_KEY,
      matchKey,
      isActive: true,
    },
  });

  await deactivateActiveRulesForMatchKey(matchKey, existing?.id);

  if (existing) {
    await prisma.recurringExpenseRule.update({ where: { id: existing.id }, data });
  } else {
    await prisma.recurringExpenseRule.create({
      data: {
        ...data,
        kind: RecurringExpenseRuleKind.MANUAL,
      },
    });
  }

  revalidateRecurringViews();
}

export async function updateManualRecurringExpense(formData: FormData) {
  await assertSameOrigin();

  const id = parseRequiredString(formData, "id");
  const existing = await prisma.recurringExpenseRule.findUnique({ where: { id } });
  if (!existing || existing.kind !== RecurringExpenseRuleKind.MANUAL) {
    throw new Error("직접 등록한 고정지출만 수정할 수 있습니다.");
  }

  const displayName = parseRequiredString(formData, "displayName");
  const matchKey = parseMatchKey(displayName);

  await deactivateActiveRulesForMatchKey(matchKey, id);

  await prisma.recurringExpenseRule.update({
    where: { id },
    data: {
      scopeKey: RECURRING_SCOPE_KEY,
      matchKey,
      displayName,
      categoryId: parseCategoryId(formData),
      expectedAmount: parseAmount(formData),
      expectedDay: parseExpectedDay(formData),
      sourceHint: parseOptionalString(formData, "sourceHint") ?? "직접 등록",
      note: parseOptionalString(formData, "note"),
    },
  });

  revalidateRecurringViews();
}

export async function confirmDetectedRecurringExpense(formData: FormData) {
  await assertSameOrigin();

  const matchKey = parseMatchKey(parseRequiredString(formData, "matchKey"));
  const displayName = parseRequiredString(formData, "displayName");

  await deactivateActiveRulesForMatchKey(matchKey);

  const existing = await prisma.recurringExpenseRule.findFirst({
    where: {
      kind: RecurringExpenseRuleKind.CONFIRMED,
      scopeKey: RECURRING_SCOPE_KEY,
      matchKey,
      isActive: true,
    },
  });
  const data = {
    scopeKey: RECURRING_SCOPE_KEY,
    matchKey,
    displayName,
    categoryId: parseCategoryId(formData),
    expectedAmount: parseAmount(formData),
    expectedDay: parseExpectedDay(formData),
    sourceHint: parseOptionalString(formData, "sourceHint"),
    note: parseOptionalString(formData, "note"),
  };

  if (existing) {
    await prisma.recurringExpenseRule.update({ where: { id: existing.id }, data });
  } else {
    await prisma.recurringExpenseRule.create({
      data: { ...data, kind: RecurringExpenseRuleKind.CONFIRMED },
    });
  }

  revalidateRecurringViews();
}

export async function excludeDetectedRecurringExpense(formData: FormData) {
  await assertSameOrigin();

  const matchKey = parseMatchKey(parseRequiredString(formData, "matchKey"));
  const displayName = parseRequiredString(formData, "displayName");
  await deactivateActiveRulesForMatchKey(matchKey);

  const existing = await prisma.recurringExpenseRule.findFirst({
    where: {
      kind: RecurringExpenseRuleKind.EXCLUSION,
      scopeKey: RECURRING_SCOPE_KEY,
      matchKey,
      isActive: true,
    },
  });
  const data = {
    scopeKey: RECURRING_SCOPE_KEY,
    matchKey,
    displayName,
    categoryId: parseCategoryId(formData),
    expectedAmount: parseAmount(formData),
    expectedDay: parseExpectedDay(formData),
    sourceHint: parseOptionalString(formData, "sourceHint"),
    note: parseOptionalString(formData, "note"),
  };

  if (existing) {
    await prisma.recurringExpenseRule.update({ where: { id: existing.id }, data });
  } else {
    await prisma.recurringExpenseRule.create({
      data: { ...data, kind: RecurringExpenseRuleKind.EXCLUSION },
    });
  }

  revalidateRecurringViews();
}

export async function restoreRecurringExpense(formData: FormData) {
  await assertSameOrigin();

  const id = parseOptionalString(formData, "id");
  const matchKey = parseOptionalString(formData, "matchKey");
  if (!id && !matchKey) {
    throw new Error("복원할 고정지출 정보가 없습니다.");
  }

  await prisma.recurringExpenseRule.updateMany({
    where: {
      kind: RecurringExpenseRuleKind.EXCLUSION,
      scopeKey: RECURRING_SCOPE_KEY,
      isActive: true,
      ...(id ? { id } : { matchKey: parseMatchKey(matchKey ?? "") }),
    },
    data: { isActive: false },
  });

  revalidateRecurringViews();
}

export async function deactivateRecurringExpenseRule(formData: FormData) {
  await assertSameOrigin();

  const id = parseRequiredString(formData, "id");
  await prisma.recurringExpenseRule.update({
    where: { id },
    data: { isActive: false },
  });

  revalidateRecurringViews();
}
