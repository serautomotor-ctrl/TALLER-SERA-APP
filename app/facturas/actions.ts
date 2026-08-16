"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function nextInvoiceNumber(existingNumbers: string[]) {
  const year = new Date().getFullYear();
  const thisYear = existingNumbers.filter((n) => n.startsWith(String(year)));
  const max = thisYear.reduce((m, n) => {
    const parsed = parseInt(n.split("-")[1], 10);
    return Number.isFinite(parsed) && parsed > m ? parsed : m;
  }, 0);
  return `${year}-${String(max + 1).padStart(4, "0")}`;
}

type ItemInput = { concept: string; qty: number; unitPrice: number; vat: number };

export async function createInvoice(data: { plate: string; clientName: string; clientNif: string; items: ItemInput[] }) {
  const validItems = data.items.filter((it) => it.concept.trim());
  if (!data.plate.trim() || validItems.length === 0) return { error: "Faltan datos" };

  const subtotal = validItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const vatTotal = validItems.reduce((s, it) => s + it.qty * it.unitPrice * (it.vat / 100), 0);
  const total = subtotal + vatTotal;

  const existing = await prisma.invoice.findMany({ select: { number: true }, orderBy: { createdAt: "desc" }, take: 200 });
  const number = nextInvoiceNumber(existing.map((i) => i.number));

  const lastInvoice = await prisma.invoice.findFirst({ orderBy: { createdAt: "desc" } });
  const prevHash = lastInvoice?.hash || "";
  const createdAt = new Date();
  const payload = JSON.stringify({ number, plate: data.plate, clientName: data.clientName, total: total.toFixed(2), createdAt, prevHash });
  const hash = createHash("sha256").update(payload).digest("hex");

  const invoice = await prisma.invoice.create({
    data: {
      number,
      plate: data.plate.trim().toUpperCase(),
      clientName: data.clientName.trim(),
      clientNif: data.clientNif.trim(),
      subtotal,
      vatTotal,
      total,
      createdAt,
      prevHash,
      hash,
      items: { create: validItems.map((it) => ({ concept: it.concept.trim(), qty: it.qty, unitPrice: it.unitPrice, vat: it.vat })) },
    },
    include: { items: true },
  });

  revalidatePath("/facturas");
  return { invoiceId: invoice.id };
}
