import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { Field, TextInput } from "@/components/ui/inputs";
import { IconTrash } from "@/components/ui/icons";
import { CsvButton } from "@/components/ui/CsvButton";
import { PrintButton } from "@/components/ui/PrintButton";
import { fmtDate, fmtEUR } from "@/lib/format";
import { quarterBounds, quarterOf, yearBounds } from "@/lib/period";
import { LIMIT_347, RATES, addInto, amortizationInPeriod, amortizedUntil, byRate, partyKey, purchaseByRate, r2 } from "@/lib/fiscal";
import { prisma } from "@/lib/prisma";
import { addAsset, removeAsset } from "./actions";

export const dynamic = "force-dynamic";

const VIEWS = [
  ["libros", "Libros de IVA"],
  ["303", "Modelo 303"],
  ["130", "Modelo 130"],
  ["347", "Modelo 347"],
  ["resultados", "Cuenta de resultados"],
  ["bienes", "Amortizaciones"],
] as const;

type SP = { vista?: string; ano?: string; t?: string };

export default async function FiscalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.ano || "", 10) || now.getFullYear();
  const defaultQ = quarterOf(now);
  const q = sp.t === "0" ? 0 : Math.min(4, Math.max(1, parseInt(sp.t || "", 10) || defaultQ));
  const vista = VIEWS.some(([k]) => k === sp.vista) ? sp.vista! : "libros";
  const period = q ? quarterBounds(year, q) : yearBounds(year);
  const periodLabel = q ? `${q}T ${year}` : `Ano ${year}`;

  const link = (patch: Partial<SP>) => {
    const p = { vista, ano: String(year), t: String(q), ...patch };
    return `/fiscal?vista=${p.vista}&ano=${p.ano}&t=${p.t}`;
  };

  // 347 y 130 necesitan otros periodos: anual / acumulado desde enero
  const yb = yearBounds(year);
  const ytdEnd = q ? period.end : yb.end;
  const fetchStart = vista === "347" || vista === "130" ? yb.start : period.start;
  const fetchEnd = vista === "347" ? yb.end : vista === "130" ? ytdEnd : period.end;

  const [invoices, purchases, assets, settings] = await Promise.all([
    prisma.invoice.findMany({ where: { createdAt: { gte: fetchStart, lte: fetchEnd } }, include: { items: true }, orderBy: { createdAt: "asc" } }),
    prisma.purchase.findMany({ where: { date: { gte: fetchStart, lte: fetchEnd }, kind: { in: ["factura", "gasto"] } }, include: { items: true }, orderBy: { date: "asc" } }),
    prisma.asset.findMany({ orderBy: { purchaseDate: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const inPeriod = <T extends { createdAt?: Date; date?: Date }>(list: T[]) =>
    list.filter((x) => {
      const d = (x.createdAt || x.date)!;
      return d >= period.start && d <= period.end;
    });
  const invP = inPeriod(invoices);
  const purP = inPeriod(purchases);

  const devengado = invP.reduce((acc, i) => addInto(acc, byRate(i.items)), {} as Record<number, { base: number; cuota: number }>);
  const soportado = purP.reduce((acc, p) => addInto(acc, purchaseByRate(p)), {} as Record<number, { base: number; cuota: number }>);
  const totalDev = r2(Object.values(devengado).reduce((s, v) => s + v.cuota, 0));
  const totalSop = r2(Object.values(soportado).reduce((s, v) => s + v.cuota, 0));
  const ingresosBase = r2(invP.reduce((s, i) => s + Number(i.subtotal), 0));
  const gastosBase = r2(purP.reduce((s, p) => s + Number(p.subtotal), 0));

  return (
    <div>
      <Header
        title="Fiscal"
        subtitle="Libros de facturas, borradores de modelos y cuenta de resultados para llevar a la gestoria"
        right={
          <div className="no-print" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Link href={link({ ano: String(year - 1) })}>
              <Pill tone="muted">← {year - 1}</Pill>
            </Link>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{year}</strong>
            <Link href={link({ ano: String(year + 1) })}>
              <Pill tone="muted">{year + 1} →</Pill>
            </Link>
            {[1, 2, 3, 4, 0].map((t) => (
              <Link key={t} href={link({ t: String(t) })}>
                <Pill tone={q === t ? "accent" : "muted"}>{t ? `${t}T` : "Ano"}</Pill>
              </Link>
            ))}
          </div>
        }
      />

      <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {VIEWS.map(([k, l]) => (
          <Link key={k} href={link({ vista: k })}>
            <Pill tone={vista === k ? "steel" : "muted"}>{l}</Pill>
          </Link>
        ))}
      </div>

      <Card style={{ marginBottom: 14, borderColor: "var(--color-warning)" }}>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
          Son <strong style={{ color: "var(--color-text-primary)" }}>borradores</strong> calculados con lo que hay en el programa (facturas emitidas, facturas de proveedor y gastos). Sirven para
          preparar los impuestos y pasarselos a la gestoria, pero la presentacion oficial se hace en la Agencia Tributaria. Los albaranes sin factura no cuentan.
        </p>
      </Card>

      {vista === "libros" && (
        <Libros invP={invP} purP={purP} periodLabel={periodLabel} devengado={devengado} soportado={soportado} />
      )}

      {vista === "303" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <SectionTitle>Modelo 303 · IVA trimestral · {periodLabel}</SectionTitle>
            <span className="no-print">
              <PrintButton label="Imprimir" />
            </span>
          </div>
          {!q && <p style={muted}>El 303 es trimestral: elige un trimestre arriba. Ahora se ve el ano entero (resumen anual, como el 390).</p>}
          <p style={{ ...muted, marginTop: 8 }}>
            {settings.workshopName} · {settings.taxId || "sin NIF"}
          </p>
          <Table
            head={["", "Casilla base", "Base imponible", "Casilla cuota", "Cuota"]}
            rows={[
              ["IVA devengado 4%", "01", fmtEUR(devengado[4]?.base || 0), "03", fmtEUR(devengado[4]?.cuota || 0)],
              ["IVA devengado 10%", "04", fmtEUR(devengado[10]?.base || 0), "06", fmtEUR(devengado[10]?.cuota || 0)],
              ["IVA devengado 21%", "07", fmtEUR(devengado[21]?.base || 0), "09", fmtEUR(devengado[21]?.cuota || 0)],
              ["Total cuota devengada", "", "", "27", fmtEUR(totalDev)],
              ["IVA deducible (compras y gastos corrientes)", "28", fmtEUR(Object.values(soportado).reduce((s, v) => s + v.base, 0)), "29", fmtEUR(totalSop)],
              ["Total a deducir", "", "", "45", fmtEUR(totalSop)],
            ]}
          />
          {devengado[0]?.base ? <p style={muted}>Ventas sin IVA (exentas / 0%): {fmtEUR(devengado[0].base)}</p> : null}
          <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: totalDev - totalSop >= 0 ? "var(--color-warning-soft)" : "var(--color-success-soft)" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Resultado (casillas 46 / 71)</p>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28 }}>
              {fmtEUR(Math.abs(totalDev - totalSop))} {totalDev - totalSop >= 0 ? "a ingresar" : "a compensar / devolver"}
            </p>
            <p style={{ ...muted, marginTop: 4 }}>Si arrastras cuotas a compensar de trimestres anteriores (casilla 110), restalas.</p>
          </div>
        </Card>
      )}

      {vista === "130" && (
        <Modelo130 invoices={invoices} purchases={purchases} assets={assets} year={year} q={q} ytdEnd={ytdEnd} />
      )}

      {vista === "347" && <Modelo347 invoices={invoices} purchases={purchases} year={year} />}

      {vista === "resultados" && (
        <Resultados invP={invP} purP={purP} assets={assets} period={period} periodLabel={periodLabel} ingresosBase={ingresosBase} gastosBase={gastosBase} />
      )}

      {vista === "bienes" && <Bienes assets={assets} year={year} />}
    </div>
  );
}

type Inv = Awaited<ReturnType<typeof prisma.invoice.findMany<{ include: { items: true } }>>>[number];
type Pur = Awaited<ReturnType<typeof prisma.purchase.findMany<{ include: { items: true } }>>>[number];
type Asset = Awaited<ReturnType<typeof prisma.asset.findMany>>[number];

function Libros({
  invP,
  purP,
  periodLabel,
  devengado,
  soportado,
}: {
  invP: Inv[];
  purP: Pur[];
  periodLabel: string;
  devengado: Record<number, { base: number; cuota: number }>;
  soportado: Record<number, { base: number; cuota: number }>;
}) {
  const fileTag = periodLabel.replace(/\s+/g, "_");
  const emitRows = invP.map((i) => {
    const r = byRate(i.items);
    return [i.number, fmtDate(i.createdAt), i.clientName, i.clientNif, ...RATES.flatMap((rate) => [r[rate]?.base || 0, r[rate]?.cuota || 0]), Number(i.total)] as (string | number)[];
  });
  const recRows = purP.map((p) => {
    const r = purchaseByRate(p);
    return [p.number, fmtDate(p.date), p.supplierName, p.supplierNif, p.kind === "gasto" ? p.category : "Compras", ...RATES.flatMap((rate) => [r[rate]?.base || 0, r[rate]?.cuota || 0]), Number(p.total)] as (string | number)[];
  });
  const rateHead = RATES.flatMap((r) => [`Base ${r}%`, `IVA ${r}%`]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard label="Facturas emitidas" value={invP.length} tone="accent" />
        <MetricCard label="IVA repercutido" value={fmtEUR(Object.values(devengado).reduce((s, v) => s + v.cuota, 0))} tone="warning" />
        <MetricCard label="Facturas recibidas" value={purP.length} tone="steel" />
        <MetricCard label="IVA soportado" value={fmtEUR(Object.values(soportado).reduce((s, v) => s + v.cuota, 0))} tone="success" />
      </div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <SectionTitle>Libro de facturas emitidas · {periodLabel}</SectionTitle>
          <CsvButton filename={`facturas_emitidas_${fileTag}.csv`} headers={["Numero", "Fecha", "Cliente", "NIF", ...rateHead, "Total"]} rows={emitRows} />
        </div>
        <Table
          head={["Numero", "Fecha", "Cliente", "NIF", "Base", "IVA", "Total"]}
          rows={invP.map((i) => [i.number, fmtDate(i.createdAt), i.clientName || "-", i.clientNif || "-", fmtEUR(Number(i.subtotal)), fmtEUR(Number(i.vatTotal)), fmtEUR(Number(i.total))])}
          foot={["Total", "", "", "", fmtEUR(invP.reduce((s, i) => s + Number(i.subtotal), 0)), fmtEUR(invP.reduce((s, i) => s + Number(i.vatTotal), 0)), fmtEUR(invP.reduce((s, i) => s + Number(i.total), 0))]}
        />
        {invP.some((i) => !i.clientNif) && <p style={{ ...muted, color: "var(--color-warning)" }}>Hay facturas sin NIF del cliente: para el 347 y la gestoria conviene rellenarlo.</p>}
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <SectionTitle>Libro de facturas recibidas · {periodLabel}</SectionTitle>
          <CsvButton filename={`facturas_recibidas_${fileTag}.csv`} headers={["Numero", "Fecha", "Proveedor", "NIF", "Tipo", ...rateHead, "Total"]} rows={recRows} />
        </div>
        <Table
          head={["Numero", "Fecha", "Proveedor", "NIF", "Tipo", "Base", "IVA", "Total"]}
          rows={purP.map((p) => [p.number || "-", fmtDate(p.date), p.supplierName, p.supplierNif || "-", p.kind === "gasto" ? p.category : "Compras", fmtEUR(Number(p.subtotal)), fmtEUR(Number(p.vatTotal)), fmtEUR(Number(p.total))])}
          foot={["Total", "", "", "", "", fmtEUR(purP.reduce((s, p) => s + Number(p.subtotal), 0)), fmtEUR(purP.reduce((s, p) => s + Number(p.vatTotal), 0)), fmtEUR(purP.reduce((s, p) => s + Number(p.total), 0))]}
        />
      </Card>
    </div>
  );
}

function Modelo130({ invoices, purchases, assets, year, q, ytdEnd }: { invoices: Inv[]; purchases: Pur[]; assets: Asset[]; year: number; q: number; ytdEnd: Date }) {
  const start = new Date(year, 0, 1);
  const ingresos = r2(invoices.filter((i) => i.createdAt <= ytdEnd).reduce((s, i) => s + Number(i.subtotal), 0));
  const compras = r2(purchases.filter((p) => p.date <= ytdEnd).reduce((s, p) => s + Number(p.subtotal), 0));
  const amort = r2(assets.reduce((s, a) => s + amortizationInPeriod(a, start, ytdEnd), 0));
  const gastos = r2(compras + amort);
  const rendimiento = r2(ingresos - gastos);
  const pago = r2(Math.max(0, rendimiento * 0.2));
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <SectionTitle>Modelo 130 · Pago fraccionado IRPF · {q ? `${q}T` : "4T"} {year}</SectionTitle>
        <span className="no-print">
          <PrintButton label="Imprimir" />
        </span>
      </div>
      <p style={muted}>Solo si eres autonomo en estimacion directa. Se calcula con lo acumulado desde el 1 de enero hasta el final del trimestre.</p>
      <Table
        head={["Concepto", "Casilla", "Importe"]}
        rows={[
          ["Ingresos computables (bases de facturas emitidas)", "01", fmtEUR(ingresos)],
          ["Gastos deducibles (compras y gastos sin IVA)", "02", fmtEUR(compras)],
          ["  de los que amortizaciones", "", fmtEUR(amort)],
          ["Total gastos", "02", fmtEUR(gastos)],
          ["Rendimiento neto", "03", fmtEUR(rendimiento)],
          ["20% del rendimiento", "04", fmtEUR(pago)],
        ]}
      />
      <p style={{ ...muted, marginTop: 10 }}>
        Al 20% hay que restarle lo pagado en los 130 anteriores de este ano (casilla 05) y las retenciones que te hayan practicado (casilla 06). Los gastos que no pasan por el
        programa (cuota de autonomos, seguros, nominas...) tambien cuentan: anadelos como Gasto en Compras.
      </p>
    </Card>
  );
}

