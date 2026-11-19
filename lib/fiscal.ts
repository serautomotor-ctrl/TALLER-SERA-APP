/** Calculos para los libros de IVA y los borradores de modelos (303, 130, 347). */

export const RATES = [21, 10, 4, 0] as const;
export const LIMIT_347 = 3005.06;

export const r2 = (n: number) => Math.round(n * 100) / 100;

type Line = { qty: number; unitPrice: number | { toString(): string }; discount: number; vat: number };

/** Base imponible y cuota por tipo de IVA a partir de las lineas de una factura */
export function byRate(items: Line[]) {
  const out: Record<number, { base: number; cuota: number }> = {};
  for (const it of items) {
    const base = it.qty * Number(it.unitPrice) * (1 - (it.discount || 0) / 100);
    const cur = out[it.vat] || { base: 0, cuota: 0 };
    cur.base += base;
    cur.cuota += base * (it.vat / 100);
    out[it.vat] = cur;
  }
  for (const k of Object.keys(out)) {
    out[+k] = { base: r2(out[+k].base), cuota: r2(out[+k].cuota) };
  }
  return out;
}

/** Igual para compras: si no tiene lineas usamos el total de la cabecera como tipo "general" */
export function purchaseByRate(p: { subtotal: unknown; vatTotal: unknown; items: { qty: number; unitCost: unknown; vat: number }[] }) {
  if (!p.items.length) {
    const base = Number(p.subtotal);
    const cuota = Number(p.vatTotal);
    const rate = base ? Math.round((cuota / base) * 100) : 0;
    const nearest = RATES.reduce((a, b) => (Math.abs(b - rate) < Math.abs(a - rate) ? b : a), 21 as number);
    return { [nearest]: { base: r2(base), cuota: r2(cuota) } } as Record<number, { base: number; cuota: number }>;
  }
  return byRate(p.items.map((i) => ({ qty: i.qty, unitPrice: Number(i.unitCost), discount: 0, vat: i.vat })));
}

export function addInto(acc: Record<number, { base: number; cuota: number }>, add: Record<number, { base: number; cuota: number }>) {
  for (const [k, v] of Object.entries(add)) {
    const cur = acc[+k] || { base: 0, cuota: 0 };
    acc[+k] = { base: r2(cur.base + v.base), cuota: r2(cur.cuota + v.cuota) };
  }
  return acc;
}

/** Amortizacion lineal de un bien en un periodo (prorrateada por dias) */
export function amortizationInPeriod(asset: { purchaseDate: Date; cost: unknown; years: number }, start: Date, end: Date) {
  const cost = Number(asset.cost);
  const years = Math.max(1, asset.years);
  const lifeEnd = new Date(asset.purchaseDate);
  lifeEnd.setFullYear(lifeEnd.getFullYear() + years);
  const from = Math.max(asset.purchaseDate.getTime(), start.getTime());
  const to = Math.min(lifeEnd.getTime(), end.getTime());
  if (to <= from) return 0;
  const perDay = cost / (years * 365.25);
  return r2(((to - from) / 86_400_000) * perDay);
}

export function amortizedUntil(asset: { purchaseDate: Date; cost: unknown; years: number }, until: Date) {
  return Math.min(Number(asset.cost), amortizationInPeriod(asset, asset.purchaseDate, until));
}

/** Clave para agrupar por cliente/proveedor en el 347: NIF si lo hay, si no el nombre */
export function partyKey(nif: string, name: string) {
  const n = nif.trim().toUpperCase();
  return n || `SIN-NIF:${name.trim().toUpperCase()}`;
}
