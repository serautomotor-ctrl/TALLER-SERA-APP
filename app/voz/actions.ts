"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { moveStock } from "@/lib/stock";
import { logAction } from "@/lib/audit";
import { requirePermission } from "@/lib/session";
import { askAnthropic } from "@/lib/anthropic";
import { parseVoice, similarity, type ParsedVoice, type VoiceIntent } from "@/lib/voice";

export type VoiceCandidate = { id: string; name: string; price: number; stock: number };

export type VoiceProposal = {
  heard: string;
  intent: VoiceIntent | null;
  plate: string | null;
  orderId: string | null;
  orderLabel: string;
  qty: number;
  text: string;
  status: ParsedVoice["status"];
  candidates: VoiceCandidate[];
  error?: string;
};

const plateKey = (p: string) => p.replace(/[\s-]/g, "").toUpperCase();

const STATUS_LABEL: Record<string, string> = { abierta: "Abierta", en_progreso: "En curso", pendiente_piezas: "Esperando piezas", cerrada: "Terminada" };

/** Si el interprete propio no entiende la frase y hay clave de IA, se le pregunta a Claude */
async function aiParse(text: string): Promise<ParsedVoice | null> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" }, select: { aiApiKey: true } });
  if (!settings?.aiApiKey) return null;
  const system = `Eres el asistente de un taller mecanico en Espana. Recibes una frase dictada por voz y devuelves SOLO un JSON con:
{"intent": "add_item"|"note"|"status"|"timer_start"|"timer_stop"|"new_order"|null, "plate": "1234BCD" o null, "plateDigits": "1234" o null,
"qty": numero, "text": "articulo, nota o descripcion", "status": "abierta"|"en_progreso"|"pendiente_piezas"|"cerrada"|null}
add_item = apuntar una pieza o producto en la orden; note = anotar una observacion; status = cambiar el estado de la orden;
timer_start/timer_stop = empezar o parar el tiempo de trabajo; new_order = abrir una orden nueva.
La matricula espanola son 4 cifras y 3 letras (o letras de provincia antiguas). Si solo se dicen las cifras, rellena plateDigits.`;
  try {
    const raw = await askAnthropic(settings.aiApiKey, system, text, "claude-haiku-5-5");
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    return {
      intent: json.intent ?? null,
      plate: json.plate ? String(json.plate).replace(/[\s-]/g, "").toUpperCase() : null,
      plateDigits: json.plateDigits ? String(json.plateDigits) : null,
      qty: Math.max(1, parseInt(json.qty, 10) || 1),
      text: String(json.text || ""),
      status: json.status ?? null,
    };
  } catch {
    return null;
  }
}

export async function interpretVoice(heard: string, lastPlate: string | null): Promise<VoiceProposal> {
  await requirePermission("ordenes");
  let parsed = parseVoice(heard);
  if (!parsed.intent) parsed = (await aiParse(heard)) || parsed;

  const base: VoiceProposal = { heard, intent: parsed.intent, plate: null, orderId: null, orderLabel: "", qty: parsed.qty, text: parsed.text, status: parsed.status, candidates: [] };
  if (!parsed.intent) {
    return { ...base, plate: parsed.plate || lastPlate, error: "No he entendido que hay que hacer. Prueba con: «1234 BCD apuntale un limpiador de frenos»." };
  }

  // Matricula: dictada entera, solo las cifras (buscamos cual es) o la ultima usada
  let plate = parsed.plate;
  if (!plate && parsed.plateDigits) {
    const open = await prisma.order.findMany({ where: { status: { not: "cerrada" }, plate: { contains: parsed.plateDigits } }, select: { plate: true }, distinct: ["plate"] });
    const known = open.length ? open : await prisma.vehicle.findMany({ where: { plate: { contains: parsed.plateDigits } }, select: { plate: true } });
    if (known.length === 1) plate = known[0].plate;
    else if (known.length > 1) return { ...base, error: `Hay varias matriculas con ${parsed.plateDigits}: ${known.map((k) => k.plate).join(", ")}. Dila entera.` };
    else return { ...base, error: `No encuentro ninguna matricula con ${parsed.plateDigits}.` };
  }
  if (!plate) plate = lastPlate;
  if (!plate) return { ...base, error: "Dime tambien la matricula, por ejemplo: «1234 BCD apuntale...»." };
  base.plate = plate;

  if (parsed.intent === "new_order") return base;

  // Las matriculas pueden estar guardadas con espacios o guiones ("9368 MND"): comparamos sin ellos
  const digits = plate.replace(/\D/g, "").slice(0, 4);
  const sameOrders = (
    await prisma.order.findMany({ where: digits ? { plate: { contains: digits } } : undefined, orderBy: { createdAt: "desc" } })
  ).filter((o) => plateKey(o.plate) === plateKey(plate));
  const order = sameOrders.find((o) => o.status !== "cerrada") || null;
  const anyOrder = order || (parsed.intent === "status" ? sameOrders[0] || null : null);
  if (anyOrder) base.plate = anyOrder.plate;
  if (!anyOrder) {
    return { ...base, error: `${plate} no tiene ninguna orden abierta. Di «abre una orden para ${plate}» y despues apuntale lo que quieras.` };
  }
  base.orderId = anyOrder.id;
  base.orderLabel = `${anyOrder.plate}${anyOrder.description ? ` · ${anyOrder.description}` : ""} (${STATUS_LABEL[anyOrder.status]})`;

  if (parsed.intent === "add_item") {
    if (!parsed.text) return { ...base, error: "No he entendido que pieza hay que apuntar." };
    const articles = await prisma.article.findMany({ select: { id: true, name: true, price: true, stock: true, reference: true } });
    base.candidates = articles
      .map((a) => ({ a, score: Math.max(similarity(parsed.text, a.name), a.reference ? similarity(parsed.text, a.reference) : 0) }))
      .filter((x) => x.score >= 0.4)
      .sort((x, y) => y.score - x.score)
      .slice(0, 4)
      .map(({ a }) => ({ id: a.id, name: a.name, price: Number(a.price), stock: a.stock }));
  }
  return base;
}

