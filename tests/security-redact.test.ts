import { describe, expect, it } from "vitest";
import { redactMessage, redactValue } from "@/lib/security/redact";

describe("redaction helpers", () => {
  it("redacts sensitive object keys recursively", () => {
    const redacted = redactValue({
      connectedId: "sample-connected-id",
      nested: { cardNo: "1234567812345678" },
      safe: "visible",
    });

    expect(redacted).toEqual({
      connectedId: "<redacted>",
      nested: { cardNo: "<redacted>" },
      safe: "visible",
    });
  });

  it("redacts known identifier fragments in error messages", () => {
    expect(redactMessage("account 1234567890 failed")).toContain("<redacted>");
  });
});
