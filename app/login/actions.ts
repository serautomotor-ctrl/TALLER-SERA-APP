"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION, createSessionToken, verifyPassword, SESSION_COOKIE, type SessionUser } from "@/lib/auth";

function safeNext(next: string): string {
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) return next;
  return "/";
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") || "");
  const userId = String(formData.get("userId") || "admin");
  const next = safeNext(String(formData.get("next") || ""));
  const fail = () => redirect(`/login?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);

  let session: SessionUser | null = null;
  if (!password) fail();

  if (userId === "admin") {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (settings && verifyPassword(password, settings.passwordHash, settings.passwordSalt)) session = { ...ADMIN_SESSION };
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.active && verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      session = { id: user.id, name: user.name, isAdmin: user.isAdmin, permissions: user.permissions, mechanicId: user.mechanicId };
    }
  }
  if (!session) fail();

  const token = createSessionToken(session!);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: token.maxAge,
  });
  await prisma.auditLog.create({ data: { userName: session!.name, action: "Inicio de sesion" } }).catch(() => null);

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
