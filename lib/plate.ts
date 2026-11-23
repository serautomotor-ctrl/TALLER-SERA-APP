/**
 * Dibujo de placas de matricula (520 x 110 mm) en SVG con medidas reales en milimetros.
 * Sin dependencias: se usa en el navegador para la vista previa y para imprimir.
 *
 * Las letras se dibujan con trazos propios (estilo DIN de las placas espanolas) sobre una
 * caja de 45 x 80 con trazo de 10. Cada letra se recorta a su caja para que los extremos
 * queden rectos.
 */

export type PlateConfig = {
  /** Tamano de la hoja que se manda a la impresora (mm) */
  pageW: number;
  pageH: number;
  /** Ajuste fino de posicion y escala para calibrar la impresora */
  offsetX: number;
  offsetY: number;
  scale: number; // en %
  /** Medidas de los caracteres (mm) */
  charHeight: number;
  charWidth: number;
  stroke: number;
  charGap: number;
  groupGap: number;
  /** Banda azul europea con la E */
  band: boolean;
  /** Linea fina del contorno para cortar */
  cutLine: boolean;
  /** Texto pequeno del fabricante / homologacion (abajo a la derecha) */
  makerText: string;
  /** Color del texto */
  inkColor: string;
};

export const PLATE_W = 520;
export const PLATE_H = 110;

export const DEFAULT_PLATE: PlateConfig = {
  pageW: 520,
  pageH: 110,
  offsetX: 0,
  offsetY: 0,
  scale: 100,
  charHeight: 80,
  charWidth: 45,
  stroke: 10,
  charGap: 9,
  groupGap: 28,
  band: true,
  cutLine: false,
  makerText: "",
  inkColor: "#000000",
};

export function mergePlateConfig(raw: unknown): PlateConfig {
  const cfg = { ...DEFAULT_PLATE };
  if (raw && typeof raw === "object") {
    for (const k of Object.keys(DEFAULT_PLATE) as (keyof PlateConfig)[]) {
      const v = (raw as Record<string, unknown>)[k];
      if (v === undefined || v === null) continue;
      if (typeof DEFAULT_PLATE[k] === "number" && typeof v === "number" && Number.isFinite(v)) (cfg as Record<string, unknown>)[k] = v;
      if (typeof DEFAULT_PLATE[k] === "boolean" && typeof v === "boolean") (cfg as Record<string, unknown>)[k] = v;
      if (typeof DEFAULT_PLATE[k] === "string" && typeof v === "string") (cfg as Record<string, unknown>)[k] = v;
    }
  }
  return cfg;
}

/* ---------- Letras (caja 45 x 80, trazo 10) ---------- */

