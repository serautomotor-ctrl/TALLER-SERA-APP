"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { moveStock } from "@/lib/stock";
import { logAction } from "@/lib/audit";
import { getSessionUser } from "@/lib/session";
import { canAccess, type SectionKey } from "@/lib/permissions";
import { askAnthropic } from "@/lib/anthropic";
import { finishedEntryDurationMs } from "@/lib/time";
import { norm, parseVoice, similarity, type ParsedVoice, type VoiceIntent } from "@/lib/voice";
import { addPayment } from "@/app/facturas/actions";
import { addCashMovement } from "@/app/caja/actions";
import { addStockEntry } from "@/app/articulos/actions";
import { getOrCreateReception } from "@/app/recepcion/actions";

export type VoiceCandidate = { id: string; name: string; price: number; stock: number };

export type VoiceProposal = {
  heard: string;
  intent: VoiceIntent | null;
  parsed: ParsedVoice | null;
  plate: string | null;
  orderId: string | null;
  orderLabel: string;
  qty: number;
  text: string;
  status: ParsedVoice["status"];
  candidates: VoiceCandidate[];
  /** Lineas que explican que se va a hacer, para confirmar */
  summary: string[];
  /** Ids resueltos en el servidor (operario, factura, vehiculo) */
  refId: string | null;
  /** Para preguntas: la respuesta. Para "ir a": la pagina */
  answer?: string;
  navigateTo?: string;
  error?: string;
};

const STATUS_LABEL: Record<string, string> = { abierta: "Abierta", en_progreso: "En curso", pendiente_piezas: "Esperando piezas", cerrada: "Terminada" };
const METHOD_LABEL: Record<string, string> = { efectivo: "efectivo", tarjeta: "tarjeta", transferencia: "transferencia", otro: "otro (Bizum...)" };

const plateKey = (p: string) => p.replace(/[\s-]/g, "").toUpperCase();
const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const dateLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

/** Que permiso hace falta para cada orden */
const INTENT_SECTION: Record<VoiceIntent, SectionKey | null> = {
  add_item: "ordenes",
  note: "ordenes",
  status: "ordenes",
  timer_start: "ordenes",
  timer_pause: "ordenes",
  timer_resume: "ordenes",
  timer_stop: "ordenes",
  new_order: "ordenes",
  assign: "ordenes",
  plan_date: "ordenes",
  promise_date: "ordenes",
  ask_order: "ordenes",
  finding: "recepcion",
  mileage: "fichas",
  itv: "fichas",
  service: "fichas",
  clock_in: "horario",
  clock_out: "horario",
  appointment: "agenda",
  pay_invoice: "caja",
  cash_in: "caja",
  cash_out: "caja",
  ask_money: "caja",
  stock_in: "articulos",
  ask_stock: "articulos",
  navigate: null,
};

/** Ordenes que trabajan sobre la orden abierta de una matricula */
const NEEDS_ORDER = new Set<VoiceIntent>(["add_item", "note", "status", "timer_start", "timer_pause", "timer_resume", "timer_stop", "assign", "plan_date", "promise_date", "finding", "ask_order"]);
/** Ordenes que necesitan saber la matricula */
const NEEDS_PLATE = new Set<VoiceIntent>([...NEEDS_ORDER, "new_order", "mileage", "itv", "service", "pay_invoice"]);

const NAV: Record<string, { href: string; section: SectionKey | null; label: string }> = {
  taller: { href: "/taller", section: "taller", label: "Planificador" },
  facturas: { href: "/facturas", section: "facturas", label: "Facturas" },
  presupuestos: { href: "/presupuestos", section: "presupuestos", label: "Presupuestos" },
  caja: { href: "/caja", section: "caja", label: "Caja" },
  compras: { href: "/compras", section: "compras", label: "Compras" },
  agenda: { href: "/agenda", section: "agenda", label: "Agenda" },
  avisos: { href: "/avisos", section: "avisos", label: "Avisos" },
  fichas: { href: "/fichas", section: "fichas", label: "Fichas" },
  recepcion: { href: "/recepcion", section: "recepcion", label: "Recepcion" },
  ordenes: { href: "/ordenes", section: "ordenes", label: "Ordenes" },
  articulos: { href: "/articulos", section: "articulos", label: "Articulos" },
  horario: { href: "/horario", section: "horario", label: "Horario" },
  operarios: { href: "/operarios", section: "operarios", label: "Operarios" },
  fiscal: { href: "/fiscal", section: "fiscal", label: "Fiscal" },
  rentabilidad: { href: "/rentabilidad", section: "rentabilidad", label: "Rentabilidad" },
  cortesia: { href: "/cortesia", section: "cortesia", label: "Vehiculos de cortesia" },
  aseguradoras: { href: "/aseguradoras", section: "aseguradoras", label: "Aseguradoras" },
  diagnostico: { href: "/diagnostico", section: "diagnostico", label: "Diagnostico" },
  ajustes: { href: "/ajustes", section: "ajustes", label: "Ajustes" },
  usuarios: { href: "/ajustes/usuarios", section: "ajustes", label: "Usuarios" },
  registro: { href: "/ajustes/registro", section: "ajustes", label: "Registro de acciones" },
  web: { href: "/web/vehiculos", section: "web", label: "Pagina web" },
  menu: { href: "/menu", section: null, label: "Menu" },
  inicio: { href: "/", section: null, label: "Inicio" },
};