function Modelo347({ invoices, purchases, year }: { invoices: Inv[]; purchases: Pur[]; year: number }) {
  type Party = { key: string; nif: string; name: string; q: number[]; total: number };
  const group = (list: { nif: string; name: string; total: number; date: Date }[]) => {
    const map = new Map<string, Party>();
    for (const x of list) {
      const key = partyKey(x.nif, x.name);
      const p = map.get(key) || { key, nif: x.nif, name: x.name, q: [0, 0, 0, 0], total: 0 };
      p.q[quarterOf(x.date) - 1] += x.total;
      p.total += x.total;
      map.set(key, p);
    }
    return [...map.values()].filter((p) => p.total > LIMIT_347).sort((a, b) => b.total - a.total);
  };
  const clients = group(invoices.map((i) => ({ nif: i.clientNif, name: i.clientName, total: Number(i.total), date: i.createdAt })));
  const suppliers = group(purchases.map((p) => ({ nif: p.supplierNif, name: p.supplierName, total: Number(p.total), date: p.date })));

  const block = (title: string, letter: string, list: Party[], file: string) => (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <SectionTitle>
          {title} (clave {letter}) · {list.length}
        </SectionTitle>
        <CsvButton
          filename={file}
          headers={["NIF", "Nombre", "Clave", "1T", "2T", "3T", "4T", "Total anual"]}
          rows={list.map((p) => [p.nif || "SIN NIF", p.name, letter, r2(p.q[0]), r2(p.q[1]), r2(p.q[2]), r2(p.q[3]), r2(p.total)])}
        />
      </div>
      {list.length === 0 ? (
        <p style={muted}>Nadie supera {fmtEUR(LIMIT_347)} en {year}.</p>
      ) : (
        <Table
          head={["NIF", "Nombre", "1T", "2T", "3T", "4T", "Total"]}
          rows={list.map((p) => [p.nif || <Pill key="x" tone="danger">Falta NIF</Pill>, p.name, fmtEUR(p.q[0]), fmtEUR(p.q[1]), fmtEUR(p.q[2]), fmtEUR(p.q[3]), fmtEUR(p.total)])}
        />
      )}
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <SectionTitle>Modelo 347 · Operaciones con terceros · {year}</SectionTitle>
        <p style={{ ...muted, marginTop: 6 }}>
          Se declara en febrero del ano siguiente. Incluye clientes y proveedores con los que has superado {fmtEUR(LIMIT_347)} (IVA incluido) en el ano. Se agrupan por NIF: si
          un cliente no tiene NIF en las facturas, rellenalo en su ficha.
        </p>
      </Card>
      {block("Clientes · ventas", "B", clients, `347_clientes_${year}.csv`)}
      {block("Proveedores · compras", "A", suppliers, `347_proveedores_${year}.csv`)}
    </div>
  );
}

