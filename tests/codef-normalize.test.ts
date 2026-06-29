import { describe, expect, it } from "vitest";
import { normalizeCardApproval, normalizeIbkTransaction } from "@/lib/codef/normalize";

describe("CODEF normalization", () => {
  it("normalizes card approvals into safe expense rows", () => {
    const transaction = normalizeCardApproval("0305", {
      resUsedDate: "20260629",
      resUsedTime: "121314",
      resCardNo: "1234********5678",
      resCardName: "BC 테스트카드",
      resMemberStoreName: "테스트상점",
      resUsedAmount: "12,300",
      resAccountCurrency: "KRW",
      resApprovalNo: "approval-secret",
    });

    expect(transaction.merchantName).toBe("테스트상점");
    expect(transaction.amount).toBe(12300);
    expect(transaction.direction).toBe("EXPENSE");
    expect(transaction.linkedAccount.organization).toBe("0305");
    expect(JSON.stringify(transaction.rawData)).not.toContain("approval-secret");
  });

  it("normalizes IBK outgoing transactions as expenses", () => {
    const transaction = normalizeIbkTransaction(
      {
        resAccountTrDate: "20260629",
        resAccountTrTime: "091500",
        resAccountDesc1: "카카오페이",
        resAccountOut: "8,900",
        resAccountIn: "0",
      },
      "00000012345678"
    );

    expect(transaction.merchantName).toBe("카카오페이");
    expect(transaction.amount).toBe(8900);
    expect(transaction.direction).toBe("EXPENSE");
    expect(transaction.linkedAccount.organization).toBe("0003");
  });

  it("rejects malformed required card payload fields", () => {
    expect(() =>
      normalizeCardApproval("0305", {
        resUsedDate: "20260629",
        resUsedTime: "bad",
        resCardName: "BC 테스트카드",
        resMemberStoreName: "테스트상점",
        resUsedAmount: "12,300",
      })
    ).toThrow("time");

    expect(() =>
      normalizeCardApproval("0305", {
        resUsedDate: "20260629",
        resUsedTime: "121314",
        resCardName: "BC 테스트카드",
        resMemberStoreName: "테스트상점",
        resUsedAmount: "   ",
      })
    ).toThrow("amount");
  });

  it("rejects IBK transactions without a financial amount", () => {
    expect(() =>
      normalizeIbkTransaction(
        {
          resAccountTrDate: "20260629",
          resAccountTrTime: "091500",
          resAccountDesc1: "카카오페이",
        },
        "00000012345678"
      )
    ).toThrow("requires in or out amount");
  });
});
