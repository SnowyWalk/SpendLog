import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runProviderSync, isCodefProvider } from "@/lib/codef/sync";
import { normalizeIsoDate } from "@/lib/codef/date";
import { isTrustedRequestSource } from "@/lib/auth/origin";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

function isSameOrigin(request: Request) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  return isTrustedRequestSource({ host, origin, referer });
}

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronToken = process.env.SYNC_ADMIN_TOKEN;

  if (
    cronToken &&
    authHeader &&
    authHeader === `Bearer ${cronToken}`
  ) {
    return true;
  }

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  return Boolean(cookie && verifySessionValue(decodeURIComponent(cookie)) && isSameOrigin(request));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!body.provider || !isCodefProvider(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  let startDate: string;
  let endDate: string;
  try {
    startDate = normalizeIsoDate(body.startDate);
    endDate = normalizeIsoDate(body.endDate);
  } catch {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD or YYYYMMDD" }, { status: 400 });
  }

  const result = await runProviderSync(prisma, body.provider, { startDate, endDate });

  return NextResponse.json(result);
}
