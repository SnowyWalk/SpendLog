import "server-only";
import { CategoryRuleMatchType, type CategoryRule } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type RuleTarget = {
  merchantName?: string | null;
  description?: string | null;
};

function matchesRule(rule: CategoryRule, target: RuleTarget) {
  const merchantName = target.merchantName ?? "";
  const description = target.description ?? "";

  if (rule.matchType === CategoryRuleMatchType.MERCHANT_CONTAINS) {
    return merchantName.includes(rule.pattern);
  }

  if (rule.matchType === CategoryRuleMatchType.DESCRIPTION_CONTAINS) {
    return description.includes(rule.pattern);
  }

  try {
    return new RegExp(rule.pattern, "i").test(`${merchantName} ${description}`);
  } catch {
    return false;
  }
}

export async function findMatchingCategoryId(
  prisma: PrismaClient,
  target: RuleTarget
) {
  const rules = await prisma.categoryRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return rules.find((rule) => matchesRule(rule, target))?.categoryId;
}
