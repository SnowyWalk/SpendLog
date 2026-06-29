import { BusinessType, SourceKind } from "@prisma/client";
import { fromCodefDate, fromCodefDateTime } from "@/lib/codef/date";
import { stableHash } from "@/lib/codef/hash";
import type { NormalizedTransaction } from "@/lib/codef/types";
import { redactValue } from "@/lib/security/redact";

function parseRequiredAmount(value: string | undefined, fieldName: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`CODEF payload amount ${fieldName} is required`);
  }

  const numeric = Number(normalized.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    throw new Error(`CODEF payload amount ${fieldName} is invalid`);
  }

  return numeric;
}

function parseOptionalAmount(value: string | undefined, fieldName: string) {
  if (!value) {
    return 0;
  }

  return parseRequiredAmount(value, fieldName);
}

function pickBankDescription(row: Record<string, string>) {
  return [
    row.resAccountDesc1,
    row.resAccountDesc2,
    row.resAccountDesc3,
    row.resAccountDesc4,
  ].find(Boolean);
}

export function normalizeCardApproval(
  organization: "0303" | "0305",
  row: Record<string, string>
): NormalizedTransaction {
  const cardToken = row.resCardNo1 || row.resCardNo || row.resCardName;
  if (!cardToken) {
    throw new Error(`CODEF card approval missing card identifier for ${organization}`);
  }
  const amount = parseRequiredAmount(row.resUsedAmount || row.resKRWAmt, "resUsedAmount");
  const isCanceled = row.resCancelYN === "1" || row.resCancelYN === "Y";
  const merchantName = row.resMemberStoreName || "카드 승인";

  return {
    linkedAccount: {
      organization,
      businessType: BusinessType.CD,
      sourceKind: SourceKind.CARD,
      displayName: organization === "0303" ? "Samsung Card" : "BC Card",
      maskedIdentifier: cardToken,
      identifierHash: stableHash([organization, cardToken]),
    },
    sourceType: "CARD_APPROVAL",
    occurredAt: fromCodefDateTime(row.resUsedDate, row.resUsedTime),
    postedDate: row.resPaymentDueDate
      ? fromCodefDate(row.resPaymentDueDate)
      : undefined,
    merchantName,
    description: row.resCardName,
    amount,
    currency: row.resAccountCurrency || "KRW",
    direction: isCanceled ? "REVERSAL" : "EXPENSE",
    isCanceled,
    rawFingerprint: stableHash([
      organization,
      row.resUsedDate,
      row.resUsedTime,
      merchantName,
      amount,
      row.resApprovalNo,
      isCanceled,
    ]),
    rawData: redactValue({
      resUsedDate: row.resUsedDate,
      resUsedTime: row.resUsedTime,
      resMemberStoreName: row.resMemberStoreName,
      resUsedAmount: row.resUsedAmount,
      resAccountCurrency: row.resAccountCurrency,
      resCancelYN: row.resCancelYN,
      resCardName: row.resCardName,
    }) as Record<string, unknown>,
  };
}

export function normalizeIbkTransaction(
  row: Record<string, string>,
  accountToken = process.env.IBK_ACCOUNT
): NormalizedTransaction {
  const inAmount = parseOptionalAmount(row.resAccountIn, "resAccountIn");
  const outAmount = parseOptionalAmount(row.resAccountOut, "resAccountOut");
  if (inAmount === 0 && outAmount === 0) {
    throw new Error("CODEF IBK transaction requires in or out amount");
  }
  const description = pickBankDescription(row) || "IBK 거래";
  const direction = inAmount > 0 ? "INCOME" : outAmount > 0 ? "EXPENSE" : "TRANSFER";
  const amount = inAmount > 0 ? inAmount : outAmount;
  if (!accountToken) {
    throw new Error("CODEF IBK transaction missing account identifier");
  }

  return {
    linkedAccount: {
      organization: "0003",
      businessType: BusinessType.BK,
      sourceKind: SourceKind.BANK_ACCOUNT,
      displayName: "IBK Bank",
      maskedIdentifier: accountToken.slice(-4).padStart(accountToken.length, "*"),
      identifierHash: stableHash(["0003", accountToken]),
    },
    sourceType: "BANK_TRANSACTION",
    occurredAt: fromCodefDateTime(row.resAccountTrDate, row.resAccountTrTime),
    merchantName: description,
    description,
    amount,
    currency: "KRW",
    direction,
    isCanceled: false,
    rawFingerprint: stableHash([
      "0003",
      row.resAccountTrDate,
      row.resAccountTrTime,
      description,
      inAmount,
      outAmount,
      row.resAccountBalance,
    ]),
    rawData: redactValue({
      resAccountTrDate: row.resAccountTrDate,
      resAccountTrTime: row.resAccountTrTime,
      resAccountDesc1: row.resAccountDesc1,
      resAccountDesc2: row.resAccountDesc2,
      resAccountDesc3: row.resAccountDesc3,
      resAccountDesc4: row.resAccountDesc4,
      resAccountIn: row.resAccountIn,
      resAccountOut: row.resAccountOut,
    }) as Record<string, unknown>,
  };
}
