"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
  revalidatePath("/");
}

export async function setOrderObservations(orderId: string, formData: FormData) {
  const observations = String(formData.get("observations") || "").trim();
  await prisma.order.update({ where: { id: orderId }, data: { observations } });
  revalidatePath("/ordenes");
}

export async function startOrderTimer(orderId: string) {
  const existing = await prisma.timeEntry.findFirst({ where: { end: null } });
  if (existing) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await prisma.timeEntry.create({
    data: { task: order.description || "Reparacion", plate: order.plate, orderId },
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

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) return;

  const existing = await prisma.orderItem.findFirst({ where: { orderId, articleId } });
  if (existing) {
    await prisma.orderItem.update({ where: { id: existing.id }, data: { qty: existing.qty + 1 } });
  } else {
    await prisma.orderItem.create({
      data: { orderId, articleId, name: article.name, price: article.price, costPrice: article.costPrice, qty: 1 },
    });
  }
  revalidatePath("/ordenes");
}

export async function changeItemQty(itemId: string, delta: number) {
  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await prisma.orderItem.update({ where: { id: itemId }, data: { qty: Math.max(1, item.qty + delta) } });
  revalidatePath("/ordenes");
}

export async function removeOrderItem(itemId: string) {
  await prisma.orderItem.delete({ where: { id: itemId } });
  revalidatePath("/ordenes");
}

export async function createArticle(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const price = parseFloat(String(formData.get("price") || "").replace(",", "."));
  const costPrice = parseFloat(String(formData.get("costPrice") || "0").replace(",", ".")) || 0;
  if (!name || !Number.isFinite(price)) return;
  await prisma.article.create({ data: { name, price, costPrice } });
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}

export async function removeArticle(articleId: string) {
  await prisma.article.delete({ where: { id: articleId } });
  revalidatePath("/ordenes");
  revalidatePath("/articulos");
}
