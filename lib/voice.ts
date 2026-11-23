/**
 * Interprete de ordenes dictadas por voz (sin IA). Entiende frases tipicas del taller:
 *  ordenes:   "1234 BCD apuntale un limpiador de frenos", "anota que hace ruido", "pasala a esperando piezas",
 *             "abre una orden para 5678 KLM cambio de aceite", "asignasela a Juan", "prometela para el viernes"
 *  tiempo:    "empieza / pausa / reanuda / termina el tiempo"
 *  recepcion: "hallazgo pastillas gastadas 80 euros", "tiene 125000 km"
 *  ficha:     "la ITV le caduca el 15 de marzo", "la revision le toca en junio"
 *  jornada:   "ficho la entrada", "me voy", "ficha la salida de Juan"
 *  agenda:    "cita manana a las 10 para 1234 BCD revision"
 *  caja:      "cobra la factura de 1234 con tarjeta", "salida de caja 20 euros gasolina"
 *  almacen:   "han llegado 10 filtros de aceite"
 *  ir a:      "abre facturas", "ensename la ficha de 1234"
 *  preguntas: "cuantos filtros de aceite quedan", "como va la 1234", "cuanto hemos cobrado hoy"
 * Sin dependencias: se usa en el servidor y se puede probar con node.
 */

export type VoiceIntent =
  | "add_item"
  | "note"
  | "status"
  | "timer_start"
  | "timer_pause"
  | "timer_resume"
  | "timer_stop"
  | "new_order"
  | "assign"
  | "plan_date"
  | "promise_date"
  | "finding"
  | "mileage"
  | "itv"
  | "service"
  | "clock_in"
  | "clock_out"
  | "appointment"
  | "pay_invoice"
  | "cash_in"
  | "cash_out"
  | "stock_in"
  | "navigate"
  | "ask_stock"
  | "ask_order"
  | "ask_money";

export type ParsedVoice = {
  intent: VoiceIntent | null;
  /** Matricula completa si se ha dictado, p. ej. "1234BCD" */
  plate: string | null;
  /** Solo los 4 numeros si no se entendieron las letras ("1234") */
  plateDigits: string | null;
  qty: number;
  /** Lo que hay que anadir, la nota, el nombre del operario, el concepto... */
  text: string;
  status: "abierta" | "en_progreso" | "pendiente_piezas" | "cerrada" | null;
  /** Importe en euros si se ha dicho */
  amount?: number | null;
  method?: "efectivo" | "tarjeta" | "transferencia" | "otro" | null;
  /** Fecha AAAA-MM-DD y hora HH:MM calculadas desde "hoy" */
  date?: string | null;
  time?: string | null;
  km?: number | null;
  /** Seccion a la que ir (claves de lib/permissions) o "ficha"/"orden"/"recepcion" de la matricula */
  section?: string | null;
  /** Periodo para preguntas de dinero */
  period?: "hoy" | "semana" | "mes" | "ano" | null;
};

export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:!?¿¡"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DIGITS: Record<string, string> = { cero: "0", uno: "1", una: "1", un: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9" };
const LETTERS: Record<string, string> = {
  a: "a", be: "b", b: "b", ce: "c", c: "c", de: "d", d: "d", e: "e", efe: "f", f: "f", ge: "g", g: "g", hache: "h", h: "h", i: "i", jota: "j", j: "j", ka: "k", k: "k",
  ele: "l", l: "l", eme: "m", m: "m", ene: "n", n: "n", o: "o", pe: "p", p: "p", cu: "q", q: "q", erre: "r", r: "r", ese: "s", s: "s", te: "t", t: "t", u: "u",
  uve: "v", v: "v", w: "w", equis: "x", x: "x", ye: "y", y: "y", zeta: "z", z: "z",
};
const NOT_PLATE_AFTER = new Set(["euros", "euro", "eur", "pavos", "km", "kms", "kilometros", "kilometro", "litros", "horas", "hora", "h", "minutos", "unidades"]);
const MONTHS: Record<string, number> = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const WEEKDAYS: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };
const QTY: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 1, media: 1 };

