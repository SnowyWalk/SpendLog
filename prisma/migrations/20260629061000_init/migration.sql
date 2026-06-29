CREATE TYPE "CodefServiceType" AS ENUM ('DEMO', 'API', 'SANDBOX');
CREATE TYPE "BusinessType" AS ENUM ('CD', 'BK');
CREATE TYPE "ClientType" AS ENUM ('P');
CREATE TYPE "SourceKind" AS ENUM ('CARD', 'BANK_ACCOUNT');
CREATE TYPE "SourceType" AS ENUM ('CARD_APPROVAL', 'BANK_TRANSACTION');
CREATE TYPE "TransactionDirection" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'REVERSAL');
CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');
CREATE TYPE "CategoryRuleMatchType" AS ENUM ('MERCHANT_CONTAINS', 'DESCRIPTION_CONTAINS', 'REGEX');
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
CREATE TYPE "SyncEventLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "CodefConnection" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "connectedIdHash" TEXT NOT NULL,
  "serviceType" "CodefServiceType" NOT NULL DEFAULT 'DEMO',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CodefConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LinkedFinancialAccount" (
  "id" TEXT NOT NULL,
  "codefConnectionId" TEXT NOT NULL,
  "organization" TEXT NOT NULL,
  "businessType" "BusinessType" NOT NULL,
  "clientType" "ClientType" NOT NULL DEFAULT 'P',
  "sourceKind" "SourceKind" NOT NULL,
  "displayName" TEXT NOT NULL,
  "maskedIdentifier" TEXT,
  "identifierHash" TEXT NOT NULL,
  "loginType" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LinkedFinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "linkedFinancialAccountId" TEXT NOT NULL,
  "sourceType" "SourceType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "postedDate" TIMESTAMP(3),
  "merchantName" TEXT,
  "description" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KRW',
  "direction" "TransactionDirection" NOT NULL,
  "isCanceled" BOOLEAN NOT NULL DEFAULT false,
  "rawFingerprint" TEXT NOT NULL,
  "categoryId" TEXT,
  "manualCategoryId" TEXT,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "CategoryKind" NOT NULL,
  "color" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CategoryRule" (
  "id" TEXT NOT NULL,
  "matchType" "CategoryRuleMatchType" NOT NULL,
  "pattern" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CategoryRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncRun" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "organization" TEXT NOT NULL,
  "sourceKind" "SourceKind" NOT NULL,
  "lockKey" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "SyncRunStatus" NOT NULL,
  "fetchedCount" INTEGER NOT NULL DEFAULT 0,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "lockExpiresAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncEvent" (
  "id" TEXT NOT NULL,
  "syncRunId" TEXT NOT NULL,
  "level" "SyncEventLevel" NOT NULL,
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CodefConnection_connectedIdHash_key" ON "CodefConnection"("connectedIdHash");
CREATE UNIQUE INDEX "LinkedFinancialAccount_codefConnectionId_organization_businessType_sourceKind_identifierHash_key" ON "LinkedFinancialAccount"("codefConnectionId", "organization", "businessType", "sourceKind", "identifierHash");
CREATE INDEX "LinkedFinancialAccount_organization_businessType_sourceKind_idx" ON "LinkedFinancialAccount"("organization", "businessType", "sourceKind");
CREATE UNIQUE INDEX "Transaction_linkedFinancialAccountId_rawFingerprint_key" ON "Transaction"("linkedFinancialAccountId", "rawFingerprint");
CREATE INDEX "Transaction_occurredAt_idx" ON "Transaction"("occurredAt");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_linkedFinancialAccountId_idx" ON "Transaction"("linkedFinancialAccountId");
CREATE INDEX "Transaction_merchantName_idx" ON "Transaction"("merchantName");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "CategoryRule_categoryId_idx" ON "CategoryRule"("categoryId");
CREATE INDEX "CategoryRule_isActive_priority_idx" ON "CategoryRule"("isActive", "priority");
CREATE INDEX "SyncRun_provider_organization_startDate_endDate_status_idx" ON "SyncRun"("provider", "organization", "startDate", "endDate", "status");
CREATE INDEX "SyncRun_lockKey_status_idx" ON "SyncRun"("lockKey", "status");
CREATE UNIQUE INDEX "SyncRun_running_lockKey_key" ON "SyncRun"("lockKey") WHERE "status" = 'RUNNING';
CREATE INDEX "SyncEvent_syncRunId_createdAt_idx" ON "SyncEvent"("syncRunId", "createdAt");

ALTER TABLE "LinkedFinancialAccount" ADD CONSTRAINT "LinkedFinancialAccount_codefConnectionId_fkey" FOREIGN KEY ("codefConnectionId") REFERENCES "CodefConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_linkedFinancialAccountId_fkey" FOREIGN KEY ("linkedFinancialAccountId") REFERENCES "LinkedFinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_manualCategoryId_fkey" FOREIGN KEY ("manualCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CategoryRule" ADD CONSTRAINT "CategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