/** Si el interprete propio no entiende la frase y hay clave de IA, se le pregunta a Claude */
async function aiParse(text: string, todayKey: string): Promise<ParsedVoice | null> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" }, select: { aiApiKey: true } });
  if (!settings?.aiApiKey) return null;
  const system = `Eres el asistente de un taller mecanico en Espana. Hoy es ${todayKey}. Recibes una frase dictada por voz y devuelves SOLO un JSON:
{"intent": uno de [${Object.keys(INTENT_SECTION).join(", ")}] o null, "plate": "1234BCD" o null, "plateDigits": "1234" o null, "qty": numero,
"text": "articulo, nota, nombre del operario, concepto o motivo", "status": "abierta"|"en_progreso"|"pendiente_piezas"|"cerrada"|null,
"amount": euros o null, "method": "efectivo"|"tarjeta"|"transferencia"|"otro"|null, "date": "AAAA-MM-DD" o null, "time": "HH:MM" o null,
"km": numero o null, "section": pantalla (taller, facturas, presupuestos, caja, compras, agenda, avisos, fichas, recepcion, ordenes, articulos, horario, operarios, fiscal, rentabilidad, cortesia, aseguradoras, ajustes, inicio, ficha, orden) o null,
"period": "hoy"|"semana"|"mes"|"ano"|null}
add_item apuntar pieza en la orden; note observacion; status cambiar estado; timer_* tiempo de trabajo; new_order abrir orden; assign asignar operario (text = nombre);
plan_date dia de trabajo; promise_date fecha de entrega; finding hallazgo de recepcion (amount = precio); mileage kilometros; itv/service fecha de ITV o revision;
clock_in/clock_out fichar entrada/salida (text = nombre si se dice); appointment cita en agenda; pay_invoice cobrar factura; cash_in/cash_out entrada o salida de caja;
stock_in mercancia recibida; navigate ir a una pantalla; ask_stock cuantas unidades quedan; ask_order como va una orden; ask_money cuanto se ha cobrado/facturado (text = "cobrado"|"facturado"|"pendiente").
La matricula espanola son 4 cifras y 3 letras. Si solo se dicen las cifras, rellena plateDigits.`;
  try {
    const raw = await askAnthropic(settings.aiApiKey, system, text, "claude-haiku-5-5");
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (j.intent && !(j.intent in INTENT_SECTION)) return null;
    return {
      intent: j.intent ?? null,
      plate: j.plate ? plateKey(String(j.plate)) : null,
      plateDigits: j.plateDigits ? String(j.plateDigits) : null,
      qty: Math.max(1, parseInt(j.qty, 10) || 1),
      text: String(j.text || ""),
      status: j.status ?? null,
      amount: typeof j.amount === "number" ? j.amount : null,
      method: j.method ?? null,
      date: j.date ?? null,
      time: j.time ?? null,
      km: typeof j.km === "number" ? j.km : null,
      section: j.section ?? null,
      period: j.period ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * El interprete trabaja en minusculas y sin tildes. Para guardar notas, conceptos o motivos
 * buscamos ese trozo en lo que se dijo de verdad y lo devolvemos tal cual ("revisión", "Pepe").
 */
function restoreCase(fragment: string, original: string) {
  const want = norm(fragment);
  const words = original.split(/\s+/).filter(Boolean);
  const normWords = words.map((w) => norm(w));
  for (let i = 0; i < words.length; i++) {
    let acc = "";
    for (let j = i; j < words.length; j++) {
      acc = (acc ? acc + " " : "") + normWords[j];
      if (acc === want) return words.slice(i, j + 1).join(" ").replace(/[.,;:!?]+$/, "");
      if (acc.length > want.length) break;
    }
  }
  return fragment.charAt(0).toUpperCase() + fragment.slice(1);
}

async function findMechanic(name: string) {
  const mechanics = await prisma.mechanic.findMany({ where: { active: true } });
  if (!name) return null;
  const scored = mechanics.map((m) => ({ m, s: similarity(name, m.name) })).sort((a, b) => b.s - a.s);
  return scored[0] && scored[0].s >= 0.5 ? scored[0].m : null;
}

function periodRange(todayKey: string, period: ParsedVoice["period"]) {
  const today = new Date(`${todayKey}T00:00:00`);
  const end = new Date(`${todayKey}T23:59:59.999`);
  const start = new Date(today);
  if (period === "semana") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "mes") start.setDate(1);
  if (period === "ano") start.setMonth(0, 1);
  const label = { hoy: "hoy", semana: "esta semana", mes: "este mes", ano: "este ano" }[period || "hoy"];
  return { start, end, label };
}

export async function interpretVoice(heard: string, lastPlate: string | null, todayKey?: string): Promise<VoiceProposal> {
  const user = await getSessionUser();
  if (!user) throw new Error("Tienes que iniciar sesion.");
  const tk = todayKey && /^\d{4}-\d{2}-\d{2}$/.test(todayKey) ? todayKey : new Date().toISOString().slice(0, 10);

  let parsed = parseVoice(heard, tk);
  if (!parsed.intent) parsed = (await aiParse(heard, tk)) || parsed;
  if (parsed.text) parsed = { ...parsed, text: restoreCase(parsed.text, heard) };

  const base: VoiceProposal = {
    heard,
    intent: parsed.intent,
    parsed,
    plate: null,
    orderId: null,
    orderLabel: "",
    qty: parsed.qty,
    text: parsed.text,
    status: parsed.status,
    candidates: [],
    summary: [],
    refId: null,
  };
  const fail = (error: string): VoiceProposal => ({ ...base, error });

  if (!parsed.intent) {
    return fail("No he entendido que hay que hacer. Prueba con frases como «1234 BCD apuntale un limpiador de frenos», «pausa el tiempo» o «abre facturas».");
  }
  const section = INTENT_SECTION[parsed.intent];
  if (section && !canAccess(user, section)) return fail("No tienes permiso para hacer eso. Pideselo al administrador.");

  // ---- Matricula: dictada entera, solo las cifras o la ultima usada ----
  let plate = parsed.plate;
  if (!plate && parsed.plateDigits) {
    const open = await prisma.order.findMany({ where: { status: { not: "cerrada" }, plate: { contains: parsed.plateDigits } }, select: { plate: true } });
    const known = open.length ? open : await prisma.vehicle.findMany({ where: { plate: { contains: parsed.plateDigits } }, select: { plate: true } });
    const unique = [...new Set(known.map((k) => k.plate))];
    if (unique.length === 1) plate = unique[0];
    else if (unique.length > 1) return fail(`Hay varias matriculas con ${parsed.plateDigits}: ${unique.join(", ")}. Dila entera.`);
    else return fail(`No encuentro ninguna matricula con ${parsed.plateDigits}.`);
  }
  const navNeedsPlate = parsed.intent === "navigate" && ["ficha", "orden", "recepcion_placa"].includes(parsed.section || "");
  if (!plate && (NEEDS_PLATE.has(parsed.intent) || navNeedsPlate)) plate = lastPlate;
  if (!plate && (NEEDS_PLATE.has(parsed.intent) || navNeedsPlate)) return fail("Dime tambien la matricula, por ejemplo: «1234 BCD ...».");
  base.plate = plate;

  // ---- Orden abierta de esa matricula (sin importar espacios o guiones) ----
  let order: Awaited<ReturnType<typeof prisma.order.findFirst>> = null;
  if (plate && (NEEDS_ORDER.has(parsed.intent) || navNeedsPlate || parsed.intent === "pay_invoice")) {
    const digits = plate.replace(/\D/g, "").slice(0, 4);
    const withDigits = await prisma.order.findMany({ where: digits ? { plate: { contains: digits } } : undefined, orderBy: { createdAt: "desc" } });
    let same = withDigits.filter((o) => plateKey(o.plate) === plateKey(plate!));
    if (!same.length && digits.length === 4) {
      const openPlates = [...new Set(withDigits.filter((o) => o.status !== "cerrada").map((o) => plateKey(o.plate)))];
      if (openPlates.length === 1) same = withDigits.filter((o) => plateKey(o.plate) === openPlates[0]);
    }
    order = same.find((o) => o.status !== "cerrada") || (["status", "ask_order"].includes(parsed.intent) || navNeedsPlate ? same[0] || null : null);
    if (order) {
      base.plate = order.plate;
      base.orderId = order.id;
      base.orderLabel = `${order.plate}${order.description ? ` · ${order.description}` : ""} (${STATUS_LABEL[order.status]})`;
    }
    if (!order && NEEDS_ORDER.has(parsed.intent)) {
      return fail(`${plate} no tiene ninguna orden abierta. Di «abre una orden para ${plate}» y despues lo que quieras.`);
    }
  }

  // Vehiculo de la matricula (para ficha, km, ITV...)
  const findVehicle = async () => {
    if (!base.plate) return null;
    const digits = base.plate.replace(/\D/g, "").slice(0, 4);
    const list = await prisma.vehicle.findMany({ where: { plate: { contains: digits } }, include: { customer: true } });
    return list.find((v) => plateKey(v.plate) === plateKey(base.plate!)) || (list.length === 1 ? list[0] : null);
  };

  const sum = (...lines: string[]) => ({ ...base, summary: lines.filter(Boolean) });

  switch (parsed.intent) {
    case "add_item": {
      if (!parsed.text) return fail("No he entendido que pieza hay que apuntar.");
      const articles = await prisma.article.findMany({ select: { id: true, name: true, price: true, stock: true, reference: true } });
      base.candidates = articles
        .map((a) => ({ a, score: Math.max(similarity(parsed.text, a.name), a.reference ? similarity(parsed.text, a.reference) : 0) }))
        .filter((x) => x.score >= 0.4)
        .sort((x, y) => y.score - x.score)
        .slice(0, 4)
        .map(({ a }) => ({ id: a.id, name: a.name, price: Number(a.price), stock: a.stock }));
      return sum("Apuntar en la orden", base.orderLabel);
    }
    case "note":
      return sum("Anotar en observaciones", base.orderLabel, `«${parsed.text}»`);
    case "status":
      if (!parsed.status) return fail("No he entendido a que estado pasarla.");
      return sum("Cambiar el estado", base.orderLabel, `Nuevo estado: ${STATUS_LABEL[parsed.status]}`);
    case "timer_start":
    case "timer_resume":
    case "timer_pause":
    case "timer_stop": {
      const running = await prisma.timeEntry.findFirst({ where: { orderId: order!.id, end: null } });
      // Si no hay nada que hacer, se dice y no se pide confirmar
      const nothing =
        (parsed.intent === "timer_pause" && (!running || running.paused) && (running ? `El tiempo de ${order!.plate} ya estaba en pausa.` : `${order!.plate} no tiene el tiempo en marcha.`)) ||
        (parsed.intent === "timer_stop" && !running && `${order!.plate} no tiene el tiempo en marcha.`) ||
        ((parsed.intent === "timer_start" || parsed.intent === "timer_resume") && running && !running.paused && `El tiempo de ${order!.plate} ya esta en marcha.`);
      if (nothing) return { ...base, answer: nothing };
      const what = {
        timer_start: running?.paused ? "Reanudar el tiempo (estaba en pausa)" : running ? "El tiempo ya esta en marcha" : "Empezar el tiempo",
        timer_resume: running?.paused ? "Reanudar el tiempo" : running ? "El tiempo ya esta en marcha" : "Empezar el tiempo (no habia ninguno en pausa)",
        timer_pause: !running ? "No hay tiempo en marcha para pausar" : running.paused ? "Ya estaba en pausa" : "Poner el tiempo en pausa",
        timer_stop: !running ? "No hay tiempo en marcha" : "Terminar el tiempo de esta orden",
      }[parsed.intent];
      return sum(what, base.orderLabel);
    }
    case "new_order": {
      const v = await findVehicle();
      if (v) base.plate = v.plate;
      return sum("Abrir una orden nueva", `${base.plate}${v ? ` · ${v.customer.name}` : " (sin ficha todavia)"}`, `Trabajo: ${parsed.text || "(sin descripcion)"}`);
    }
    case "assign": {
      const mech = await findMechanic(parsed.text);
      if (!mech) {
        const all = await prisma.mechanic.findMany({ where: { active: true }, select: { name: true } });
        return fail(`No encuentro al operario «${parsed.text}». ${all.length ? `Los operarios son: ${all.map((m) => m.name).join(", ")}.` : "Dalos de alta en Operarios."}`);
      }
      base.refId = mech.id;
      return sum("Asignar la orden", base.orderLabel, `Operario: ${mech.name}`);
    }
    case "plan_date":
      return sum("Poner dia de trabajo", base.orderLabel, `Dia: ${dateLabel(parsed.date!)}`);
    case "promise_date":
      return sum("Fecha prometida al cliente", base.orderLabel, `Entrega: ${dateLabel(parsed.date!)}`);
    case "finding":
      return sum("Anadir hallazgo en la recepcion", base.orderLabel, `«${parsed.text}»${parsed.amount ? ` · ${eur(parsed.amount)}` : ""}`);
    case "mileage": {
      const v = await findVehicle();
      if (!v) return fail(`No encuentro la ficha de ${base.plate}.`);
      base.refId = v.id;
      base.plate = v.plate;
      return sum("Actualizar kilometros", `${v.plate} · ${v.customer.name}`, `${parsed.km?.toLocaleString("es-ES")} km${v.mileage ? ` (antes ${v.mileage.toLocaleString("es-ES")})` : ""}`);
    }
    case "itv":
    case "service": {
      const v = await findVehicle();
      if (!v) return fail(`No encuentro la ficha de ${base.plate}.`);
      base.refId = v.id;
      base.plate = v.plate;
      return sum(parsed.intent === "itv" ? "Fecha de la proxima ITV" : "Fecha de la proxima revision", `${v.plate} · ${v.customer.name}`, dateLabel(parsed.date!) + (parsed.text ? ` · ${parsed.text}` : ""));
    }
    case "clock_in":
    case "clock_out": {
      const mech = parsed.text ? await findMechanic(parsed.text) : user.mechanicId ? await prisma.mechanic.findUnique({ where: { id: user.mechanicId } }) : null;
      if (!mech) {
        return fail(
          parsed.text
            ? `No encuentro al operario «${parsed.text}».`
            : "No se quien eres: di el nombre («ficha la entrada de Juan») o pide que tu usuario este enlazado a tu operario en Ajustes > Usuarios."
        );
      }
      const open = await prisma.clocking.findFirst({ where: { mechanicId: mech.id, out: null } });
      base.refId = mech.id;
      if (parsed.intent === "clock_in" && open) return fail(`${mech.name} ya esta fichado desde las ${open.in.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`);
      if (parsed.intent === "clock_out" && !open) return fail(`${mech.name} no tiene la entrada fichada.`);
      return sum(parsed.intent === "clock_in" ? "Fichar la entrada" : "Fichar la salida", mech.name);
    }
    case "appointment": {
      const v = await findVehicle();
      if (v) {
        base.plate = v.plate;
        base.refId = v.id;
      }
      return sum("Nueva cita en la agenda", `${dateLabel(parsed.date!)} a las ${parsed.time}`, [base.plate, v?.customer.name].filter(Boolean).join(" · ") || "Sin matricula", parsed.text ? `Motivo: ${parsed.text}` : "");
    }
    case "pay_invoice": {
      const digits = base.plate!.replace(/\D/g, "").slice(0, 4);
      const invoices = (await prisma.invoice.findMany({ where: { plate: { contains: digits }, paymentStatus: { not: "cobrada" } }, orderBy: { createdAt: "desc" } })).filter(
        (i) => plateKey(i.plate) === plateKey(base.plate!)
      );
      const inv = invoices[0];
      if (!inv) return fail(`${base.plate} no tiene facturas pendientes de cobro.`);
      const due = Number(inv.total) - Number(inv.paidAmount);
      const amount = parsed.amount && parsed.amount > 0 ? Math.min(parsed.amount, due) : due;
      base.refId = inv.id;
      base.parsed = { ...parsed, amount, method: parsed.method || "efectivo" };
      return sum("Registrar un cobro", `Factura ${inv.number} · ${inv.clientName || inv.plate}`, `${eur(amount)} en ${METHOD_LABEL[parsed.method || "efectivo"]}${amount < due ? ` (quedaran ${eur(due - amount)})` : " (queda cobrada)"}`, invoices.length > 1 ? `Tiene ${invoices.length} facturas pendientes: uso la ultima.` : "");
    }
    case "cash_in":
    case "cash_out":
      if (!parsed.amount) return fail("Dime el importe, por ejemplo «salida de caja 20 euros gasolina».");
      return sum(parsed.intent === "cash_in" ? "Entrada de dinero en caja" : "Salida de dinero de caja", `${eur(parsed.amount)} · ${parsed.text || "sin concepto"}`);
    case "stock_in": {
      const articles = await prisma.article.findMany({ select: { id: true, name: true, price: true, stock: true, reference: true } });
      base.candidates = articles
        .map((a) => ({ a, score: Math.max(similarity(parsed.text, a.name), a.reference ? similarity(parsed.text, a.reference) : 0) }))
        .filter((x) => x.score >= 0.4)
        .sort((x, y) => y.score - x.score)
        .slice(0, 4)
        .map(({ a }) => ({ id: a.id, name: a.name, price: Number(a.price), stock: a.stock }));
      if (!base.candidates.length) return fail(`«${parsed.text}» no esta en el catalogo de articulos. Crealo primero en Articulos.`);
      return sum("Entrada en el almacen", `${parsed.qty} unidades`);
    }
    case "ask_stock": {
      const articles = await prisma.article.findMany({ select: { name: true, stock: true, minStock: true, location: true } });
      const hits = articles
        .map((a) => ({ a, s: similarity(parsed.text, a.name) }))
        .filter((x) => x.s >= 0.4)
        .sort((x, y) => y.s - x.s)
        .slice(0, 5);
      const exact = hits.length && hits[0].s >= 0.9;
      return {
        ...base,
        answer: hits.length
          ? (exact ? "" : `No tengo «${parsed.text}» tal cual. Lo mas parecido:\n`) +
            hits.map(({ a }) => `${a.name}: ${a.stock} ${a.stock === 1 ? "unidad" : "unidades"}${a.stock <= a.minStock && a.minStock ? " (por debajo del minimo)" : ""}${a.location ? ` · ${a.location}` : ""}`).join("\n")
          : `No encuentro «${parsed.text}» en el catalogo.`,
      };
    }
    case "ask_order": {
      if (!order) return fail(`${base.plate} no tiene ordenes.`);
      const [items, entries, mech, purchases] = await Promise.all([
        prisma.orderItem.findMany({ where: { orderId: order.id } }),
        prisma.timeEntry.findMany({ where: { orderId: order.id } }),
        order.mechanicId ? prisma.mechanic.findUnique({ where: { id: order.mechanicId } }) : null,
        prisma.purchase.count({ where: { orderId: order.id } }),
      ]);
      const ms = entries.reduce((s, e) => s + finishedEntryDurationMs(e), 0);
      const running = entries.find((e) => !e.end);
      const total = items.reduce((s, it) => s + it.qty * Number(it.price), 0);
      const lines = [
        `${order.plate}: ${STATUS_LABEL[order.status]}${order.description ? ` · ${order.description}` : ""}`,
        mech ? `Operario: ${mech.name}` : "Sin operario asignado",
        `Tiempo trabajado: ${Math.floor(ms / 3_600_000)} h ${Math.floor((ms % 3_600_000) / 60000)} min${running ? (running.paused ? " (en pausa)" : " (en marcha)") : ""}`,
        items.length ? `Apuntado: ${items.map((it) => `${it.qty} x ${it.name}`).join(", ")} · ${eur(total)} sin IVA` : "Sin piezas apuntadas",
        order.promisedAt ? `Prometida para el ${order.promisedAt.toLocaleDateString("es-ES")}` : "",
        purchases ? `${purchases} compra(s) vinculada(s)` : "",
        order.observations ? `Notas: ${order.observations.split("\n").slice(-2).join(" / ")}` : "",
      ];
      return { ...base, answer: lines.filter(Boolean).join("\n") };
    }
    case "ask_money": {
      if (parsed.text === "pendiente") {
        const pending = await prisma.invoice.findMany({ where: { paymentStatus: { not: "cobrada" } }, select: { total: true, paidAmount: true } });
        const t = pending.reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);
        return { ...base, answer: `Te deben ${eur(t)} en ${pending.length} factura(s) sin cobrar del todo.` };
      }
      const { start, end, label } = periodRange(tk, parsed.period || "hoy");
      if (parsed.text === "facturado") {
        const agg = await prisma.invoice.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { total: true, subtotal: true }, _count: true });
        return { ...base, answer: `Facturado ${label}: ${eur(Number(agg._sum.total) || 0)} con IVA (${eur(Number(agg._sum.subtotal) || 0)} sin IVA) en ${agg._count} factura(s).` };
      }
      const pays = await prisma.payment.findMany({ where: { date: { gte: start, lte: end } }, select: { amount: true, method: true } });
      const t = pays.reduce((s, p) => s + Number(p.amount), 0);
      const byMethod = ["efectivo", "tarjeta", "transferencia", "otro"]
        .map((m) => [m, pays.filter((p) => p.method === m).reduce((s, p) => s + Number(p.amount), 0)] as const)
        .filter(([, v]) => v > 0)
        .map(([m, v]) => `${m} ${eur(v)}`)
        .join(", ");
      return { ...base, answer: `Cobrado ${label}: ${eur(t)}${byMethod ? ` (${byMethod})` : ""}.` };
    }
    case "navigate": {
      const sec = parsed.section || "";
      if (sec === "ficha") {
        const v = await findVehicle();
        if (!v) return fail(`No encuentro la ficha de ${base.plate}.`);
        if (!canAccess(user, "fichas")) return fail("No tienes permiso para ver las fichas.");
        return { ...base, navigateTo: `/fichas?id=${v.id}`, answer: `Abriendo la ficha de ${v.plate}` };
      }
      if (sec === "orden") {
        if (!canAccess(user, "ordenes")) return fail("No tienes permiso para ver las ordenes.");
        return { ...base, navigateTo: `/ordenes?q=${encodeURIComponent(base.plate || "")}`, answer: `Abriendo las ordenes de ${base.plate}` };
      }
      if (sec === "recepcion_placa") {
        if (!order) return fail(`${base.plate} no tiene ninguna orden.`);
        if (!canAccess(user, "recepcion")) return fail("No tienes permiso para ver la recepcion.");
        return { ...base, navigateTo: `/recepcion?id=${order.id}`, answer: `Abriendo la recepcion de ${order.plate}` };
      }
      const target = NAV[sec];
      if (!target) return fail("No se a que pantalla quieres ir.");
      if (target.section && !canAccess(user, target.section)) return fail(`No tienes permiso para entrar en ${target.label}.`);
      return { ...base, navigateTo: target.href, answer: `Abriendo ${target.label}` };
    }
  }
  return fail("No se que hacer con eso.");
}

