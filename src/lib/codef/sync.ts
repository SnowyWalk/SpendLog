import "server-only";
import { Prisma, type PrismaClient, SourceKind } from "@prisma/client";
import { fetchCardApprovals } from "@/lib/codef/card";
import { fetchIbkTransactions } from "@/lib/codef/ibk-bank";
import { normalizeCardApproval, normalizeIbkTransaction } from "@/lib/codef/normalize";
import { resolveLinkedFinancialAccount } from "@/lib/codef/discovery";
import type { CodefProvider, DateRange, NormalizedTransaction } from "@/lib/codef/types";
import { findMatchingCategoryId } from "@/lib/categories/rules";
import { redactMessage, redactValue } from "@/lib/security/redact";

const PROVIDER_META = {
  "samsung-card": { organization: "0303", sourceKind: SourceKind.CARD, name: "Samsung Card" },
  "bc-card": { organization: "0305", sourceKind: SourceKind.CARD, name: "BC Card" },
  "ibk-bank": { organization: "0003", sourceKind: SourceKind.BANK_ACCOUNT, name: "IBK Bank" },
} as const;
const SYNC_LOCK_TTL_MS = 1000 * 60 * 30;
const SYNC_LOCK_HEARTBEAT_MS = 1000 * 60 * 5;

export function getSyncLockKey(provider: CodefProvider, range: DateRange) {
  const meta = PROVIDER_META[provider];
  return `${meta.organization}:${meta.sourceKind}:${range.startDate}:${range.endDate}`;
}

async function writeEvent(
  prisma: PrismaClient,
  syncRunId: string,
  eventType: string,
  message: string,
  metadata?: Record<string, unknown>,
  level: "INFO" | "WARN" | "ERROR" = "INFO"
) {
  await prisma.syncEvent.create({
    data: {
      syncRunId,
      level,
      eventType,
      message: redactMessage(message),
      metadata: metadata ? (redactValue(metadata) as Prisma.InputJsonValue) : undefined,
    },
  });
}

async function acquireSyncRun(
  prisma: PrismaClient,
  provider: CodefProvider,
  range: DateRange
) {
  const meta = PROVIDER_META[provider];
  const lockKey = getSyncLockKey(provider, range);
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + SYNC_LOCK_TTL_MS);

  return prisma.$transaction(async (tx) => {
    await tx.syncRun.updateMany({
      where: {
        lockKey,
        status: "RUNNING",
        lockExpiresAt: { lt: now },
      },
      data: {
        status: "FAILED",
        errorCode: "STALE_LOCK",
        errorMessage: "Stale sync lock expired before completion",
        finishedAt: now,
      },
    });

    try {
      const syncRun = await tx.syncRun.create({
        data: {
          provider,
          organization: meta.organization,
          sourceKind: meta.sourceKind,
          lockKey,
          startDate: new Date(`${range.startDate}T00:00:00+09:00`),
          endDate: new Date(`${range.endDate}T23:59:59+09:00`),
          status: "RUNNING",
          lockExpiresAt,
        },
      });
      return { syncRun, acquired: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const syncRun = await tx.syncRun.findFirstOrThrow({
          where: { lockKey, status: "RUNNING" },
        });
        return { syncRun, acquired: false };
      }
      throw error;
    }
  });
}

async function extendSyncLock(prisma: PrismaClient, syncRunId: string) {
  await prisma.syncRun.updateMany({
    where: { id: syncRunId, status: "RUNNING" },
    data: { lockExpiresAt: new Date(Date.now() + SYNC_LOCK_TTL_MS) },
  });
}

function startSyncHeartbeat(prisma: PrismaClient, syncRunId: string) {
  const heartbeat = setInterval(() => {
    extendSyncLock(prisma, syncRunId).catch(() => {
      // The main sync path records terminal errors; heartbeat failures should not mask it.
    });
  }, SYNC_LOCK_HEARTBEAT_MS);

  return () => clearInterval(heartbeat);
}

