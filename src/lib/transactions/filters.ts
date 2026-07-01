import { TransactionDirection } from "@prisma/client";

export type TransactionFilterInput = {
  q?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
  categoryId?: string | string[];
  sourceId?: string | string[];
  direction?: string | string[];
  uncategorized?: string | string[];
};

export type TransactionFilters = {
  q: string;
  startDate: string;
  endDate: string;
  categoryId: string;
  sourceId: string;
  direction: TransactionDirection | "";
  uncategorized: boolean;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDirection(value: string) {
  return Object.values(TransactionDirection).includes(value as TransactionDirection)
    ? (value as TransactionDirection)
    : "";
}

export function parseTransactionFilters(
  input: TransactionFilterInput | undefined,
  defaults: { startDate: string; endDate: string }
): TransactionFilters {
  const startDate = first(input?.startDate).trim();
  const endDate = first(input?.endDate).trim();
  const uncategorized = first(input?.uncategorized);

  return {
    q: first(input?.q).trim(),
    startDate: isDateInput(startDate) ? startDate : defaults.startDate,
    endDate: isDateInput(endDate) ? endDate : defaults.endDate,
    categoryId: first(input?.categoryId).trim(),
    sourceId: first(input?.sourceId).trim(),
    direction: normalizeDirection(first(input?.direction).trim()),
    uncategorized: ["1", "true", "yes", "on"].includes(uncategorized.toLowerCase()),
  };
}
