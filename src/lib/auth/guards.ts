import "server-only";
import { headers } from "next/headers";
import { isTrustedRequestSource } from "@/lib/auth/origin";

export async function assertSameOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  if (!isTrustedRequestSource({ host, origin, referer })) {
    throw new Error("Invalid request source");
  }
}