export async function executeVoice(
  p: VoiceProposal,
  edits: { qty: number; articleId: string | null; freeName: string; freePrice: number }
): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user || !p.intent || !p.parsed) return { ok: false, message: "No hay nada que hacer." };
  const section = INTENT_SECTION[p.intent];
  if (section && !canAccess(user, section)) return { ok: false, message: "No tienes permiso para hacer eso." };
  const parsed = p.parsed;
  const qty = Math.max(1, Math.min(999, Math.round(edits.qty) || 1));
  const done = async (message: string, log: string, detail: string) => {
    await logAction(`Por voz: ${log}`, detail);
    for (const path of ["/ordenes", "/taller", "/articulos", "/horario", "/recepcion", "/fichas", "/agenda", "/caja", "/facturas", "/operarios", "/avisos", "/"]) revalidatePath(path);
    return { ok: true, message };
  };

  const order = p.orderId ? await prisma.order.findUnique({ where: { id: p.orderId } }) : null;
  if (NEEDS_ORDER.has(p.intent) && !order) return { ok: false, message: "No encuentro la orden." };

  switch (p.intent) {
    case "new_order": {
      const o = await prisma.order.create({ data: { plate: (p.plate || "").toUpperCase(), description: parsed.text.trim() } });
      return done(`Orden abierta para ${o.plate}.`, "orden nueva", `${o.plate} ${o.description}`);
    }
    case "add_item": {
      if (edits.articleId) {
        const article = await prisma.article.findUnique({ where: { id: edits.articleId } });
        if (!article) return { ok: false, message: "Ese articulo ya no existe." };
        await prisma.$transaction(async (tx) => {
          const existing = await tx.orderItem.findFirst({ where: { orderId: order!.id, articleId: article.id } });
          if (existing) await tx.orderItem.update({ where: { id: existing.id }, data: { qty: existing.qty + qty } });
          else await tx.orderItem.create({ data: { orderId: order!.id, articleId: article.id, name: article.name, price: article.price, costPrice: article.costPrice, qty } });
          await moveStock(tx, { articleId: article.id, qty: -qty, kind: "salida_orden", orderId: order!.id, plate: order!.plate });
        });
        return done(`Apuntado ${qty} x ${article.name} en ${order!.plate}.`, "articulo apuntado", `${order!.plate}: ${qty} x ${article.name}`);
      }
      const name = edits.freeName.trim();
      if (!name) return { ok: false, message: "Falta el nombre de lo que hay que apuntar." };
      await prisma.orderItem.create({ data: { orderId: order!.id, name, price: Math.max(0, edits.freePrice || 0), qty } });
      return done(`Apuntado ${qty} x ${name} en ${order!.plate}${edits.freePrice ? "" : " (sin precio: ponselo en la orden)"}.`, "concepto apuntado", `${order!.plate}: ${qty} x ${name}`);
    }
    case "note": {
      const stamp = new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
      const observations = [order!.observations, `[${stamp}] ${parsed.text.trim()}`].filter(Boolean).join("\n");
      await prisma.order.update({ where: { id: order!.id }, data: { observations } });
      return done(`Nota guardada en ${order!.plate}.`, "nota", `${order!.plate}: ${parsed.text}`);
    }
    case "status": {
      if (!parsed.status) return { ok: false, message: "Falta el estado." };
      await prisma.order.update({ where: { id: order!.id }, data: { status: parsed.status } });
      return done(`${order!.plate} pasa a «${STATUS_LABEL[parsed.status]}».`, "estado", `${order!.plate}: ${STATUS_LABEL[parsed.status]}`);
    }
    case "timer_start":
    case "timer_resume":
    case "timer_pause":
    case "timer_stop": {
      const running = await prisma.timeEntry.findFirst({ where: { orderId: order!.id, end: null } });
      if (p.intent === "timer_pause") {
        if (!running) return { ok: true, message: `${order!.plate} no tiene el tiempo en marcha.` };
        if (running.paused) return { ok: true, message: `El tiempo de ${order!.plate} ya estaba en pausa.` };
        await prisma.timeEntry.update({ where: { id: running.id }, data: { paused: true, pauseStart: new Date() } });
        return done(`Tiempo de ${order!.plate} en pausa.`, "tiempo en pausa", order!.plate);
      }
      if (p.intent === "timer_stop") {
        if (!running) return { ok: true, message: `${order!.plate} no tenia el tiempo en marcha.` };
        const pausedMs = running.pausedMs + (running.paused && running.pauseStart ? Date.now() - running.pauseStart.getTime() : 0);
        await prisma.timeEntry.update({ where: { id: running.id }, data: { end: new Date(), paused: false, pauseStart: null, pausedMs } });
        return done(`Tiempo terminado en ${order!.plate}.`, "tiempo terminado", order!.plate);
      }
      // empezar o reanudar
      if (running?.paused && running.pauseStart) {
        await prisma.timeEntry.update({ where: { id: running.id }, data: { paused: false, pausedMs: running.pausedMs + (Date.now() - running.pauseStart.getTime()), pauseStart: null } });
        return done(`Tiempo de ${order!.plate} reanudado.`, "tiempo reanudado", order!.plate);
      }
      if (running) return { ok: true, message: `El tiempo de ${order!.plate} ya estaba en marcha.` };
      await prisma.timeEntry.create({ data: { task: order!.description || "Reparacion", plate: order!.plate, orderId: order!.id, mechanicId: order!.mechanicId || user.mechanicId || null } });
      if (order!.status === "abierta") await prisma.order.update({ where: { id: order!.id }, data: { status: "en_progreso" } });
      return done(`Tiempo en marcha para ${order!.plate}.`, "tiempo empezado", order!.plate);
    }
    case "assign": {
      const mech = p.refId ? await prisma.mechanic.findUnique({ where: { id: p.refId } }) : null;
      if (!mech) return { ok: false, message: "No encuentro al operario." };
      await prisma.order.update({ where: { id: order!.id }, data: { mechanicId: mech.id } });
      return done(`${order!.plate} asignada a ${mech.name}.`, "orden asignada", `${order!.plate} -> ${mech.name}`);
    }
    case "plan_date":
    case "promise_date": {
      const date = new Date(`${parsed.date}T09:00:00`);
      await prisma.order.update({ where: { id: order!.id }, data: p.intent === "plan_date" ? { plannedDate: date } : { promisedAt: date } });
      return done(`${p.intent === "plan_date" ? "Dia de trabajo" : "Entrega"} de ${order!.plate}: ${dateLabel(parsed.date!)}.`, p.intent === "plan_date" ? "dia de trabajo" : "fecha prometida", `${order!.plate}: ${parsed.date}`);
    }
    case "finding": {
      const reception = await getOrCreateReception(order!.id);
      await prisma.finding.create({ data: { receptionId: reception.id, text: parsed.text.trim(), price: parsed.amount ?? null } });
      return done(`Hallazgo anadido a la recepcion de ${order!.plate}.`, "hallazgo", `${order!.plate}: ${parsed.text}`);
    }
    case "mileage": {
      if (!p.refId || !parsed.km) return { ok: false, message: "Faltan los km." };
      const v = await prisma.vehicle.update({ where: { id: p.refId }, data: { mileage: parsed.km } });
      const open = await prisma.order.findFirst({ where: { plate: v.plate, status: { not: "cerrada" } }, include: { reception: true }, orderBy: { createdAt: "desc" } });
      if (open?.reception) await prisma.reception.update({ where: { id: open.reception.id }, data: { mileage: parsed.km } });
      return done(`${v.plate}: ${parsed.km.toLocaleString("es-ES")} km guardados.`, "kilometros", `${v.plate}: ${parsed.km}`);
    }
    case "itv":
    case "service": {
      if (!p.refId || !parsed.date) return { ok: false, message: "Falta la fecha." };
      const date = new Date(`${parsed.date}T12:00:00`);
      const v = await prisma.vehicle.update({
        where: { id: p.refId },
        data: p.intent === "itv" ? { itvDate: date } : { nextServiceDate: date, ...(parsed.text ? { reminderNote: parsed.text } : {}) },
      });
      return done(`${p.intent === "itv" ? "ITV" : "Revision"} de ${v.plate}: ${dateLabel(parsed.date)}.`, p.intent === "itv" ? "fecha ITV" : "fecha revision", `${v.plate}: ${parsed.date}`);
    }
    case "clock_in":
    case "clock_out": {
      const mech = p.refId ? await prisma.mechanic.findUnique({ where: { id: p.refId } }) : null;
      if (!mech) return { ok: false, message: "No encuentro al operario." };
      const open = await prisma.clocking.findFirst({ where: { mechanicId: mech.id, out: null } });
      if (p.intent === "clock_in") {
        if (open) return { ok: true, message: `${mech.name} ya estaba fichado.` };
        await prisma.clocking.create({ data: { mechanicId: mech.id, note: "Fichado por voz" } });
        return done(`Entrada de ${mech.name} fichada.`, "fichaje entrada", mech.name);
      }
      if (!open) return { ok: true, message: `${mech.name} no tenia la entrada fichada.` };
      await prisma.clocking.update({ where: { id: open.id }, data: { out: new Date() } });
      return done(`Salida de ${mech.name} fichada.`, "fichaje salida", mech.name);
    }
    case "appointment": {
      const v = p.refId ? await prisma.vehicle.findUnique({ where: { id: p.refId }, include: { customer: true } }) : null;
      const date = new Date(`${parsed.date}T${parsed.time || "09:00"}:00`);
      await prisma.appointment.create({
        data: { date, plate: (p.plate || "").toUpperCase(), clientName: v?.customer.name || "", phone: v?.customer.phone || "", reason: parsed.text.trim() },
      });
      return done(`Cita guardada: ${dateLabel(parsed.date!)} a las ${parsed.time}.`, "cita", `${p.plate || ""} ${parsed.date} ${parsed.time} ${parsed.text}`);
    }
    case "pay_invoice": {
      if (!p.refId || !parsed.amount) return { ok: false, message: "No hay factura que cobrar." };
      const fd = new FormData();
      fd.set("amount", String(parsed.amount));
      fd.set("paymentMethod", parsed.method || "efectivo");
      fd.set("note", "Cobrado por voz");
      await addPayment(p.refId, fd);
      return done(`Cobro de ${eur(parsed.amount)} registrado.`, "cobro", `${p.plate}: ${parsed.amount}`);
    }
    case "cash_in":
    case "cash_out": {
      if (!parsed.amount) return { ok: false, message: "Falta el importe." };
      const fd = new FormData();
      fd.set("kind", p.intent === "cash_in" ? "entrada" : "salida");
      fd.set("amount", String(parsed.amount));
      fd.set("concept", parsed.text || (p.intent === "cash_in" ? "Entrada por voz" : "Salida por voz"));
      await addCashMovement(fd);
      return done(`${p.intent === "cash_in" ? "Entrada" : "Salida"} de caja de ${eur(parsed.amount)} apuntada.`, "caja", `${parsed.text} ${parsed.amount}`);
    }
    case "stock_in": {
      if (!edits.articleId) return { ok: false, message: "Elige el articulo." };
      const fd = new FormData();
      fd.set("qty", String(qty));
      fd.set("note", "Entrada por voz");
      if (parsed.amount) fd.set("unitCost", String(parsed.amount));
      await addStockEntry(edits.articleId, fd);
      const a = await prisma.article.findUnique({ where: { id: edits.articleId } });
      return done(`Entrada de ${qty} x ${a?.name}: ahora hay ${a?.stock}.`, "entrada almacen", `${qty} x ${a?.name}`);
    }
  }
  return { ok: false, message: "Eso no se hace con confirmacion." };
}