export async function executeVoice(p: {
  intent: VoiceIntent;
  plate: string;
  orderId: string | null;
  qty: number;
  articleId: string | null;
  freeName: string;
  freePrice: number;
  text: string;
  status: ParsedVoice["status"];
}): Promise<{ ok: boolean; message: string; orderId?: string }> {
  await requirePermission("ordenes");
  const qty = Math.max(1, Math.min(99, Math.round(p.qty) || 1));
  const done = (message: string, orderId?: string | null) => {
    revalidatePath("/ordenes");
    revalidatePath("/taller");
    revalidatePath("/articulos");
    revalidatePath("/horario");
    revalidatePath("/");
    return { ok: true, message, orderId: orderId || undefined };
  };

  if (p.intent === "new_order") {
    // Si el coche ya tiene ficha, usamos la matricula tal y como esta escrita alli
    const digits = p.plate.replace(/\D/g, "").slice(0, 4);
    const known = (await prisma.vehicle.findMany({ where: { plate: { contains: digits } }, select: { plate: true } })).find((v) => plateKey(v.plate) === plateKey(p.plate));
    const order = await prisma.order.create({ data: { plate: known?.plate || p.plate.toUpperCase(), description: p.text.trim() } });
    await logAction("Por voz: orden nueva", `${order.plate} ${order.description}`);
    return done(`Orden abierta para ${order.plate}.`, order.id);
  }

  const order = p.orderId ? await prisma.order.findUnique({ where: { id: p.orderId } }) : null;
  if (!order) return { ok: false, message: "No encuentro la orden." };

  if (p.intent === "add_item") {
    if (p.articleId) {
      const article = await prisma.article.findUnique({ where: { id: p.articleId } });
      if (!article) return { ok: false, message: "Ese articulo ya no existe." };
      await prisma.$transaction(async (tx) => {
        const existing = await tx.orderItem.findFirst({ where: { orderId: order.id, articleId: article.id } });
        if (existing) await tx.orderItem.update({ where: { id: existing.id }, data: { qty: existing.qty + qty } });
        else await tx.orderItem.create({ data: { orderId: order.id, articleId: article.id, name: article.name, price: article.price, costPrice: article.costPrice, qty } });
        await moveStock(tx, { articleId: article.id, qty: -qty, kind: "salida_orden", orderId: order.id, plate: order.plate });
      });
      await logAction("Por voz: articulo apuntado", `${order.plate}: ${qty} x ${article.name}`);
      return done(`Apuntado ${qty} x ${article.name} en ${order.plate}.`, order.id);
    }
    const name = p.freeName.trim();
    if (!name) return { ok: false, message: "Falta el nombre de lo que hay que apuntar." };
    await prisma.orderItem.create({ data: { orderId: order.id, name, price: Math.max(0, p.freePrice || 0), qty } });
    await logAction("Por voz: concepto apuntado", `${order.plate}: ${qty} x ${name}`);
    return done(`Apuntado ${qty} x ${name} en ${order.plate}${p.freePrice ? "" : " (sin precio: ponselo en la orden)"}.`, order.id);
  }

  if (p.intent === "note") {
    const stamp = new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const observations = [order.observations, `[${stamp}] ${p.text.trim()}`].filter(Boolean).join("\n");
    await prisma.order.update({ where: { id: order.id }, data: { observations } });
    await logAction("Por voz: nota", `${order.plate}: ${p.text}`);
    return done(`Nota guardada en ${order.plate}.`, order.id);
  }

  if (p.intent === "status" && p.status) {
    await prisma.order.update({ where: { id: order.id }, data: { status: p.status } });
    await logAction("Por voz: estado", `${order.plate}: ${STATUS_LABEL[p.status]}`);
    return done(`${order.plate} pasa a «${STATUS_LABEL[p.status]}».`, order.id);
  }

  if (p.intent === "timer_start") {
    const running = await prisma.timeEntry.findFirst({ where: { orderId: order.id, end: null } });
    if (running) return { ok: true, message: `El tiempo de ${order.plate} ya estaba en marcha.` };
    const { getSessionUser } = await import("@/lib/session");
    const user = await getSessionUser();
    await prisma.timeEntry.create({ data: { task: order.description || "Reparacion", plate: order.plate, orderId: order.id, mechanicId: order.mechanicId || user?.mechanicId || null } });
    if (order.status === "abierta") await prisma.order.update({ where: { id: order.id }, data: { status: "en_progreso" } });
    return done(`Tiempo en marcha para ${order.plate}.`, order.id);
  }

  if (p.intent === "timer_stop") {
    const running = await prisma.timeEntry.findFirst({ where: { orderId: order.id, end: null } });
    if (!running) return { ok: true, message: `${order.plate} no tenia el tiempo en marcha.` };
    const pausedMs = running.pausedMs + (running.paused && running.pauseStart ? Date.now() - running.pauseStart.getTime() : 0);
    await prisma.timeEntry.update({ where: { id: running.id }, data: { end: new Date(), paused: false, pauseStart: null, pausedMs } });
    return done(`Tiempo parado en ${order.plate}.`, order.id);
  }

  return { ok: false, message: "No se que hacer con eso." };
}