// ---- Numeros dichos con palabras: "nueve mil trescientos sesenta y ocho", "noventa y tres sesenta y ocho" ----
const UNITS: Record<string, number> = { cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const TEENS: Record<string, number> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const TENS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

/** Clase de cada palabra: 1 unidades, 2 decenas, 3 centenas, 4 mil */
function numClass(w: string) {
  if (w in UNITS) return 1;
  if (w in TEENS) return 2;
  if (w in TENS) return 2;
  if (w in HUNDREDS) return 3;
  if (w === "mil") return 4;
  return 0;
}

/**
 * Cambia los numeros dichos con palabras por cifras. Cada grupo que no puede seguir
 * (p. ej. "noventa" despues de "sesenta y ocho") empieza un numero nuevo.
 * No toca "un"/"una" para no romper "un filtro".
 */
export function wordsToDigits(text: string) {
  const tokens = text.split(" ");
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!numClass(tokens[i])) {
      out.push(tokens[i]);
      i++;
      continue;
    }
    let total = 0;
    let cur = 0;
    let last = 9; // clase de la ultima palabra del grupo
    let tensOpen = false; // acabamos de decir una decena tipo "noventa" y puede venir "y tres"
    let used = 0;
    while (i < tokens.length) {
      const w = tokens[i];
      if (w === "y" && tensOpen && i + 1 < tokens.length && tokens[i + 1] in UNITS) {
        cur += UNITS[tokens[i + 1]];
        i += 2;
        used += 2;
        tensOpen = false;
        last = 1;
        continue;
      }
      const c = numClass(w);
      if (!c) break;
      if (w === "mil") {
        if (last <= 3 || used === 0) {
          total += (cur || 1) * 1000;
          cur = 0;
          last = 4;
          tensOpen = false;
          i++;
          used++;
          continue;
        }
        break;
      }
      // Una palabra del mismo orden o mayor que la anterior empieza otro numero ("nueve tres", "sesenta noventa")
      if (used > 0 && c >= last && last !== 4) break;
      if (w in UNITS) cur += UNITS[w];
      else if (w in TEENS) cur += TEENS[w];
      else if (w in TENS) {
        cur += TENS[w];
        tensOpen = true;
      } else if (w in HUNDREDS) cur += HUNDREDS[w];
      last = c;
      i++;
      used++;
      if (!(w in TENS)) tensOpen = false;
    }
    out.push(String(total + cur));
  }
  return out.join(" ");
}

