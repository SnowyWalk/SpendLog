CREATE TYPE "RecurringExpenseRuleKind" AS ENUM ('MANUAL', 'EXCLUSION', 'CONFIRMED');

CREATE TABLE "RecurringExpenseRule" (
    "id" TEXT NOT NULL,
    "kind" "RecurringExpenseRuleKind" NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT 'global',
    "matchKey" TEXT NOT NULL,
    "matchPattern" TEXT,
    "displayName" TEXT NOT NULL,
    "categoryId" TEXT,
    "expectedAmount" DECIMAL(14,2),
    "expectedDay" INTEGER,
    "sourceHint" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpenseRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonthlyBudgetSetting" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBudgetSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyBudgetSetting_month_key" ON "MonthlyBudgetSetting"("month");
CREATE UNIQUE INDEX "RecurringExpenseRule_active_scope_matchKey_key"
ON "RecurringExpenseRule"("scopeKey", "matchKey")
WHERE "isActive" = true;
CREATE INDEX "RecurringExpenseRule_kind_isActive_idx" ON "RecurringExpenseRule"("kind", "isActive");
CREATE INDEX "RecurringExpenseRule_scopeKey_isActive_idx" ON "RecurringExpenseRule"("scopeKey", "isActive");
CREATE INDEX "RecurringExpenseRule_matchKey_isActive_idx" ON "RecurringExpenseRule"("matchKey", "isActive");

ALTER TABLE "RecurringExpenseRule"
ADD CONSTRAINT "RecurringExpenseRule_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
