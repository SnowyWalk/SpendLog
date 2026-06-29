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

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }
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
