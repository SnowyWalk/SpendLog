import { afterEach, describe, expect, it } from "vitest";
import { isTrustedRequestSource } from "@/lib/auth/origin";

describe("origin guard", () => {
  const originalPublicHost = process.env.APP_PUBLIC_HOST;

  afterEach(() => {
    process.env.APP_PUBLIC_HOST = originalPublicHost;
  });

  it("accepts same-origin requests", () => {
    process.env.APP_PUBLIC_HOST = "example.com";

    expect(
      isTrustedRequestSource({
        host: "example.com",
        origin: "https://example.com",
        referer: null,
      })
    ).toBe(true);
  });

  it("rejects malformed origin and referer headers", () => {
    process.env.APP_PUBLIC_HOST = "example.com";

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

  it("rejects requests for an untrusted configured public host", () => {
    process.env.APP_PUBLIC_HOST = "codef.snowywalk.me";

    expect(
      isTrustedRequestSource({
        host: "spend-log-app-1:3000",
        origin: null,
        referer: null,
      })
    ).toBe(false);
    expect(
      isTrustedRequestSource({
        host: "codef.snowywalk.me",
        origin: "https://codef.snowywalk.me",
        referer: null,
      })
    ).toBe(true);
  });

  it("rejects spoofed forwarded hosts and missing public host configuration", () => {
    process.env.APP_PUBLIC_HOST = "codef.snowywalk.me";

    expect(
      isTrustedRequestSource({
        host: "spend-log-app-1:3000",
        origin: "https://codef.snowywalk.me",
        referer: null,
      })
    ).toBe(false);

    delete process.env.APP_PUBLIC_HOST;
    expect(
      isTrustedRequestSource({
        host: "example.com",
        origin: "https://example.com",
        referer: null,
      })
    ).toBe(false);
  });
});
