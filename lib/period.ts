import { toDateKey } from "./time";

/** "2026-11" -> inicio y fin del mes */
export function monthBounds(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  return currentMonthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

/** Lunes de la semana de esa fecha (clave AAAA-MM-DD) */
export function weekStartKey(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return toDateKey(d);
}

/** Trimestre 1..4 -> inicio y fin */
export function quarterBounds(year: number, quarter: number) {
  const start = new Date(year, (quarter - 1) * 3, 1, 0, 0, 0, 0);
  const end = new Date(year, quarter * 3, 0, 23, 59, 59, 999);
  return { start, end };
}

export function yearBounds(year: number) {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) };
}

export function quarterOf(d: Date) {
  return Math.floor(d.getMonth() / 3) + 1;
}

/** Interseccion en dias naturales entre [from,to] y [start,end] */
export function overlapDays(from: Date, to: Date, start: Date, end: Date) {
  const a = Math.max(from.getTime(), start.getTime());
  const b = Math.min(to.getTime(), end.getTime());
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}
