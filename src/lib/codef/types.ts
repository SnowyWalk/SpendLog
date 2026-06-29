import type { SourceKind } from "@prisma/client";

export type CodefProvider = "samsung-card" | "bc-card" | "ibk-bank";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type LinkedAccountInput = {
  organization: string;
  businessType: "CD" | "BK";
  sourceKind: SourceKind;
  displayName: string;
  maskedIdentifier?: string;
  identifierHash: string;
  loginType?: string;
};

export type NormalizedTransaction = {
  linkedAccount: LinkedAccountInput;
  sourceType: "CARD_APPROVAL" | "BANK_TRANSACTION";
  occurredAt: Date;
  postedDate?: Date;
  merchantName?: string;
  description?: string;
  amount: number;
  currency: string;
  direction: "EXPENSE" | "INCOME" | "TRANSFER" | "REVERSAL";
  isCanceled: boolean;
  rawFingerprint: string;
  rawData: Record<string, unknown>;
};
