const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const categories = [
  { name: "식비", kind: "EXPENSE", color: "#0f766e", sortOrder: 10 },
  { name: "교통", kind: "EXPENSE", color: "#d97706", sortOrder: 20 },
  { name: "쇼핑", kind: "EXPENSE", color: "#e11d48", sortOrder: 30 },
  { name: "구독", kind: "EXPENSE", color: "#2563eb", sortOrder: 40 },
  { name: "공과금", kind: "EXPENSE", color: "#7c3aed", sortOrder: 50 },
  { name: "클라우드/업무", kind: "EXPENSE", color: "#0891b2", sortOrder: 60 },
  { name: "이체", kind: "TRANSFER", color: "#64748b", sortOrder: 70 },
  { name: "수입", kind: "INCOME", color: "#16a34a", sortOrder: 80 },
  { name: "미분류", kind: "EXPENSE", color: "#475569", sortOrder: 999 },
];

const categoryRules = [
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "스타벅스", priority: 10 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "커피", priority: 20 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "카페", priority: 20 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "식당", priority: 30 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "배달", priority: 30 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "요기요", priority: 30 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "배달의민족", priority: 30 },
  { category: "식비", matchType: "MERCHANT_CONTAINS", pattern: "쿠팡이츠", priority: 30 },
  { category: "교통", matchType: "MERCHANT_CONTAINS", pattern: "택시", priority: 10 },
  { category: "교통", matchType: "MERCHANT_CONTAINS", pattern: "카카오 T", priority: 10 },
  { category: "교통", matchType: "DESCRIPTION_CONTAINS", pattern: "후불교통", priority: 10 },
  { category: "교통", matchType: "MERCHANT_CONTAINS", pattern: "주유", priority: 20 },
  { category: "교통", matchType: "MERCHANT_CONTAINS", pattern: "충전소", priority: 20 },
  { category: "쇼핑", matchType: "MERCHANT_CONTAINS", pattern: "쿠팡", priority: 20 },
  { category: "쇼핑", matchType: "MERCHANT_CONTAINS", pattern: "네이버페이", priority: 30 },
  { category: "쇼핑", matchType: "MERCHANT_CONTAINS", pattern: "11번가", priority: 30 },
  { category: "쇼핑", matchType: "MERCHANT_CONTAINS", pattern: "G마켓", priority: 30 },
  { category: "구독", matchType: "MERCHANT_CONTAINS", pattern: "넷플릭스", priority: 10 },
  { category: "구독", matchType: "MERCHANT_CONTAINS", pattern: "유튜브", priority: 10 },
  { category: "구독", matchType: "MERCHANT_CONTAINS", pattern: "멜론", priority: 20 },
  { category: "구독", matchType: "MERCHANT_CONTAINS", pattern: "스포티파이", priority: 20 },
  { category: "구독", matchType: "MERCHANT_CONTAINS", pattern: "APPLE", priority: 30 },
  { category: "공과금", matchType: "MERCHANT_CONTAINS", pattern: "도시가스", priority: 10 },
  { category: "공과금", matchType: "MERCHANT_CONTAINS", pattern: "전기", priority: 10 },
  { category: "공과금", matchType: "MERCHANT_CONTAINS", pattern: "통신", priority: 20 },
  { category: "공과금", matchType: "MERCHANT_CONTAINS", pattern: "KT", priority: 20 },
  { category: "공과금", matchType: "MERCHANT_CONTAINS", pattern: "SKT", priority: 20 },
  { category: "공과금", matchType: "MERCHANT_CONTAINS", pattern: "LG U+", priority: 20 },
  { category: "클라우드/업무", matchType: "MERCHANT_CONTAINS", pattern: "AWS", priority: 10 },
  { category: "클라우드/업무", matchType: "MERCHANT_CONTAINS", pattern: "Google Cloud", priority: 10 },
  { category: "클라우드/업무", matchType: "MERCHANT_CONTAINS", pattern: "OpenAI", priority: 10 },
  { category: "클라우드/업무", matchType: "MERCHANT_CONTAINS", pattern: "GitHub", priority: 10 },
];
const supportedRuleMatchTypes = ["MERCHANT_CONTAINS", "DESCRIPTION_CONTAINS"];

async function upsertCategoryRule(rule) {
  const category = await prisma.category.findUniqueOrThrow({
    where: { name: rule.category },
  });
  const existing = await prisma.categoryRule.findFirst({
    where: {
      categoryId: category.id,
      matchType: rule.matchType,
      pattern: rule.pattern,
    },
  });

  const data = {
    categoryId: category.id,
    matchType: rule.matchType,
    pattern: rule.pattern,
    priority: rule.priority,
    isActive: true,
  };

  if (existing) {
    await prisma.categoryRule.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.categoryRule.create({ data });
}

function matchesRule(rule, transaction) {
  const merchantName = transaction.merchantName ?? "";
  const description = transaction.description ?? "";
  const normalizedMerchantName = merchantName.toLocaleLowerCase("ko-KR");
  const normalizedDescription = description.toLocaleLowerCase("ko-KR");
  const pattern = rule.pattern.trim();
  const normalizedPattern = pattern.toLocaleLowerCase("ko-KR");

  if (rule.matchType === "MERCHANT_CONTAINS") {
    return normalizedMerchantName.includes(normalizedPattern);
  }

  if (rule.matchType === "DESCRIPTION_CONTAINS") {
    return normalizedDescription.includes(normalizedPattern);
  }

  return false;
}

async function reapplyCategoryRules() {
  const rules = await prisma.categoryRule.findMany({
    where: { isActive: true, matchType: { in: supportedRuleMatchTypes } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  const transactions = await prisma.transaction.findMany({
    where: { manualCategoryId: null },
    select: {
      id: true,
      merchantName: true,
      description: true,
      categoryId: true,
    },
  });

  for (const transaction of transactions) {
    const categoryId = rules.find((rule) => matchesRule(rule, transaction))?.categoryId ?? null;
    if (categoryId !== transaction.categoryId) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { categoryId },
      });
    }
  }
}

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }

  for (const rule of categoryRules) {
    await upsertCategoryRule(rule);
  }

  await prisma.categoryRule.updateMany({
    where: { matchType: { notIn: supportedRuleMatchTypes } },
    data: { isActive: false },
  });

  await reapplyCategoryRules();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