function Resultados({
  invP,
  purP,
  assets,
  period,
  periodLabel,
  ingresosBase,
  gastosBase,
}: {
  invP: Inv[];
  purP: Pur[];
  assets: Asset[];
  period: { start: Date; end: Date };
  periodLabel: string;
  ingresosBase: number;
  gastosBase: number;
}) {
  const manoObra = r2(invP.reduce((s, i) => s + i.items.filter((it) => it.kind === "mano_obra").reduce((x, it) => x + it.qty * Number(it.unitPrice) * (1 - it.discount / 100), 0), 0));
  const cats = new Map<string, number>();
  for (const p of purP) {
    const k = p.kind === "factura" ? "Compras de recambios y material" : p.category;
    cats.set(k, r2((cats.get(k) || 0) + Number(p.subtotal)));
  }
  const amort = r2(assets.reduce((s, a) => s + amortizationInPeriod(a, period.start, period.end), 0));
  const totalGastos = r2(gastosBase + amort);
  const resultado = r2(ingresosBase - totalGastos);
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <SectionTitle>Cuenta de perdidas y ganancias · {periodLabel}</SectionTitle>
        <span className="no-print">
          <PrintButton label="Imprimir" />
        </span>
      </div>
      <Table
        head={["Concepto", "Importe (sin IVA)"]}
        rows={[
          [<strong key="i">Ingresos</strong>, <strong key="iv">{fmtEUR(ingresosBase)}</strong>],
          ["  Recambios y otros conceptos", fmtEUR(r2(ingresosBase - manoObra))],
          ["  Mano de obra", fmtEUR(manoObra)],
          [<strong key="g">Gastos</strong>, <strong key="gv">{fmtEUR(totalGastos)}</strong>],
          ...[...cats.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [`  ${k}`, fmtEUR(v)]),
          ["  Amortizaciones", fmtEUR(amort)],
        ]}
        foot={["Resultado", fmtEUR(resultado)]}
      />
      <p style={{ ...muted, marginTop: 8 }}>
        Margen sobre ingresos: {ingresosBase ? `${Math.round((resultado / ingresosBase) * 100)}%` : "-"}. Nominas, seguridad social o cuotas que no metas como gasto no aparecen
        aqui.
      </p>
    </Card>
  );
}

