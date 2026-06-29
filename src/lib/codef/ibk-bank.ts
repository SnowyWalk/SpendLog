import "server-only";
import { createCodefClient, CODEF_SERVICE_TYPE, parseCodefResponse } from "@/lib/codef/client";
import { toCodefDate } from "@/lib/codef/date";
import type { DateRange } from "@/lib/codef/types";

const PRODUCT_URL = "/v1/kr/bank/p/account/transaction-list";

type CodefBankResponse = {
  result?: { code?: string; message?: string; extraMessage?: string };
  data?: { resTrHistoryList?: Array<Record<string, string>> };
};

export async function fetchIbkTransactions(range: DateRange) {
  const {
    CODEF_CONNECTED_ID,
    BIRTH_DATE,
    IBK_ACCOUNT,
    ORDER_BY,
    IBK_INQUIRY_TYPE,
  } = process.env;

  if (!CODEF_CONNECTED_ID) {
    throw new Error("CODEF_CONNECTED_ID is required");
  }
  if (!IBK_ACCOUNT) {
    throw new Error("IBK_ACCOUNT is required for IBK sync");
  }

  const params: Record<string, string> = {
    connectedId: CODEF_CONNECTED_ID,
    organization: "0003",
    account: IBK_ACCOUNT,
    startDate: toCodefDate(range.startDate),
    endDate: toCodefDate(range.endDate),
    orderBy: ORDER_BY || "0",
    inquiryType: IBK_INQUIRY_TYPE || "1",
  };

  if (BIRTH_DATE) {
    params.birthDate = BIRTH_DATE;
  }

  const raw = await createCodefClient().requestProduct(
    PRODUCT_URL,
    CODEF_SERVICE_TYPE,
    params
  );
  const response = parseCodefResponse<CodefBankResponse>(raw);
  if (response.result?.code !== "CF-00000") {
    throw new Error(
      `CODEF IBK transaction failed: ${response.result?.code || "UNKNOWN"} ${response.result?.message || ""} ${response.result?.extraMessage || ""}`
    );
  }

  return response.data?.resTrHistoryList || [];
}
