"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { $Enums } from "@/app/generated/prisma/client";

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

export async function createInvoice(data: {
  plate: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: ItemInput[];
}) {
  const validItems = data.items.filter((it) => it.concept.trim());
  if (!data.plate.trim() || validItems.length === 0) return { error: "Faltan datos" };

  const subtotal = validItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const vatTotal = validItems.reduce((s, it) => s + it.qty * it.unitPrice * (it.vat / 100), 0);
  const total = subtotal + vatTotal;

  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  let number: string;
  if (settings.nextInvoiceNumberOverride.trim()) {
    number = settings.nextInvoiceNumberOverride.trim();
    await prisma.settings.update({ where: { id: "singleton" }, data: { nextInvoiceNumberOverride: "" } });
  } else {
    const existing = await prisma.invoice.findMany({ select: { number: true }, orderBy: { createdAt: "desc" }, take: 200 });
    number = nextInvoiceNumber(existing.map((i) => i.number));
  }

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
      clientAddress: data.clientAddress.trim(),
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

export async function updateInvoiceNumber(invoiceId: string, formData: FormData): Promise<{ error?: string }> {
  const number = String(formData.get("number") || "").trim();
  if (!number) return { error: "El numero no puede estar vacio." };

  const clash = await prisma.invoice.findUnique({ where: { number } });
  if (clash && clash.id !== invoiceId) return { error: "Ya existe otra factura con ese numero." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { number } });
  revalidatePath("/facturas");
  return {};
}

export async function markInvoicePaid(invoiceId: string, formData: FormData) {
  const method = String(formData.get("paymentMethod") || "efectivo") as $Enums.PaymentMethod;
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: "cobrada",
      paymentMethod: method,
      paidAmount: invoice.total,
      paidAt: new Date(),
    },
  });
  revalidatePath("/facturas");
}

export async function setPartialPayment(invoiceId: string, formData: FormData) {
  const amount = parseFloat(String(formData.get("paidAmount") || "0").replace(",", "."));
  const method = String(formData.get("paymentMethod") || "efectivo") as $Enums.PaymentMethod;
  if (!Number.isFinite(amount) || amount <= 0) return;

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const total = Number(invoice.total);
  const status: $Enums.PaymentStatus = amount >= total ? "cobrada" : "parcial";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: status,
      paymentMethod: method,
      paidAmount: Math.min(amount, total),
      paidAt: new Date(),
    },
  });
  revalidatePath("/facturas");
}

export async function markInvoiceUnpaid(invoiceId: string) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paymentStatus: "pendiente", paymentMethod: null, paidAmount: 0, paidAt: null },
  });
  revalidatePath("/facturas");
}
