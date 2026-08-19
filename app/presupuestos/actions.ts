"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createInvoice, type ItemInput } from "@/app/facturas/actions";

function nextBudgetNumber(existingNumbers: string[]) {
  const year = new Date().getFullYear();
  const prefix = `PRE-${year}-`;
  const thisYear = existingNumbers.filter((n) => n.startsWith(prefix));
  const max = thisYear.reduce((m, n) => {
    const parsed = parseInt(n.slice(prefix.length), 10);
    return Number.isFinite(parsed) && parsed > m ? parsed : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function lineBase(it: ItemInput) {
  return it.qty * it.unitPrice * (1 - (it.discount || 0) / 100);
}

export async function createBudget(data: {
  plate: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: ItemInput[];
}) {
  const validItems = data.items.filter((it) => it.concept.trim());
  if (!data.plate.trim() || validItems.length === 0) return { error: "Faltan datos" };

  const subtotal = validItems.reduce((s, it) => s + lineBase(it), 0);
  const vatTotal = validItems.reduce((s, it) => s + lineBase(it) * (it.vat / 100), 0);
  const total = subtotal + vatTotal;

  const existing = await prisma.budget.findMany({ select: { number: true }, orderBy: { createdAt: "desc" }, take: 200 });
  const number = nextBudgetNumber(existing.map((b) => b.number));

  const budget = await prisma.budget.create({
    data: {
      number,
      plate: data.plate.trim().toUpperCase(),
      clientName: data.clientName.trim(),
      clientNif: data.clientNif.trim(),
      clientAddress: data.clientAddress.trim(),
      subtotal,
      vatTotal,
      total,
      items: {
        create: validItems.map((it) => ({
          concept: it.concept.trim(),
          qty: it.qty,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          vat: it.vat,
          kind: it.kind,
        })),
      },
    },
  });

  revalidatePath("/presupuestos");
  return { budgetId: budget.id };
}

export async function removeBudget(id: string) {
  await prisma.budget.delete({ where: { id } });
  revalidatePath("/presupuestos");
}

export async function convertBudgetToInvoice(budgetId: string): Promise<{ invoiceId?: string; error?: string }> {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId }, include: { items: true } });
  if (!budget) return { error: "Presupuesto no encontrado." };
  if (budget.invoiceId) return { invoiceId: budget.invoiceId };

  const res = await createInvoice({
    plate: budget.plate,
    clientName: budget.clientName,
    clientNif: budget.clientNif,
    clientAddress: budget.clientAddress,
    items: budget.items.map((it) => ({
      concept: it.concept,
      qty: it.qty,
      unitPrice: Number(it.unitPrice),
      discount: it.discount,
      vat: it.vat,
      kind: it.kind,
    })),
  });
  if (!res.invoiceId) return { error: res.error || "No se pudo facturar el presupuesto." };

  await prisma.budget.update({ where: { id: budgetId }, data: { invoiceId: res.invoiceId } });
  revalidatePath("/presupuestos");
  revalidatePath("/facturas");
  return { invoiceId: res.invoiceId };
}