const GLYPHS: Record<string, string> = {
  "0": "M5,22.5 A17.5,17.5 0 0 1 40,22.5 L40,57.5 A17.5,17.5 0 0 1 5,57.5 Z",
  "1": "M8,19 L22.5,4 L22.5,85",
  "2": "M5,22.5 A17.5,17.5 0 0 1 40,22.5 Q40,33 31,44 L5,75 L45,75",
  "3": "M4,5 L38,5 L20,34 A20,20 0 1 1 5,67",
  "4": "M45,55 L5,55 L30,0 L30,85",
  "5": "M38,5 L8,5 L8,39 A19,19 0 1 1 5.4,64",
  "6": "M38,8 Q7,17 5,57.5 M22.5,40 A17.5,17.5 0 1 1 22.49,40 Z",
  "7": "M0,5 L40,5 L15,85",
  "8": "M22.5,5 A16,16.5 0 1 1 22.49,5 Z M22.5,39.5 A17.5,17.75 0 1 1 22.49,39.5 Z",
  "9": "M7,72 Q38,63 40,22.5 M22.5,5 A17.5,17.5 0 1 1 22.49,5 Z",
  A: "M1,85 L22.5,-2 L44,85 M9,55 L36,55",
  B: "M5,0 L5,75 M0,5 L24.5,5 A15.5,15.5 0 0 1 24.5,36 L5,36 M5,36 L21,36 A19.5,19.5 0 0 1 21,75 L0,75",
  C: "M40,22.5 A17.5,17.5 0 0 0 5,22.5 L5,57.5 A17.5,17.5 0 0 0 40,57.5",
  D: "M0,5 L20,5 A20,20 0 0 1 40,25 L40,55 A20,20 0 0 1 20,75 L0,75 M5,0 L5,80",
  E: "M45,5 L5,5 L5,75 L45,75 M5,40 L37,40",
  F: "M45,5 L5,5 L5,85 M5,40 L37,40",
  G: "M40,22.5 A17.5,17.5 0 0 0 5,22.5 L5,57.5 A17.5,17.5 0 0 0 40,57.5 L40,42 L23,42",
  H: "M5,0 L5,80 M40,0 L40,80 M5,40 L40,40",
  I: "M22.5,0 L22.5,80",
  J: "M40,0 L40,57.5 A17.5,17.5 0 0 1 5,57.5 L5,52",
  K: "M5,0 L5,80 M45,-3 L5,50 M17,35 L45,83",
  L: "M5,0 L5,75 L45,75",
  M: "M5,80 L5,5 L22.5,52 L40,5 L40,80",
  N: "M5,80 L5,5 L40,75 L40,0",
  O: "M5,22.5 A17.5,17.5 0 0 1 40,22.5 L40,57.5 A17.5,17.5 0 0 1 5,57.5 Z",
  P: "M5,80 L5,5 L23,5 A17.5,17.5 0 0 1 23,40 L5,40",
  Q: "M5,22.5 A17.5,17.5 0 0 1 40,22.5 L40,57.5 A17.5,17.5 0 0 1 5,57.5 Z M25,58 L42,82",
  R: "M5,80 L5,5 L23,5 A17.5,17.5 0 0 1 23,40 L5,40 M21,40 L44,83",
  S: "M39,15 C35,7 29,5 22.5,5 C12,5 5,11 5,21 C5,31 13,35 22.5,39 C33,43 40,48 40,58 C40,69 33,75 22.5,75 C15,75 9,72 5,64",
  T: "M0,5 L45,5 M22.5,5 L22.5,80",
  U: "M5,0 L5,57.5 A17.5,17.5 0 0 0 40,57.5 L40,0",
  V: "M1,-5 L22.5,77 L44,-5",
  W: "M1,-5 L11.5,86 L22.5,22 L33.5,86 L44,-5",
  X: "M2,-3 L43,83 M43,-3 L2,83",
  Y: "M1,-3 L22.5,40 L44,-3 M22.5,40 L22.5,80",
  Z: "M0,5 L40,5 L5,75 L45,75",
  "Ñ": "M5,80 L5,14 L40,75 L40,9 M8,3 Q15,-2 22.5,3 Q30,8 37,3",
  "-": "M10,40 L35,40",
};

export const SUPPORTED_CHARS = Object.keys(GLYPHS).join("");

/* ---------- Formato de la matricula ---------- */

const CONSONANTS = "BCDFGHJKLMNPRSTVWXYZ";

/** Limpia lo escrito y lo separa en grupos (los grupos llevan el hueco grande entre ellos) */
export function plateGroups(input: string): string[] {
  const clean = input
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ\- ]/g, "")
    .trim();
  if (!clean) return [];
  if (/\s/.test(clean)) return clean.split(/\s+/);
  const compact = clean;
  let m = compact.match(/^(\d{4})([A-Z]{3})$/);
  if (m) return [m[1], m[2]];
  m = compact.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/);
  if (m) return [m[1], m[2], m[3]];
  m = compact.match(/^([A-Z]{1,2})(\d{4,6})$/);
  if (m) return [m[1], m[2]];
  m = compact.match(/^(E)(\d{4})([A-Z]{3})$/);
  if (m) return [m[1], m[2], m[3]];
  return [compact];
}

/** Explica que tipo de matricula parece (para avisar de errores al teclear) */
export function plateKind(input: string): { ok: boolean; text: string } {
  const c = input.toUpperCase().replace(/[^A-Z0-9Ñ]/g, "");
  if (!c) return { ok: false, text: "Escribe la matricula" };
  if (/^\d{4}[A-Z]{3}$/.test(c)) {
    const bad = [...c.slice(4)].filter((ch) => !CONSONANTS.includes(ch));
    return bad.length
      ? { ok: false, text: `Formato actual, pero las matriculas actuales no llevan ${bad.join(", ")} (vocales, Q ni Ñ)` }
      : { ok: true, text: "Formato actual (0000 BBB)" };
  }
  if (/^[A-Z]{1,2}\d{4}[A-Z]{1,2}$/.test(c)) return { ok: true, text: "Formato provincial (M 0000 AB)" };
  if (/^[A-Z]{1,2}\d{4,6}$/.test(c)) return { ok: true, text: "Formato provincial antiguo (M 000000)" };
  if (/^E\d{4}[A-Z]{3}$/.test(c)) return { ok: true, text: "Vehiculo especial (E 0000 BBB)" };
  if (/^H\d{4}[A-Z]{3}$/.test(c)) return { ok: true, text: "Historico (H 0000 BBB)" };
  return { ok: false, text: "Formato no reconocido: revisa que este bien escrita" };
}

