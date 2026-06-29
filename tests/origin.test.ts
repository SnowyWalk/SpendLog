import { describe, expect, it } from "vitest";
import { isTrustedRequestSource } from "@/lib/auth/origin";

describe("origin guard", () => {
  it("accepts same-origin requests", () => {
    expect(
      isTrustedRequestSource({
        host: "example.com",
        origin: "https://example.com",
        referer: null,
      })
    ).toBe(true);
  });

  it("rejects malformed origin and referer headers", () => {
    expect(
      isTrustedRequestSource({
        host: "example.com",
        origin: "://bad",
        referer: null,
      })
    ).toBe(false);
    expect(
      isTrustedRequestSource({
        host: "example.com",
        origin: null,
        referer: "://bad",
      })
    ).toBe(false);
  });
});
