import "server-only";
import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/auth/guards";

export async function requirePageSession() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
}