/* ---------- SVG ---------- */

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.4;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="#FFCC00"/>`;
}

function glyph(ch: string, x: number, y: number, w: number, h: number, stroke: number, color: string) {
  const d = GLYPHS[ch];
  if (!d) return "";
  const sx = w / 45;
  const sy = h / 80;
  const sw = stroke / ((sx + sy) / 2);
  return (
    `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" viewBox="0 0 45 80" preserveAspectRatio="none" overflow="hidden">` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(2)}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="3"/></svg>`
  );
}

/** Dibujo de la placa en coordenadas de la placa (0..520 x 0..110 mm), sin la hoja */
export function plateBody(text: string, cfg: PlateConfig) {
  const parts: string[] = [];
  const bandW = cfg.band ? 44 : 0;
  if (cfg.cutLine) {
    parts.push(`<rect x="0.15" y="0.15" width="${PLATE_W - 0.3}" height="${PLATE_H - 0.3}" rx="6" fill="none" stroke="#999" stroke-width="0.3"/>`);
  }
  if (cfg.band) {
    parts.push(`<rect x="2" y="2" width="42" height="106" rx="4" fill="#003399"/>`);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      parts.push(star(23 + 13.5 * Math.cos(a), 33 + 13.5 * Math.sin(a), 2.6));
    }
    parts.push(glyph("E", 23 - 7, 74, 14, 24, 3.4, "#FFFFFF"));
  }

  const groups = plateGroups(text);
  const chars = groups.reduce((n, g) => n + [...g].length, 0);
  if (chars) {
    let w = cfg.charWidth;
    let gap = cfg.charGap;
    let ggap = cfg.groupGap;
    const total = chars * w + (chars - groups.length) * gap + (groups.length - 1) * ggap;
    const left = bandW + 6;
    const avail = PLATE_W - left - 6;
    if (total > avail) {
      const k = avail / total;
      w *= k;
      gap *= k;
      ggap *= k;
    }
    const used = chars * w + (chars - groups.length) * gap + (groups.length - 1) * ggap;
    let x = left + (avail - used) / 2;
    const y = (PLATE_H - cfg.charHeight) / 2;
    groups.forEach((g, gi) => {
      [...g].forEach((ch, ci) => {
        parts.push(glyph(ch, x, y, w, cfg.charHeight, cfg.stroke, cfg.inkColor));
        x += w + (ci < [...g].length - 1 ? gap : 0);
      });
      if (gi < groups.length - 1) x += ggap;
    });
  }

  if (cfg.makerText.trim()) {
    parts.push(
      `<text x="${PLATE_W - 8}" y="${PLATE_H - 3.2}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="3.4" fill="${cfg.inkColor}">${esc(cfg.makerText.trim())}</text>`,
    );
  }
  return parts.join("");
}

/** SVG completo de la hoja (tamano de pagina con la placa colocada segun la calibracion) */
export function plateSheetSvg(text: string, cfg: PlateConfig) {
  const s = cfg.scale / 100;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.pageW}mm" height="${cfg.pageH}mm" viewBox="0 0 ${cfg.pageW} ${cfg.pageH}">` +
    `<g transform="translate(${cfg.offsetX} ${cfg.offsetY}) scale(${s})">${plateBody(text, cfg)}</g></svg>`
  );
}

/** Vista previa: la placa sola con fondo blanco y borde */
export function platePreviewSvg(text: string, cfg: PlateConfig) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${PLATE_W + 4} ${PLATE_H + 4}" width="100%" style="display:block">` +
    `<rect x="0" y="0" width="${PLATE_W}" height="${PLATE_H}" rx="6" fill="#FFFFFF" stroke="#888" stroke-width="0.8"/>` +
    plateBody(text, { ...cfg, cutLine: false }) +
    `</svg>`
  );
}

/** Pagina HTML lista para imprimir: una hoja por placa */
export function platePrintHtml(text: string, cfg: PlateConfig, copies: number) {
  const sheet = plateSheetSvg(text, cfg);
  const pages = Array.from({ length: Math.max(1, copies) }, () => `<div class="p">${sheet}</div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Placa ${esc(text)}</title>
<style>
@page { size: ${cfg.pageW}mm ${cfg.pageH}mm; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.p { width: ${cfg.pageW}mm; height: ${cfg.pageH}mm; overflow: hidden; page-break-after: always; break-after: page; }
.p:last-child { page-break-after: auto; break-after: auto; }
svg { display: block; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body onload="setTimeout(function(){window.print()},200)">${pages}</body></html>`;
}
