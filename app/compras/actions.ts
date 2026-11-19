"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { moveStock } from "@/lib/stock";
import { logAction } from "@/lib/audit";
import type { $Enums } from "@/app/generated/prisma/client";

function refresh() {
  revalidatePath("/compras");
  revalidatePath("/articulos");
  revalidatePath("/caja");
  revalidatePath("/ordenes");
  revalidatePath("/fiscal");
  revalidatePath("/");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Proveedores ----------

export async function saveSupplier(id: string | null, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const data = {
    name,
    taxId: String(formData.get("taxId") || "").trim().toUpperCase(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };
  const supplier = id ? await prisma.supplier.update({ where: { id }, data }) : await prisma.supplier.create({ data });
  // Enlaza los articulos que ya tenian este proveedor escrito a mano
  await prisma.article.updateMany({ where: { supplier: { equals: name, mode: "insensitive" }, supplierId: null }, data: { supplierId: supplier.id } });
  refresh();
}

export async function removeSupplier(id: string) {
  await prisma.supplier.delete({ where: { id } });
  refresh();
}

// ---------- Compras: albaranes, facturas de proveedor y gastos ----------

export type PurchaseLineInput = { articleId: string | null; concept: string; qty: number; unitCost: number; vat: number };

export async function createPurchase(data: {
  kind: "albaran" | "factura" | "gasto";
  supplierId: string | null;
  supplierName: string;
  supplierNif: string;
  number: string;
  date: string;
  dueDate: string;
  category: string;
  orderId: string | null;
  addToOrder: boolean;
  notes: string;
  paid: boolean;
  lines: PurchaseLineInput[];
  albaranIds: string[];
  /** Para gastos sin lineas: base e IVA a mano */
  manualBase?: number;
  manualVat?: number;
}): Promise<{ id?: string; error?: string }> {
  const lines = data.lines.filter((l) => l.concept.trim() && l.qty > 0);
  let supplierName = data.supplierName.trim();
  let supplierNif = data.supplierNif.trim().toUpperCase();
  if (data.supplierId) {
    const s = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (s) {
      supplierName = s.name;
      supplierNif = supplierNif || s.taxId;
    }
  }
  if (!supplierName) return { error: "Falta el proveedor." };

  const albaranes = data.kind === "factura" && data.albaranIds.length
    ? await prisma.purchase.findMany({ where: { id: { in: data.albaranIds }, kind: "albaran", invoicedInId: null } })
    : [];

  let subtotal = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  let vatTotal = lines.reduce((s, l) => s + l.qty * l.unitCost * (l.vat / 100), 0);
  if (!lines.length && data.manualBase) {
    subtotal = data.manualBase;
    vatTotal = data.manualVat || 0;
  }
  subtotal += albaranes.reduce((s, a) => s + Number(a.subtotal), 0);
  vatTotal += albaranes.reduce((s, a) => s + Number(a.vatTotal), 0);
  if (subtotal === 0 && !lines.length) return { error: "Anade alguna linea o un importe." };

  const order = data.orderId ? await prisma.order.findUnique({ where: { id: data.orderId } }) : null;
  const date = data.date ? new Date(`${data.date}T12:00:00`) : new Date();

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        kind: data.kind as $Enums.PurchaseKind,
        supplierId: data.supplierId,
        supplierName,
        supplierNif,
        number: data.number.trim(),
        date,
        dueDate: data.dueDate ? new Date(`${data.dueDate}T12:00:00`) : null,
        category: data.category.trim() || (data.kind === "gasto" ? "Gastos generales" : "Recambios"),
        subtotal: round2(subtotal),
        vatTotal: round2(vatTotal),
        total: round2(subtotal + vatTotal),
        orderId: order?.id ?? null,
        notes: data.notes.trim(),
        paid: data.kind !== "albaran" && data.paid,
        paidAt: data.kind !== "albaran" && data.paid ? new Date() : null,
        items: { create: lines.map((l) => ({ articleId: l.articleId, concept: l.concept.trim(), qty: l.qty, unitCost: l.unitCost, vat: l.vat })) },
      },
    });

    if (albaranes.length) {
      await tx.purchase.updateMany({ where: { id: { in: albaranes.map((a) => a.id) } }, data: { invoicedInId: p.id } });
    }

    // Entrada en almacen de las lineas de articulos (los gastos no mueven stock)
    if (data.kind !== "gasto") {
      for (const l of lines) {
        if (!l.articleId) continue;
        await moveStock(tx, {
          articleId: l.articleId,
          qty: l.qty,
          kind: "entrada",
          unitCost: l.unitCost,
          note: `${data.kind === "albaran" ? "Albaran" : "Factura"} ${data.number || ""} · ${supplierName}`.trim(),
        });
        if (l.unitCost > 0) await tx.article.update({ where: { id: l.articleId }, data: { costPrice: l.unitCost } });

        // Si va para una orden concreta, se apunta en la orden (y sale del almacen)
        if (order && data.addToOrder) {
          const article = await tx.article.findUniqueOrThrow({ where: { id: l.articleId } });
          const existing = await tx.orderItem.findFirst({ where: { orderId: order.id, articleId: l.articleId } });
          if (existing) {
            await tx.orderItem.update({ where: { id: existing.id }, data: { qty: existing.qty + l.qty } });
          } else {
            await tx.orderItem.create({
              data: { orderId: order.id, articleId: l.articleId, name: article.name, price: article.price, costPrice: l.unitCost, qty: l.qty },
            });
          }
          await moveStock(tx, { articleId: l.articleId, qty: -l.qty, kind: "salida_orden", orderId: order.id, plate: order.plate });
        }
      }
    }
    return p;
  });

  await logAction(
    data.kind === "albaran" ? "Albaran de proveedor" : data.kind === "factura" ? "Factura de proveedor" : "Gasto registrado",
    `${supplierName} ${data.number} · ${round2(subtotal + vatTotal).toFixed(2)} EUR`
  );
  refresh();
  return { id: purchase.id };
}

