"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { moveStock } from "@/lib/stock";

function parseNum(v: FormDataEntryValue | null) {
  return parseFloat(String(v ?? "").replace(",", "."));
}

function parseIntSafe(v: FormDataEntryValue | null) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : NaN;
}

function refresh() {
  revalidatePath("/articulos");
  revalidatePath("/ordenes");
  revalidatePath("/");
}

/** Entrada de mercancia (compra a proveedor). Si se indica coste, actualiza el coste del articulo. */
export async function addStockEntry(articleId: string, formData: FormData) {
  const qty = parseIntSafe(formData.get("qty"));
  if (!Number.isFinite(qty) || qty <= 0) return;
  const unitCost = parseNum(formData.get("unitCost"));
  const supplier = String(formData.get("supplier") || "").trim();
  const note = String(formData.get("note") || "").trim();

  await prisma.$transaction(async (tx) => {
    await moveStock(tx, {
      articleId,
      qty,
      kind: "entrada",
      unitCost: Number.isFinite(unitCost) ? unitCost : null,
      note: [supplier, note].filter(Boolean).join(" · "),
    });
    const data: { costPrice?: number; supplier?: string } = {};
    if (Number.isFinite(unitCost) && unitCost > 0) data.costPrice = unitCost;
    if (supplier) data.supplier = supplier;
    if (Object.keys(data).length) await tx.article.update({ where: { id: articleId }, data });
  });
  refresh();
}

/** Recuento de almacen: fija las existencias reales y apunta la diferencia. */
export async function adjustStock(articleId: string, formData: FormData) {
  const count = parseIntSafe(formData.get("count"));
  if (!Number.isFinite(count) || count < 0) return;
  const note = String(formData.get("note") || "").trim() || "Recuento";

  await prisma.$transaction(async (tx) => {
    const article = await tx.article.findUnique({ where: { id: articleId }, select: { stock: true } });
    if (!article) return;
    await moveStock(tx, { articleId, qty: count - article.stock, kind: "ajuste", note });
  });
  refresh();
}

export async function updateArticle(articleId: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const price = parseNum(formData.get("price"));
  const costPrice = parseNum(formData.get("costPrice"));
  const minStock = parseIntSafe(formData.get("minStock"));
  const supplier = String(formData.get("supplier") || "").trim();
  if (!name || !Number.isFinite(price)) return;
  const supplierRef = supplier ? await prisma.supplier.findFirst({ where: { name: { equals: supplier, mode: "insensitive" } } }) : null;

  await prisma.article.update({
    where: { id: articleId },
    data: {
      name,
      price,
      costPrice: Number.isFinite(costPrice) ? costPrice : 0,
      minStock: Number.isFinite(minStock) && minStock >= 0 ? minStock : 0,
      supplier,
      supplierId: supplierRef?.id ?? null,
      reference: String(formData.get("reference") || "").trim(),
      location: String(formData.get("location") || "").trim(),
    },
  });
  refresh();
}

export async function getStockMovements(articleId: string) {
  const movements = await prisma.stockMovement.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return movements.map((m) => ({
    id: m.id,
    kind: m.kind,
    qty: m.qty,
    stockAfter: m.stockAfter,
    unitCost: m.unitCost === null ? null : Number(m.unitCost),
    note: m.note,
    plate: m.plate,
    orderId: m.orderId,
    createdAt: m.createdAt.toISOString(),
  }));
}
