"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionValue,
  SESSION_COOKIE,
  verifyAdminPassword,
} from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminPassword(password)) {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  redirect("/");
}