/** Busca una matricula en el texto. Devuelve la matricula, el resto del texto sin ella y los digitos sueltos. */
export function extractPlate(text: string): { plate: string | null; digits: string | null; rest: string } {
  const t = wordsToDigits(norm(text))
    .replace(/uve doble/g, "w")
    .replace(/i griega/g, "y")
    // "1234bcd" o "m1234ab" escrito todo junto: lo separamos
    .replace(/\b([a-z]{1,2})?(\d{4})([a-z]{1,3})\b/g, (_, a, d, l) => `${a ? a + " " : ""}${d} ${l}`);
  const tokens = t.split(" ");

  // Recorre el texto buscando 4 cifras seguidas (en numero o en palabras sueltas)
  for (let i = 0; i < tokens.length; i++) {
    let digits = "";
    let j = i;
    while (j < tokens.length && digits.length < 4) {
      const tok = tokens[j];
      if (/^\d+$/.test(tok) && digits.length + tok.length <= 4) digits += tok;
      else if (DIGITS[tok] && !(digits.length === 0 && ["un", "una"].includes(tok))) digits += DIGITS[tok];
      else break;
      j++;
    }
    if (digits.length !== 4) continue;
    // No es matricula si es un importe, km, una hora o un ano: "1500 euros", "a las 10 30", "marzo de 2027"
    const prev = tokens[i - 1] || "";
    const prev2 = tokens[i - 2] || "";
    if (NOT_PLATE_AFTER.has(tokens[j] || "") || ["las", "ano", "anos"].includes(prev) || prev in MONTHS || (prev === "de" && prev2 in MONTHS)) continue;

    // Formato antiguo: letras de provincia delante ("m 1234 ab")
    const before = i > 0 && /^[a-z]{1,2}$/.test(tokens[i - 1]) && !["a", "la", "el", "de", "en", "y", "o"].includes(tokens[i - 1]) ? tokens[i - 1] : "";

    // Letras detras: "bcd", "b c d", "be ce de" (en las antiguas pueden ser vocales)
    let letters = "";
    let k = j;
    const max = before ? 2 : 3;
    const re = before ? /^[a-z]{1,2}$/ : /^[bcdfghjklmnprstvwxyz]{2,3}$/;
    while (k < tokens.length && letters.length < max) {
      const tok = tokens[k];
      if (re.test(tok) && letters.length + tok.length <= max && !(before && LETTERS[tok] && tok.length > 1 && !/^[a-z]{1,2}$/.test(tok))) letters += tok;
      else if (LETTERS[tok] && (before || /[bcdfghjklmnprstvwxyz]/.test(LETTERS[tok]))) letters += LETTERS[tok];
      else break;
      k++;
    }

    if (!before && letters.length === 3) {
      const rest = [...tokens.slice(0, i), ...tokens.slice(k)].join(" ");
      return { plate: (digits + letters).toUpperCase(), digits, rest };
    }
    if (before && letters.length >= 1) {
      const rest = [...tokens.slice(0, i - 1), ...tokens.slice(k)].join(" ");
      return { plate: (before + digits + letters).toUpperCase(), digits, rest };
    }
    const rest = [...tokens.slice(0, i), ...tokens.slice(j)].join(" ");
    return { plate: null, digits, rest };
  }
  return { plate: null, digits: null, rest: t };
}

const STATUS_WORDS: [RegExp, ParsedVoice["status"]][] = [
  [/(esperando|pendiente de|falta[n]?) (las )?piezas|pend(iente)? piezas/, "pendiente_piezas"],
  [/en curso|en progreso|trabajando|empezada/, "en_progreso"],
  [/terminad[ao]|acabad[ao]|cerrad[ao]|lista|finalizad[ao]/, "cerrada"],
  [/abierta|pendiente de empezar|sin empezar/, "abierta"],
];

/** Quita palabras de relleno del principio: "a la", "al", "del", "matricula"... */
function stripFillers(s: string) {
  return s
    .replace(/\b(matricula|coche|vehiculo|orden)\b/g, " ")
    .replace(/^\s*(oye|vale|bueno|a ver|por favor)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(a la|al|a el|del|de la|la|el|para la|para el|en la|en el)\s+/, "")
    .trim();
}

// ---------- Fechas, horas, importes ----------

