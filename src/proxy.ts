import { NextResponse, type NextRequest } from "next/server";
import { isTrustedHost } from "@/lib/auth/origin";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");

  if (!isTrustedHost({ host })) {
    return new NextResponse("Invalid host", { status: 421 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
