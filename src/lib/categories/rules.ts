import "server-only";
import { CategoryRuleMatchType, type CategoryRule } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type RuleTarget = {
  merchantName?: string | null;
  description?: string | null;
};

const BATCH_SIZE = 500;
const allowedMatchTypes: CategoryRuleMatchType[] = [
  CategoryRuleMatchType.MERCHANT_CONTAINS,
  CategoryRuleMatchType.DESCRIPTION_CONTAINS,
];

export function isSupportedCategoryRuleMatchType(
  matchType: string
): matchType is CategoryRuleMatchType {
  return allowedMatchTypes.includes(matchType as CategoryRuleMatchType);
}

function matchesRule(rule: CategoryRule, target: RuleTarget) {
  const merchantName = target.merchantName ?? "";
  const description = target.description ?? "";
  const normalizedMerchantName = merchantName.toLocaleLowerCase("ko-KR");
  const normalizedDescription = description.toLocaleLowerCase("ko-KR");
  const pattern = rule.pattern.trim();
  const normalizedPattern = pattern.toLocaleLowerCase("ko-KR");

  if (rule.matchType === CategoryRuleMatchType.MERCHANT_CONTAINS) {
    return normalizedMerchantName.includes(normalizedPattern);
  }

  if (rule.matchType === CategoryRuleMatchType.DESCRIPTION_CONTAINS) {
    return normalizedDescription.includes(normalizedPattern);
  }

  return false;
}

async function getActiveCategoryRules(prisma: PrismaClient) {
  return prisma.categoryRule.findMany({
    where: { isActive: true, matchType: { in: allowedMatchTypes } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

function findMatchingRuleCategoryId(rules: CategoryRule[], target: RuleTarget) {
  return rules.find((rule) => matchesRule(rule, target))?.categoryId;
}

export async function findMatchingCategoryId(
  prisma: PrismaClient,
  target: RuleTarget
) {
  const rules = await getActiveCategoryRules(prisma);
  return findMatchingRuleCategoryId(rules, target);
}

export async function reapplyCategoryRules(prisma: PrismaClient) {
  const rules = await getActiveCategoryRules(prisma);
  let updatedCount = 0;
  let scannedCount = 0;
  let cursor: string | undefined;

  while (true) {
    const transactions = await prisma.transaction.findMany({
      where: { manualCategoryId: null },
      select: {
        id: true,
        merchantName: true,
        description: true,
        categoryId: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (transactions.length === 0) {
      break;
    }

    const updates = transactions.flatMap((transaction) => {
      const categoryId = findMatchingRuleCategoryId(rules, transaction) ?? null;
      if (categoryId === transaction.categoryId) {
        return [];
      }

      return [
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { categoryId },
        }),
      ];
    });

    if (updates.length > 0) {
      await prisma.$transaction(updates);
      updatedCount += updates.length;
    }

    scannedCount += transactions.length;
    cursor = transactions.at(-1)?.id;
  }

  return { scannedCount, updatedCount };
}
