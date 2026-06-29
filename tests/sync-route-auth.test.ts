import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/codef/sync", () => ({
  isCodefProvider: (value: string) =>
    value === "samsung-card" || value === "bc-card" || value === "ibk-bank",
  runProviderSync: vi.fn(async () => ({
    status: "success",
    syncRunId: "sync-run-test",
    fetchedCount: 1,
    insertedCount: 1,
    updatedCount: 0,
  })),
}));

function syncRequest(headers: HeadersInit) {
  return new Request("http://example.com/api/sync/run", {
    method: "POST",
    headers: {
      host: "example.com",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      provider: "bc-card",
      startDate: "2026-06-01",
      endDate: "2026-06-29",
    }),
  });
}

describe("/api/sync/run authorization", () => {
  beforeEach(() => {
    process.env.SYNC_ADMIN_TOKEN = "test-token";
  });

  it("allows bearer-token requests without a session cookie", async () => {
    const { POST } = await import("@/app/api/sync/run/route");
    const response = await POST(
      syncRequest({ authorization: "Bearer test-token" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "success",
      syncRunId: "sync-run-test",
    });
  });

  it("rejects session-cookie requests without a bearer token", async () => {
    const { POST } = await import("@/app/api/sync/run/route");
    const response = await POST(
      syncRequest({
        cookie: "budget_session=valid-session",
        origin: "http://example.com",
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects malformed origin headers without a bearer token", async () => {
    const { POST } = await import("@/app/api/sync/run/route");
    const response = await POST(
      syncRequest({
        cookie: "budget_session=valid-session",
        origin: "://bad",
      })
    );

    expect(response.status).toBe(401);
  });
});
