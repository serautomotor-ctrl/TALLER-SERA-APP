"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifyPassword, SESSION_COOKIE } from "@/lib/auth";

function safeNext(next: string): string {
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) return next;
  return "/";
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") || "");
  const next = safeNext(String(formData.get("next") || ""));
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  if (!settings || !password || !verifyPassword(password, settings.passwordHash, settings.passwordSalt)) {
    redirect(`/login?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  const session = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