function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "hoy", "manana", "pasado manana", "el viernes", "el 15 de marzo", "el 15", "en junio", "dentro de un ano"... */
export function parseDate(s: string, todayKey: string): string | null {
  const today = new Date(`${todayKey}T12:00:00`);
  const d = new Date(today);
  if (/\bpasado manana\b/.test(s)) {
    d.setDate(d.getDate() + 2);
    return keyOf(d);
  }
  if (/\bmanana\b/.test(s) && !/\b(de|por|esta) la manana\b/.test(s.replace(/\bmanana\b.*\bmanana\b/, ""))) {
    d.setDate(d.getDate() + 1);
    return keyOf(d);
  }
  if (/\bhoy\b/.test(s)) return todayKey;
  let m = s.match(/\bdentro de (\d+|un|una) (dia|dias|semana|semanas|mes|meses|ano|anos)\b/);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : 1;
    if (m[2].startsWith("dia")) d.setDate(d.getDate() + n);
    else if (m[2].startsWith("semana")) d.setDate(d.getDate() + n * 7);
    else if (m[2].startsWith("mes")) d.setMonth(d.getMonth() + n);
    else d.setFullYear(d.getFullYear() + n);
    return keyOf(d);
  }
  m = s.match(/\b(?:el )?(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de(?:l)? (\d{4}))?\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = MONTHS[m[2]] - 1;
    let year = m[3] ? parseInt(m[3], 10) : today.getFullYear();
    let res = new Date(year, month, day, 12);
    if (!m[3] && res < today) res = new Date(++year, month, day, 12);
    return keyOf(res);
  }
  m = s.match(/\b(?:en|para|de) (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de(?:l)? (\d{4}))?\b/);
  if (m) {
    const month = MONTHS[m[1]] - 1;
    let year = m[2] ? parseInt(m[2], 10) : today.getFullYear();
    if (!m[2] && month < today.getMonth()) year++;
    return keyOf(new Date(year, month, 1, 12));
  }
  m = s.match(/\b(?:el |este |el proximo |el que viene )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
  if (m) {
    const target = WEEKDAYS[m[1]];
    let diff = (target - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return keyOf(d);
  }
  m = s.match(/\bel (?:dia )?(\d{1,2})\b(?! de \d)/);
  if (m) {
    const day = parseInt(m[1], 10);
    if (day >= 1 && day <= 31) {
      let res = new Date(today.getFullYear(), today.getMonth(), day, 12);
      if (res < today) res = new Date(today.getFullYear(), today.getMonth() + 1, day, 12);
      return keyOf(res);
    }
  }
  return null;
}

/** "a las 10", "a las 10 y media", "a las 4 de la tarde", "a las 16 30", "a las 9 menos cuarto" */
export function parseTime(s: string): string | null {
  const m = s.match(/\ba las? (\d{1,2})(?: (?:y )?(\d{1,2}))?( y media| y cuarto| menos cuarto)?( de la tarde| de la noche| de la manana)?\b/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  if (m[3] === " y media") min = 30;
  if (m[3] === " y cuarto") min = 15;
  if (m[3] === " menos cuarto") {
    h -= 1;
    min = 45;
  }
  if ((m[4] === " de la tarde" || m[4] === " de la noche") && h < 12) h += 12;
  // Sin "de la tarde": en el taller las 1-7 suelen ser de la tarde
  if (!m[4] && h >= 1 && h <= 7) h += 12;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "80 euros", "20 con 50", "15,5 €" */
export function parseAmount(s: string): number | null {
  const m = s.match(/\b(\d+)(?:[.,](\d{1,2})| con (\d{1,2}))?\s*(euros?|eur|pavos|€)/) || s.match(/\b(\d+)(?:[.,](\d{1,2})| con (\d{1,2}))\b/);
  if (!m) return null;
  const cents = m[2] || m[3];
  return parseFloat(`${m[1]}.${cents ? cents.padEnd(2, "0") : "0"}`);
}

function parseMethod(s: string): ParsedVoice["method"] {
  if (/\btarjeta|datafono\b/.test(s)) return "tarjeta";
  if (/\btransferencia\b/.test(s)) return "transferencia";
  if (/\bbizum\b/.test(s)) return "otro";
  if (/\befectivo|metalico|en mano|cash\b/.test(s)) return "efectivo";
  return null;
}

/** Palabras con las que se nombra cada pantalla */
const SECTION_WORDS: [RegExp, string][] = [
  [/\b(planificador|tablero|taller)\b/, "taller"],
  [/\b(facturas?|facturacion)\b/, "facturas"],
  [/\bpresupuestos?\b/, "presupuestos"],
  [/\b(caja|cobros)\b/, "caja"],
  [/\b(compras|proveedores?|pedidos|albaranes|gastos)\b/, "compras"],
  [/\b(agenda|citas?|calendario)\b/, "agenda"],
  [/\bavisos\b/, "avisos"],
  [/\b(fichas|clientes)\b/, "fichas"],
  [/\brecepcion\b/, "recepcion"],
  [/\bordenes\b/, "ordenes"],
  [/\b(articulos|almacen|stock|catalogo)\b/, "articulos"],
  [/\b(horario|control horario|cronometros?)\b/, "horario"],
  [/\b(operarios|mecanicos|fichaje|jornada)\b/, "operarios"],
  [/\b(fiscal|impuestos|iva|hacienda|modelo|gestoria)\b/, "fiscal"],
  [/\brentabilidad\b/, "rentabilidad"],
  [/\b(cortesia|coches de cortesia|sustitucion)\b/, "cortesia"],
  [/\b(aseguradoras?|seguros?)\b/, "aseguradoras"],
  [/\bdiagnostico\b/, "diagnostico"],
  [/\b(ajustes|configuracion)\b/, "ajustes"],
  [/\b(usuarios|permisos)\b/, "usuarios"],
  [/\b(registro de acciones|historial de acciones)\b/, "registro"],
  [/\b(pagina web|la web)\b/, "web"],
  [/\b(menu|todos los modulos)\b/, "menu"],
  [/\binicio\b/, "inicio"],
];

export function parseVoice(text: string, todayKey?: string): ParsedVoice {
  const { plate, digits, rest } = extractPlate(text);
  const s = stripFillers(rest);
  const full = norm(rest);
  const out: ParsedVoice = { intent: null, plate, plateDigits: plate ? null : digits, qty: 1, text: "", status: null };
  const tk = todayKey || keyOf(new Date());
  const hasPlate = !!(plate || digits);
  let m: RegExpMatchArray | null;

  // ---- Preguntas (no cambian nada) ----
  if (/^(cuant[oa]s?|que|como|cual|dime|hay)\b/.test(full) || /\?\s*$/.test(text)) {
    if (/\b(cobrado|facturado|vendido|ingresado|hecho de caja|sacado)\b/.test(full)) {
      out.intent = "ask_money";
      out.period = /\bsemana\b/.test(full) ? "semana" : /\bmes\b/.test(full) ? "mes" : /\bano\b/.test(full) ? "ano" : "hoy";
      out.text = /\bfacturado|vendido\b/.test(full) ? "facturado" : "cobrado";
      return out;
    }
    if (/\b(nos deben|pendiente de cobro|sin cobrar|debe)\b/.test(full)) {
      out.intent = "ask_money";
      out.text = "pendiente";
      return out;
    }
    m = full.match(/\b(?:cuant[oa]s?|hay|queda[n]?|tenemos|stock de|existencias de)\b\s*(?:hay|quedan?|tenemos)?\s*(?:de )?(.*?)\s*(?:quedan?|hay|tenemos|en el almacen|en stock)?$/);
    if (m && m[1] && !hasPlate && /\b(cuant|queda|stock|existencias|hay)/.test(full)) {
      out.intent = "ask_stock";
      out.text = cleanItem(m[1].replace(/\b(quedan?|hay|tenemos|en el almacen|en stock)\b/g, "").trim());
      if (out.text) return out;
    }
    if (hasPlate && /\b(como va|que (le )?(lleva|tiene|falta|hay)|estado|que pasa|resumen|cuanto (va|lleva|es))\b/.test(full)) {
      out.intent = "ask_order";
      return out;
    }
  }

  // ---- "Anota que..." manda sobre todo lo demas: lo que venga detras es la nota ----
  m = s.match(/^(?:anota(?:le)?|apunta(?:le)? que|ponle que|escribe(?:le)? que|nota|observacion(?:es)?)\b\s*(?:que|de que|:)?\s*(.+)$/);
  if (m && m[1]) {
    out.intent = "note";
    out.text = m[1].trim();
    return out;
  }

  // ---- Ir a una pantalla ----
  if (/^(abre|abreme|ve|vete|vamos|llevame|ensename|muestrame|ir|pasa|quiero ver|ver|mira|mirame)\b/.test(full) && !/\b(una|nueva) orden\b/.test(full)) {
    if (hasPlate && /\bficha\b/.test(full)) {
      out.intent = "navigate";
      out.section = "ficha";
      return out;
    }
    if (hasPlate && /\brecepcion\b/.test(full)) {
      out.intent = "navigate";
      out.section = "recepcion_placa";
      return out;
    }
    if (hasPlate && /\b(orden|ordenes)\b/.test(text.toLowerCase())) {
      out.intent = "navigate";
      out.section = "orden";
      return out;
    }
    for (const [re, sec] of SECTION_WORDS) {
      if (re.test(full)) {
        out.intent = "navigate";
        out.section = sec;
        return out;
      }
    }
  }

  // ---- Nueva orden ----
  if (/\b(abre|abrir|crea|crear|nueva|haz|hazme)\b( una| la)? (nueva )?orden\b/.test(norm(text)) || /\bnueva orden\b/.test(norm(text))) {
    const desc = wordsToDigits(norm(text)).replace(/.*\borden\b( de trabajo| de reparacion)?/, "");
    out.intent = "new_order";
    out.text = cleanItem(extractPlate(desc).rest.replace(/^(para|a|de)?\s*(la|el)?\s*/, ""));
    return out;
  }

  // ---- Fichaje (registro de jornada) ----
  if (!/\bcaja\b/.test(full)) {
    if (/\b(fich(o|a|ar|ame|ale)|ficha(r)? la)\b/.test(full) || /^(entro|salgo|me voy|he llegado|ya estoy|me marcho|me piro|llego)\b/.test(full) || /\b(entra|sale) a trabajar\b/.test(full)) {
      const isOut = /\b(salida|salgo|sale|me voy|me marcho|me piro|termino la jornada)\b/.test(full);
      out.intent = isOut ? "clock_out" : "clock_in";
      m = full.match(/\b(?:de|a|para)\s+([a-z]+(?: [a-z]+)?)$/);
      const name = m && !/^(la|el|entrada|salida|trabajar|jornada|casa|comer)$/.test(m[1].split(" ")[0]) ? m[1] : "";
      out.text = name;
      return out;
    }
  }

  // ---- Caja ----
  if (/\bcaja\b/.test(full) && /\b(entrada|salida|saco|sacado|meto|metido|pago|pagado|retiro|ingreso)\b/.test(full)) {
    out.intent = /\b(salida|saco|sacado|pago|pagado|retiro)\b/.test(full) ? "cash_out" : "cash_in";
    out.amount = parseAmount(full);
    out.text = full
      .replace(/\b(entrada|salida|de|en|la|caja|saco|sacado|meto|metido|pago|pagado|retiro|ingreso|apunta|apuntame|una|un|por|para|del)\b/g, " ")
      .replace(/\b\d+(?:[.,]\d+)?( con \d+)?\s*(euros?|eur|pavos|€)?/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return out;
  }

  // ---- Cobrar factura ----
  if (/\b(cobra|cobrale|cobrar|cobrada|cobrado|ha pagado|me ha pagado|paga|pagada|pago la factura)\b/.test(full) && !/\b(cuanto)\b/.test(full)) {
    out.intent = "pay_invoice";
    out.amount = parseAmount(full);
    out.method = parseMethod(full);
    return out;
  }

  // ---- Entrada en almacen ----
  m = full.match(/\b(?:han llegado|ha llegado|llegan|llego|hemos recibido|he recibido|recibido|entrada de|mete en el almacen|al almacen|en el almacen)\b\s*(.*)$/);
  if (m && m[1] && !/\b(hallazgo|cliente)\b/.test(full)) {
    let item = m[1].replace(/\b(al almacen|en el almacen|al stock)\b/g, "").trim();
    const q = item.match(/^(\d+|un|una|uno|medio|media)\s+(.*)$/);
    if (q) {
      out.qty = /^\d+$/.test(q[1]) ? parseInt(q[1], 10) : QTY[q[1]] || 1;
      item = q[2];
    }
    out.intent = "stock_in";
    out.text = cleanItem(item);
    out.amount = parseAmount(full);
    if (out.text) return out;
  }

  // ---- Cita en la agenda ----
  if (/\b(cita|reserva|dale hora|apunta(le)? (para )?el)\b/.test(full) && (parseDate(full, tk) || parseTime(full))) {
    out.intent = "appointment";
    out.date = parseDate(full, tk) || tk;
    out.time = parseTime(full) || "09:00";
    m = full.match(/\b(?:para|de) (?:una |la |el )?((?:revision|cambio|itv|pre ?itv|diagnostico|reparacion|mantenimiento|neumaticos|frenos|aceite)\b.*)$/);
    out.text = (m ? m[1] : full.replace(/.*\b(cita|reserva)\b/, ""))
      .replace(/\b(manana|pasado manana|hoy|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|a las? \d+( y media| y cuarto| menos cuarto| \d+)?( de la tarde| de la manana| de la noche)?|el \d+ de [a-z]+|el \d+)\b/g, "")
      .replace(/^\s*(para|de|una|la|el)\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
    return out;
  }

  // ---- Tiempo de trabajo ----
  const timerWord = /\b(tiempo|cronometro|reloj|contador|temporizador)\b/.test(full);
  if (/\b(pausa|pausar|pausalo|pausala|pon(lo|la)? en pausa|en pausa|para un momento|parada para)\b/.test(full) && (timerWord || /^(pausa|pon en pausa)/.test(full))) {
    out.intent = "timer_pause";
    return out;
  }
  if (/\b(reanuda|reanudar|reanudalo|continua|continuar|sigue|seguir|sigo|quita la pausa|vuelve a (empezar|arrancar|poner|contar)|vuelvo con)\b/.test(full) && (timerWord || /^(reanuda|continua|sigo|sigue)/.test(full))) {
    out.intent = "timer_resume";
    return out;
  }
  if (/\b(para|parar|paralo|deten|detener|termina|terminar|acaba|acabar|cierra|cerrar|stop|finaliza|apaga)\b/.test(full) && timerWord) {
    out.intent = "timer_stop";
    return out;
  }
  if ((/\b(empieza|empiezo|empezar|arranca|arrancar|inicia|iniciar|comienza|comienzo|dale al|pon en marcha|enciende|activa)\b/.test(full) && (timerWord || /\btrabajo\b/.test(full))) || /^(empiezo|empiezo con|me pongo con)\b/.test(full)) {
    out.intent = "timer_start";
    return out;
  }

  // ---- Asignar operario ----
  m = full.match(/\b(?:asigna(?:la|lo|sela|selo|le)?|que la haga|que lo haga|se la doy a|pasasela a|pasaselo a|dasela a|daselo a|para que la haga|la hace|lo hace|la lleva|lo lleva)\b(?: a| al| el)?\s+([a-z]+(?: [a-z]+)?)$/);
  if (m) {
    out.intent = "assign";
    out.text = m[1];
    return out;
  }

  // ---- Fechas de la orden ----
  if (/\b(prometida|prometela|prometelo|prometido|entregar|entrega|entregala|la quiere|lo quiere|la recoge|lo recoge|recogida)\b/.test(full)) {
    const d = parseDate(full, tk);
    if (d) {
      out.intent = "promise_date";
      out.date = d;
      return out;
    }
  }
  if (/\b(planifica(la|lo)?|programa(la|lo)?|para trabajar|trabajala|hazla|la hacemos|se hace|trabajo para)\b/.test(full)) {
    const d = parseDate(full, tk);
    if (d) {
      out.intent = "plan_date";
      out.date = d;
      return out;
    }
  }

  // ---- ITV y revision ----
  if (/\bitv\b/.test(full)) {
    const d = parseDate(full, tk);
    if (d) {
      out.intent = "itv";
      out.date = d;
      return out;
    }
  }
  if (/\b(revision|mantenimiento)\b/.test(full) && /\b(toca|le toca|proxima|siguiente|caduca|vence|tiene que venir)\b/.test(full)) {
    const d = parseDate(full, tk);
    if (d) {
      out.intent = "service";
      out.date = d;
      out.text = (full.match(/\b(?:revision|mantenimiento)\b(?: de| del)?\s+((?:aceite|filtros?|distribucion|frenos)[a-z ]*?)(?= (el|en|para|dentro|le|la)\b|$)/) || [])[1] || "";
      return out;
    }
  }

  // ---- Kilometros ----
  m = full.match(/\b(\d{3,7})\s*(?:km|kms|kilometros)\b/) || full.match(/\b(?:km|kms|kilometros|kilometraje)\b\s*(?:de|son|tiene)?\s*(\d{3,7})\b/);
  if (m && !/\b(revision)\b/.test(full)) {
    out.intent = "mileage";
    out.km = parseInt(m[1], 10);
    return out;
  }

  // ---- Hallazgo en la recepcion ----
  m = full.match(/\b(?:hallazgo|he visto que|hemos visto que|he detectado|hemos detectado|detectado|he encontrado que|hemos encontrado que|he encontrado|hemos encontrado|ojo que)\b\s*(?:que|de que|:)?\s*(.*)$/);
  if (m && m[1]) {
    out.intent = "finding";
    out.amount = parseAmount(m[1]);
    out.text = m[1].replace(/,?\s*(?:presupuesto|precio|cuesta|son)?\s*\d+(?:[.,]\d+)?( con \d+)?\s*(euros?|eur|pavos|€)\b/g, "").trim();
    if (out.text) return out;
  }

  // Estado
  if (/\b(pasala|pasalo|pasa|ponla|ponlo|cambia(la|lo)?|marca(la|lo)?|esta|queda|dejala|dejalo)\b/.test(s) || /^(terminada|acabada|esperando piezas|en curso)/.test(s)) {
    for (const [re, st] of STATUS_WORDS) {
      if (re.test(s) && !/\b(apunta|anade|ponle|metele|mete|agrega)\b/.test(s)) {
        out.intent = "status";
        out.status = st;
        return out;
      }
    }
  }

  // Nota u observacion ("anota que...", "apunta que...", "observacion: ...")
  m =
    s.match(/\b(?:anota(?:le)?|nota|observacion(?:es)?|escribe(?:le)?)\b\s*(.*)$/) ||
    s.match(/\b(?:apunta(?:le)?|pon(?:le)?)\s+((?:que|de que|en observaciones)\b.*)$/);
  if (m) {
    const body = m[1] || "";
    const clean = body.replace(/^(\s*(que|de que|una nota|en observaciones|en las observaciones|:))+\s*/, "").trim();
    if (clean) {
      out.intent = "note";
      out.text = clean;
      return out;
    }
  }

  // Anadir articulo
  m = s.match(/\b(apuntale|apunta|anadele|anade|anadir|ponle|pon|metele|mete|agregale|agrega|cargale|carga|hemos puesto|le he puesto|he puesto|lleva|necesita)\b\s*(.*)$/);
  if (m && m[2]) {
    let item = m[2].replace(/^(le|tambien|ademas|otro|otra)\s+/, "");
    const q = item.match(/^(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|media)\s+(.*)$/);
    if (q) {
      out.qty = /^\d+$/.test(q[1]) ? parseInt(q[1], 10) : QTY[q[1]] || 1;
      item = q[2];
    }
    out.intent = "add_item";
    out.text = cleanItem(item);
    return out;
  }

  return out;
}

function cleanItem(s: string) {
  return s
    .replace(/^(de|del|unos|unas|unidades de|litros de|botes de|botes|bote de|bote|cajas de)\s+/, (x) => (/(litros|botes|bote|cajas)/.test(x) ? x : ""))
    .replace(/\s+(por favor|gracias)$/, "")
    .trim();
}

/** Puntua lo que se parece un nombre de articulo a lo dictado (0 = nada) */
export function similarity(spoken: string, name: string) {
  const stem = (w: string) => w.replace(/(es|s)$/, "");
  const stop = new Set(["de", "del", "la", "el", "los", "las", "para", "con", "y", "un", "una", "litro", "litros", "bote", "botes"]);
  const a = norm(spoken).split(" ").filter((w) => w && !stop.has(w)).map(stem);
  const b = norm(name).split(" ").filter((w) => w && !stop.has(w)).map(stem);
  if (!a.length || !b.length) return 0;
  let hits = 0;
  for (const w of a) {
    if (b.some((x) => x === w)) hits += 1;
    else if (w.length >= 4 && b.some((x) => x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))) hits += 0.6;
  }
  const score = hits / Math.max(a.length, 1) - Math.max(0, b.length - a.length) * 0.03;
  return Math.max(0, Math.round(score * 100) / 100);
}
