import "server-only";
import { createCodefClient, CODEF_SERVICE_TYPE, parseCodefResponse } from "@/lib/codef/client";
import { toCodefDate } from "@/lib/codef/date";
import type { DateRange } from "@/lib/codef/types";

const PRODUCT_URL = "/v1/kr/card/p/account/approval-list";

export type CardOrganization = "0303" | "0305";

type CodefApprovalResponse = {
  result?: { code?: string; message?: string; extraMessage?: string };
  data?: Array<Record<string, string>>;
};

export async function fetchCardApprovals(
  organization: CardOrganization,
  range: DateRange
) {
  const { CODEF_CONNECTED_ID, BIRTH_DATE, ORDER_BY } = process.env;
  if (!CODEF_CONNECTED_ID) {
    throw new Error("CODEF_CONNECTED_ID is required");
  }
  if (!BIRTH_DATE) {
    throw new Error("BIRTH_DATE is required for card approval sync");
  }

  const raw = await createCodefClient().requestProduct(
    PRODUCT_URL,
    CODEF_SERVICE_TYPE,
    {
      connectedId: CODEF_CONNECTED_ID,
      organization,
      birthDate: BIRTH_DATE,
      startDate: toCodefDate(range.startDate),
      endDate: toCodefDate(range.endDate),
      orderBy: ORDER_BY || "0",
      inquiryType: "1",
      memberStoreInfoType: "0",
    }
  );

  const response = parseCodefResponse<CodefApprovalResponse>(raw);
  if (response.result?.code !== "CF-00000") {
    throw new Error(
      `CODEF card approval failed: ${response.result?.code || "UNKNOWN"} ${response.result?.message || ""} ${response.result?.extraMessage || ""}`
    );
  }

  return response.data || [];
}
