/**
 * Interprete de ordenes dictadas por voz (sin IA). Entiende frases tipicas del taller:
 *  "1234 BCD apuntale un limpiador de frenos"
 *  "a la 1234 ponle dos litros de aceite"
 *  "anota que hace ruido la rueda delantera"
 *  "pasala a esperando piezas" / "terminada"
 *  "empieza el tiempo" / "para el tiempo"
 *  "abre una orden para 5678 KLM cambio de aceite"
 * Sin dependencias: se usa en el servidor y se puede probar con node.
 */

export type VoiceIntent = "add_item" | "note" | "status" | "timer_start" | "timer_stop" | "new_order";

export type ParsedVoice = {
  intent: VoiceIntent | null;
  /** Matricula completa si se ha dictado, p. ej. "1234BCD" */
  plate: string | null;
  /** Solo los 4 numeros si no se entendieron las letras ("1234") */
  plateDigits: string | null;
  qty: number;
  /** Lo que hay que anadir, la nota o la descripcion de la nueva orden */
  text: string;
  status: "abierta" | "en_progreso" | "pendiente_piezas" | "cerrada" | null;
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

export function parseVoice(text: string): ParsedVoice {
  const { plate, digits, rest } = extractPlate(text);
  const s = stripFillers(rest);
  const out: ParsedVoice = { intent: null, plate, plateDigits: plate ? null : digits, qty: 1, text: "", status: null };

  // Nueva orden
  let m = s.match(/\b(abre|abrir|crea|crear|nueva|haz|hazme)( una| la)? (nueva )?orden( de trabajo| de reparacion)?( para| a| de)?( la| el)?\s*(.*)$/);
  if (!m) m = s.match(/\b(abre|abrir|crea|crear|nueva)( una)? (ficha|reparacion)( para| a)?( la| el)?\s*(.*)$/);
  if (/\b(abre|abrir|crea|crear|nueva)\b.*\borden\b/.test(norm(text)) || m) {
    const desc = norm(text).replace(/.*\borden\b( de trabajo| de reparacion)?/, "");
    out.intent = "new_order";
    out.text = cleanItem(extractPlate(desc).rest.replace(/^(para|a|de)?\s*(la|el)?\s*/, ""));
    return out;
  }

  // Cronometro (sobre el texto sin recortar: "para el tiempo" empieza por "para el")
  const full = norm(rest);
  if (/\b(para|parar|pausa|pausar|deten|detener|termina|terminar|acaba|acabar|cierra|cerrar|stop)\b.*\b(tiempo|cronometro|reloj|contador)\b/.test(full)) {
    out.intent = "timer_stop";
    return out;
  }
  if (/\b(empieza|empiezo|empezar|arranca|inicia|iniciar|comienza|comienzo|dale al|pon en marcha)\b.*\b(tiempo|cronometro|reloj|trabajo|contador)\b/.test(s) || /^(empiezo|empiezo con|me pongo con)\b/.test(s)) {
    out.intent = "timer_start";
    return out;
  }
  if (/\b(para|parar|pausa|pausar|deten|detener|termina|terminar|acaba|acabar|cierra|cerrar|stop)\b.*\b(tiempo|cronometro|reloj|contador)\b/.test(s)) {
    out.intent = "timer_stop";
    return out;
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
  m = s.match(/\b(apuntale|apunta|anadele|anade|anadir|ponle|pon|metele|mete|agregale|agrega|cargale|carga|cobrale|hemos puesto|le he puesto|he puesto|lleva|necesita)\b\s*(.*)$/);
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