async function fetchAndNormalize(provider: CodefProvider, range: DateRange) {
  if (provider === "samsung-card") {
    return (await fetchCardApprovals("0303", range)).map((row) =>
      normalizeCardApproval("0303", row)
    );
  }

  if (provider === "bc-card") {
    return (await fetchCardApprovals("0305", range)).map((row) =>
      normalizeCardApproval("0305", row)
    );
  }

  return (await fetchIbkTransactions(range)).map((row) =>
    normalizeIbkTransaction(row, process.env.IBK_ACCOUNT)
  );
}

async function upsertTransaction(
  prisma: PrismaClient,
  transaction: NormalizedTransaction
) {
  const linkedAccount = await resolveLinkedFinancialAccount(
    prisma,
    transaction.linkedAccount
  );
  const categoryId = await findMatchingCategoryId(prisma, transaction);

  const result = await prisma.transaction.upsert({
    where: {
      linkedFinancialAccountId_rawFingerprint: {
        linkedFinancialAccountId: linkedAccount.id,
        rawFingerprint: transaction.rawFingerprint,
      },
    },
    update: {
      categoryId,
      sourceType: transaction.sourceType,
      occurredAt: transaction.occurredAt,
      postedDate: transaction.postedDate,
      merchantName: transaction.merchantName,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      direction: transaction.direction,
      isCanceled: transaction.isCanceled,
      rawData: transaction.rawData as Prisma.InputJsonValue,
    },
    create: {
      linkedFinancialAccountId: linkedAccount.id,
      sourceType: transaction.sourceType,
      occurredAt: transaction.occurredAt,
      postedDate: transaction.postedDate,
      merchantName: transaction.merchantName,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      direction: transaction.direction,
      isCanceled: transaction.isCanceled,
      categoryId,
      rawFingerprint: transaction.rawFingerprint,
      rawData: transaction.rawData as Prisma.InputJsonValue,
    },
  });

  return result;
}

export async function runProviderSync(
  prisma: PrismaClient,
  provider: CodefProvider,
  range: DateRange
) {
  const { syncRun, acquired } = await acquireSyncRun(prisma, provider, range);
  if (!acquired) {
    return {
      status: "already-running" as const,
      syncRunId: syncRun.id,
      fetchedCount: syncRun.fetchedCount,
      insertedCount: syncRun.insertedCount,
      updatedCount: syncRun.updatedCount,
    };
  }

  const stopHeartbeat = startSyncHeartbeat(prisma, syncRun.id);

  try {
    await writeEvent(prisma, syncRun.id, "lock_acquired", "Sync lock acquired");
    await writeEvent(prisma, syncRun.id, "fetch_start", "CODEF provider fetch started", {
      provider,
      range,
    });

    const normalized = await fetchAndNormalize(provider, range);
    await extendSyncLock(prisma, syncRun.id);
    await writeEvent(prisma, syncRun.id, "normalize_complete", "Provider records normalized", {
      count: normalized.length,
    });

    let upserted = 0;
    for (const transaction of normalized) {
      await upsertTransaction(prisma, transaction);
      upserted += 1;
      if (upserted % 100 === 0) {
        await extendSyncLock(prisma, syncRun.id);
      }
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "SUCCESS",
        fetchedCount: normalized.length,
        insertedCount: upserted,
        updatedCount: 0,
        finishedAt: new Date(),
      },
    });

    await writeEvent(prisma, syncRun.id, "sync_success", "Provider sync completed", {
      fetchedCount: normalized.length,
      upserted,
    });

    return {
      status: "success" as const,
      syncRunId: syncRun.id,
      fetchedCount: normalized.length,
      insertedCount: upserted,
      updatedCount: 0,
    };
  } catch (error) {
    const message = redactMessage(error instanceof Error ? error.message : String(error));
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "FAILED",
        errorCode: "SYNC_FAILED",
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
    await writeEvent(prisma, syncRun.id, "sync_failed", message, undefined, "ERROR");
    throw new Error(message);
  } finally {
    stopHeartbeat();
  }
}

export function isCodefProvider(value: string): value is CodefProvider {
  return value === "samsung-card" || value === "bc-card" || value === "ibk-bank";
}
