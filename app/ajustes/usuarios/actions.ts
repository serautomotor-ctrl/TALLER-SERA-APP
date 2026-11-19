"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getSessionUser } from "@/lib/session";
import { SECTIONS } from "@/lib/permissions";

async function requireAdmin() {
  const u = await getSessionUser();
  if (!u?.isAdmin) throw new Error("Solo un administrador puede gestionar usuarios.");
}

const VALID = new Set<string>(SECTIONS.map((s) => s.key));
const perms = (fd: FormData) => fd.getAll("perm").map(String).filter((p) => VALID.has(p));

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  if (!name) return { error: "Falta el nombre." };
  if (password.length < 4) return { error: "La contrasena debe tener al menos 4 caracteres." };
  if (await prisma.user.findUnique({ where: { name } })) return { error: "Ya hay un usuario con ese nombre." };
  const { hash, salt } = hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin: formData.get("isAdmin") === "on",
      permissions: perms(formData),
      mechanicId: String(formData.get("mechanicId") || "") || null,
    },
  });
  await logAction("Usuario creado", name);
  revalidatePath("/ajustes/usuarios");
  revalidatePath("/login");
  return {};
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();
  const u = await prisma.user.update({
    where: { id },
    data: {
      isAdmin: formData.get("isAdmin") === "on",
      active: formData.get("active") === "on",
      permissions: perms(formData),
      mechanicId: String(formData.get("mechanicId") || "") || null,
    },
  });
  await logAction("Permisos de usuario cambiados", u.name);
  revalidatePath("/ajustes/usuarios");
  revalidatePath("/login");
}

export async function resetUserPassword(id: string, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const password = String(formData.get("password") || "");
  if (password.length < 4) return { error: "Minimo 4 caracteres." };
  const { hash, salt } = hashPassword(password);
  const u = await prisma.user.update({ where: { id }, data: { passwordHash: hash, passwordSalt: salt } });
  await logAction("Contrasena de usuario cambiada", u.name);
  return { ok: true };
}

export async function removeUser(id: string) {
  await requireAdmin();
  const u = await prisma.user.delete({ where: { id } });
  await logAction("Usuario borrado", u.name);
  revalidatePath("/ajustes/usuarios");
  revalidatePath("/login");
}
