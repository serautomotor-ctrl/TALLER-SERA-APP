"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { moveStock } from "@/lib/stock";
import { getSessionUser } from "@/lib/session";
import type { $Enums } from "@/app/generated/prisma/client";

export async function createOrder(formData: FormData) {
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  if (!plate) return;

  const order = await prisma.order.create({
    data: { plate, description: String(formData.get("description") || "").trim() },
  });

  revalidatePath("/ordenes");
  redirect(`/ordenes?qr=${order.id}`);
}

export async function setOrderStatus(orderId: string, status: string) {
  await prisma.order.update({ where: { id: orderId }, data: { status: status as $Enums.OrderStatus } });
  revalidatePath("/ordenes");
  revalidatePath("/taller");
  revalidatePath("/");
}

export async function setOrderObservations(orderId: string, formData: FormData) {
  const observations = String(formData.get("observations") || "").trim();
  await prisma.order.update({ where: { id: orderId }, data: { observations } });
  revalidatePath("/ordenes");
}

export async function startOrderTimer(orderId: string) {
  const existing = await prisma.timeEntry.findFirst({ where: { end: null, orderId } });
  if (existing) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const user = await getSessionUser();
  await prisma.timeEntry.create({
    data: { task: order.description || "Reparacion", plate: order.plate, orderId, mechanicId: order.mechanicId || user?.mechanicId || null },
  });
  if (order.status === "abierta") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "en_progreso" } });
  }
  revalidatePath("/ordenes");
  revalidatePath("/horario");
  revalidatePath("/");
}

export async function addCatalogItem(orderId: string, formData: FormData) {
  const articleId = String(formData.get("articleId") || "");
  if (!articleId) return;

  const [article, order] = await Promise.all([
    prisma.article.findUnique({ where: { id: articleId } }),
    prisma.order.findUnique({ where: { id: orderId }, select: { plate: true } }),
  ]);
  if (!article || !order) return;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.orderItem.findFirst({ where: { orderId, articleId } });
    if (existing) {
      await tx.orderItem.update({ where: { id: existing.id }, data: { qty: existing.qty + 1 } });
    } else {
      await tx.orderItem.create({
        data: { orderId, articleId, name: article.name, price: article.price, costPrice: article.costPrice, qty: 1 },
      });
    }
    await moveStock(tx, { articleId, qty: -1, kind: "salida_orden", orderId, plate: order.plate });
  });
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}

export async function changeItemQty(itemId: string, delta: number) {
  await prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { order: { select: { plate: true } } } });
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    const diff = newQty - item.qty;
    if (!diff) return;
    await tx.orderItem.update({ where: { id: itemId }, data: { qty: newQty } });
    if (item.articleId) {
      await moveStock(tx, {
        articleId: item.articleId,
        qty: -diff,
        kind: diff > 0 ? "salida_orden" : "devolucion_orden",
        orderId: item.orderId,
        plate: item.order.plate,
      });
    }
  });
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}

export async function removeOrderItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { order: { select: { plate: true } } } });
    if (!item) return;
    await tx.orderItem.delete({ where: { id: itemId } });
    if (item.articleId) {
      await moveStock(tx, {
        articleId: item.articleId,
        qty: item.qty,
        kind: "devolucion_orden",
        orderId: item.orderId,
        plate: item.order.plate,
      });
    }
  });
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}

function parseNum(v: FormDataEntryValue | null) {
  return parseFloat(String(v ?? "").replace(",", "."));
}

function parseIntSafe(v: FormDataEntryValue | null) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function createArticle(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const price = parseNum(formData.get("price"));
  const costPrice = parseNum(formData.get("costPrice")) || 0;
  const stock = Math.max(0, parseIntSafe(formData.get("stock")));
  const minStock = Math.max(0, parseIntSafe(formData.get("minStock")));
  const supplier = String(formData.get("supplier") || "").trim();
  if (!name || !Number.isFinite(price)) return;
  await prisma.$transaction(async (tx) => {
    const article = await tx.article.create({ data: { name, price, costPrice, minStock, supplier } });
    if (stock > 0) {
      await moveStock(tx, { articleId: article.id, qty: stock, kind: "entrada", unitCost: costPrice || null, note: "Stock inicial" });
    }
  });
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}

export async function removeArticle(articleId: string) {
  const a = await prisma.article.delete({ where: { id: articleId } });
  const { logAction } = await import("@/lib/audit");
  await logAction("Articulo borrado", a.name);
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}

export async function setOrderPlanning(
  orderId: string,
  data: { mechanicId?: string | null; plannedDate?: string | null; promisedAt?: string | null; plannedHours?: string | null }
) {
  const toDate = (v: string | null | undefined) => (v ? new Date(`${v}T09:00:00`) : null);
  const patch: Record<string, unknown> = {};
  if (data.mechanicId !== undefined) patch.mechanicId = data.mechanicId || null;
  if (data.plannedDate !== undefined) patch.plannedDate = toDate(data.plannedDate);
  if (data.promisedAt !== undefined) patch.promisedAt = toDate(data.promisedAt);
  if (data.plannedHours !== undefined) {
    const h = parseFloat(String(data.plannedHours || "").replace(",", "."));
    patch.plannedHours = Number.isFinite(h) && h > 0 ? h : null;
  }
  await prisma.order.update({ where: { id: orderId }, data: patch });
  revalidatePath("/taller");
  revalidatePath("/ordenes");
}
