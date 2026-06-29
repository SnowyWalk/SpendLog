import "server-only";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { isTrustedRequestSource } from "@/lib/auth/origin";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

export async function hasValidSession() {
  const cookieStore = await cookies();
  return verifySessionValue(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function assertSameOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  if (!isTrustedRequestSource({ host, origin, referer })) {
    throw new Error("Invalid request source");
  }
}

export async function assertSessionAndSameOrigin() {
  if (!(await hasValidSession())) {
    throw new Error("Authentication required");
  }

  await assertSameOrigin();
}