function Bienes({ assets, year }: { assets: Asset[]; year: number }) {
  const yb = yearBounds(year);
  return (
    <Card>
      <SectionTitle>Control y amortizacion de bienes</SectionTitle>
      <p style={{ ...muted, marginTop: 4 }}>
        Maquinaria, elevadores, herramienta cara, ordenadores, furgoneta... Se amortizan en varios anos (amortizacion lineal). Lo de cada ano cuenta como gasto en el 130 y en la
        cuenta de resultados.
      </p>
      {assets.length > 0 && (
        <Table
          head={["Bien", "Compra", "Coste", "Anos", `Amortizacion ${year}`, "Amortizado", "Valor pendiente", ""]}
          rows={assets.map((a) => {
            const done = amortizedUntil(a, yb.end);
            return [
              a.name,
              fmtDate(a.purchaseDate),
              fmtEUR(Number(a.cost)),
              String(a.years),
              fmtEUR(amortizationInPeriod(a, yb.start, yb.end)),
              fmtEUR(done),
              fmtEUR(r2(Number(a.cost) - done)),
              <form key="d" action={removeAsset.bind(null, a.id)}>
                <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                  <IconTrash />
                </button>
              </form>,
            ];
          })}
        />
      )}
      <form action={addAsset} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12, alignItems: "end" }}>
        <Field label="Bien">
          <TextInput name="name" placeholder="Elevador de 2 columnas" required />
        </Field>
        <Field label="Fecha de compra">
          <TextInput name="purchaseDate" type="date" required />
        </Field>
        <Field label="Coste sin IVA">
          <TextInput name="cost" required />
        </Field>
        <Field label="Anos de vida">
          <TextInput name="years" type="number" min="1" defaultValue={10} />
        </Field>
        <Button type="submit" variant="primary">
          Anadir bien
        </Button>
      </form>
      <p style={{ ...muted, marginTop: 8 }}>Orientativo (tablas de Hacienda): maquinaria 10 anos, utiles y herramientas 4-8, equipos informaticos 4, vehiculos 6.</p>
    </Card>
  );
}

function Table({ head, rows, foot }: { head: React.ReactNode[]; rows: React.ReactNode[][]; foot?: React.ReactNode[] }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 12.5, minWidth: 480 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 8px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} style={{ padding: 10, color: "var(--color-text-faint)" }}>
                Nada en este periodo.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
              {r.map((c, j) => (
                <td key={j} style={{ textAlign: j === 0 ? "left" : "right", padding: "6px 8px", whiteSpace: j === 0 ? "pre-wrap" : "nowrap" }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr>
              {foot.map((c, j) => (
                <td key={j} style={{ textAlign: j === 0 ? "left" : "right", padding: "8px", fontWeight: 700, borderTop: "2px solid var(--color-border)" }}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

const muted = { margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" } as const;
