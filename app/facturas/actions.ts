"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { $Enums } from "@/app/generated/prisma/client";
import { logAction } from "@/lib/audit";

function nextInvoiceNumber(existingNumbers: string[]) {
  const year = new Date().getFullYear();
  const thisYear = existingNumbers.filter((n) => n.startsWith(String(year)));
  const max = thisYear.reduce((m, n) => {
    const parsed = parseInt(n.split("-")[1], 10);
    return Number.isFinite(parsed) && parsed > m ? parsed : m;
  }, 0);
  return `${year}-${String(max + 1).padStart(4, "0")}`;
}

export type ItemInput = { concept: string; qty: number; unitPrice: number; discount: number; vat: number; kind: "concepto" | "mano_obra" };

function lineBase(it: ItemInput) {
  return it.qty * it.unitPrice * (1 - (it.discount || 0) / 100);
}

export async function createInvoice(data: {
  plate: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: ItemInput[];
  insurerId?: string | null;
  claimNumber?: string;
  notes?: string;
}) {
  const validItems = data.items.filter((it) => it.concept.trim());
  if (!data.plate.trim() || validItems.length === 0) return { error: "Faltan datos" };

  const subtotal = validItems.reduce((s, it) => s + lineBase(it), 0);
  const vatTotal = validItems.reduce((s, it) => s + lineBase(it) * (it.vat / 100), 0);
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
      insurerId: data.insurerId || null,
      claimNumber: (data.claimNumber || "").trim(),
      notes: (data.notes || "").trim(),
      subtotal,
      vatTotal,
      total,
      createdAt,
      prevHash,
      hash,
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
    include: { items: true },
  });

  await logAction("Factura emitida", `${invoice.number} · ${invoice.clientName} · ${Number(invoice.total).toFixed(2)} EUR`);
  revalidatePath("/facturas");
  return { invoiceId: invoice.id };
}

export async function updateInvoiceNumber(invoiceId: string, formData: FormData): Promise<{ error?: string }> {
  const number = String(formData.get("number") || "").trim();
  if (!number) return { error: "El numero no puede estar vacio." };

  const clash = await prisma.invoice.findUnique({ where: { number } });
  if (clash && clash.id !== invoiceId) return { error: "Ya existe otra factura con ese numero." };

  const before = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { number: true } });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { number } });
  await logAction("Numero de factura corregido", `${before?.number} -> ${number}`);
  revalidatePath("/facturas");
  return {};
}

/** Recalcula lo cobrado de una factura a partir de sus cobros */
async function recomputeInvoicePayments(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: { orderBy: { date: "asc" } } } });
  const total = Number(invoice.total);
  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const last = invoice.payments[invoice.payments.length - 1];
  const status: $Enums.PaymentStatus = paid <= 0 ? "pendiente" : paid + 0.005 >= total ? "cobrada" : "parcial";
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: status,
      paidAmount: Math.round(paid * 100) / 100,
      paymentMethod: last?.method ?? null,
      paidAt: last?.date ?? null,
    },
  });
  revalidatePath("/facturas");
  revalidatePath("/caja");
  revalidatePath("/");
}

function parseMethod(v: FormDataEntryValue | null): $Enums.PaymentMethod {
  const m = String(v || "efectivo");
  return (["efectivo", "tarjeta", "transferencia", "otro"].includes(m) ? m : "efectivo") as $Enums.PaymentMethod;
}

/** Registra un cobro (puede ser parcial). El importe es lo que se cobra ahora. */
export async function addPayment(invoiceId: string, formData: FormData) {
  const amount = parseFloat(String(formData.get("amount") || "0").replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0) return;
  const method = parseMethod(formData.get("paymentMethod"));
  const dateStr = String(formData.get("date") || "");
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  await prisma.payment.create({
    data: {
      invoiceId,
      amount: Math.round(amount * 100) / 100,
      method,
      date: dateStr ? new Date(`${dateStr}T12:00:00`) : new Date(),
      note: String(formData.get("note") || "").trim(),
    },
  });
  await logAction("Cobro registrado", `${invoice.number}: ${amount.toFixed(2)} EUR (${method})`);
  await recomputeInvoicePayments(invoiceId);
}

/** Cobra lo que falte de la factura de una vez */
export async function markInvoicePaid(invoiceId: string, formData: FormData) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const remaining = Number(invoice.total) - Number(invoice.paidAmount);
  if (remaining <= 0) return;
  const fd = new FormData();
  fd.set("amount", remaining.toFixed(2));
  fd.set("paymentMethod", String(formData.get("paymentMethod") || "efectivo"));
  await addPayment(invoiceId, fd);
}

export async function removePayment(paymentId: string) {
  const p = await prisma.payment.delete({ where: { id: paymentId }, include: { invoice: true } });
  await logAction("Cobro anulado", `${p.invoice.number}: ${Number(p.amount).toFixed(2)} EUR`);
  await recomputeInvoicePayments(p.invoiceId);
}

export async function markInvoiceUnpaid(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  await prisma.payment.deleteMany({ where: { invoiceId } });
  await logAction("Cobros de factura anulados", invoice.number);
  await recomputeInvoicePayments(invoiceId);
}

/**
 * Siniestro con aseguradora: una factura a la compania por la reparacion (menos la franquicia)
 * y, si hay franquicia, otra al cliente por ese importe.
 */
export async function createInsuranceInvoices(data: {
  plate: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: ItemInput[];
  insurerId: string;
  claimNumber: string;
  deductible: number;
}): Promise<{ invoiceId?: string; clientInvoiceId?: string; error?: string }> {
  const insurer = await prisma.insurer.findUnique({ where: { id: data.insurerId } });
  if (!insurer) return { error: "Elige la aseguradora." };
  const deductible = Math.max(0, Math.round((data.deductible || 0) * 100) / 100);
  const deductibleBase = Math.round((deductible / 1.21) * 100) / 100;
  const claim = data.claimNumber.trim();
  const claimText = claim ? ` (siniestro ${claim})` : "";

  const insurerItems: ItemInput[] = [...data.items];
  if (deductible > 0) {
    insurerItems.push({ concept: `Franquicia a cargo del asegurado${claimText}`, qty: 1, unitPrice: -deductibleBase, discount: 0, vat: 21, kind: "concepto" });
  }
  const main = await createInvoice({
    plate: data.plate,
    clientName: insurer.name,
    clientNif: insurer.taxId,
    clientAddress: insurer.address,
    items: insurerItems,
    insurerId: insurer.id,
    claimNumber: claim,
    notes: `Asegurado: ${data.clientName}${data.clientNif ? ` (${data.clientNif})` : ""} · Vehiculo ${data.plate.toUpperCase()}`,
  });
  if (!main.invoiceId) return { error: main.error || "No se pudo emitir la factura." };

  let clientInvoiceId: string | undefined;
  if (deductible > 0) {
    const second = await createInvoice({
      plate: data.plate,
      clientName: data.clientName,
      clientNif: data.clientNif,
      clientAddress: data.clientAddress,
      items: [{ concept: `Franquicia del seguro ${insurer.name}${claimText}`, qty: 1, unitPrice: deductibleBase, discount: 0, vat: 21, kind: "concepto" }],
      claimNumber: claim,
      notes: `Franquicia del siniestro reparado. El resto se factura a ${insurer.name}.`,
    });
    clientInvoiceId = second.invoiceId;
  }
  revalidatePath("/aseguradoras");
  return { invoiceId: main.invoiceId, clientInvoiceId };
}