export async function setPurchasePaid(id: string, paid: boolean) {
  await prisma.purchase.update({ where: { id }, data: { paid, paidAt: paid ? new Date() : null } });
  refresh();
}

/** Borra la compra y deshace la entrada en almacen de sus articulos */
export async function removePurchase(id: string) {
  const p = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!p) return;
  await prisma.$transaction(async (tx) => {
    if (p.kind !== "gasto") {
      for (const it of p.items) {
        if (it.articleId) await moveStock(tx, { articleId: it.articleId, qty: -it.qty, kind: "ajuste", note: `Anulada compra ${p.number || ""} ${p.supplierName}`.trim() });
      }
    }
    await tx.purchase.updateMany({ where: { invoicedInId: id }, data: { invoicedInId: null } });
    await tx.purchase.delete({ where: { id } });
  });
  await logAction("Compra borrada", `${p.supplierName} ${p.number} · ${Number(p.total).toFixed(2)} EUR`);
  refresh();
}

// ---------- Pedidos a proveedor ----------

async function nextPoNumber() {
  const year = new Date().getFullYear();
  const prefix = `PED-${year}-`;
  const last = await prisma.purchaseOrder.findMany({ where: { number: { startsWith: prefix } }, select: { number: true } });
  const max = last.reduce((m, p) => Math.max(m, parseInt(p.number.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** Crea un pedido en borrador por proveedor con todo lo que esta por debajo del minimo */
export async function generateAutoOrders(): Promise<{ created: number }> {
  const articles = await prisma.article.findMany({ where: { minStock: { gt: 0 } } });
  const low = articles.filter((a) => a.stock <= a.minStock);
  if (!low.length) return { created: 0 };

  // No repetir lo que ya esta pedido y sin recibir
  const pendingItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrder: { status: { not: "recibido" } }, articleId: { not: null } } });
  const alreadyOrdered = new Set(pendingItems.map((i) => i.articleId));
  const suppliers = await prisma.supplier.findMany();

  const groups = new Map<string, typeof low>();
  for (const a of low) {
    if (alreadyOrdered.has(a.id)) continue;
    const sid = a.supplierId || suppliers.find((s) => s.name.toLowerCase() === a.supplier.toLowerCase())?.id || "";
    groups.set(sid, [...(groups.get(sid) || []), a]);
  }

  let created = 0;
  for (const [sid, list] of groups) {
    await prisma.purchaseOrder.create({
      data: {
        number: await nextPoNumber(),
        supplierId: sid || null,
        notes: sid ? "" : "Articulos sin proveedor asignado",
        items: { create: list.map((a) => ({ articleId: a.id, name: a.name + (a.reference ? ` (ref. ${a.reference})` : ""), qty: Math.max(1, a.minStock * 2 - a.stock) })) },
      },
    });
    created++;
  }
  if (created) await logAction("Pedidos automaticos generados", `${created} pedido(s)`);
  refresh();
  return { created };
}

export async function createEmptyPurchaseOrder(formData: FormData) {
  const supplierId = String(formData.get("supplierId") || "") || null;
  await prisma.purchaseOrder.create({ data: { number: await nextPoNumber(), supplierId } });
  refresh();
}

export async function addPoItem(poId: string, formData: FormData) {
  const articleId = String(formData.get("articleId") || "") || null;
  const qty = Math.max(1, parseInt(String(formData.get("qty") || "1"), 10) || 1);
  let name = String(formData.get("name") || "").trim();
  if (articleId) {
    const a = await prisma.article.findUnique({ where: { id: articleId } });
    if (a) name = a.name + (a.reference ? ` (ref. ${a.reference})` : "");
  }
  if (!name) return;
  await prisma.purchaseOrderItem.create({ data: { purchaseOrderId: poId, articleId, name, qty } });
  refresh();
}

export async function setPoItemQty(itemId: string, qty: number) {
  if (qty <= 0) await prisma.purchaseOrderItem.delete({ where: { id: itemId } });
  else await prisma.purchaseOrderItem.update({ where: { id: itemId }, data: { qty } });
  refresh();
}

export async function setPoSupplier(poId: string, supplierId: string) {
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { supplierId: supplierId || null } });
  refresh();
}

export async function markPoSent(poId: string) {
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "enviado", sentAt: new Date() } });
  refresh();
}

export async function removePurchaseOrder(poId: string) {
  await prisma.purchaseOrder.delete({ where: { id: poId } });
  refresh();
}

/** Mercancia recibida: crea el albaran y mete las piezas en el almacen */
export async function receivePurchaseOrder(poId: string, formData: FormData): Promise<void> {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: { include: { article: true } }, supplier: true } });
  if (!po || po.status === "recibido") return;
  const number = String(formData.get("number") || "").trim();
  await createPurchase({
    kind: "albaran",
    supplierId: po.supplierId,
    supplierName: po.supplier?.name || "Proveedor sin nombre",
    supplierNif: po.supplier?.taxId || "",
    number: number || po.number,
    date: "",
    dueDate: "",
    category: "Recambios",
    orderId: null,
    addToOrder: false,
    notes: `Recibido del pedido ${po.number}`,
    paid: false,
    albaranIds: [],
    lines: po.items.map((i) => ({ articleId: i.articleId, concept: i.name, qty: i.qty, unitCost: Number(i.article?.costPrice || 0), vat: 21 })),
  });
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "recibido", receivedAt: new Date() } });
  refresh();
}
