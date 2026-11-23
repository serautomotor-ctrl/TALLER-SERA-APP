"use client";

import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { CsvButton } from "@/components/ui/CsvButton";
import { Field, TextInput } from "@/components/ui/inputs";
import { IconPrint, IconTrash } from "@/components/ui/icons";
import { DEFAULT_PLATE, plateKind, platePreviewSvg, platePrintHtml, plateSheetSvg, type PlateConfig } from "@/lib/plate";
import { deletePlateJob, recordPlateJob, savePlateConfig } from "@/app/placas/actions";

type Vehicle = { plate: string; label: string; holderName: string; holderTaxId: string };
type Job = { id: string; plate: string; qty: number; holderName: string; holderTaxId: string; notes: string; userName: string; createdAt: string };

const fmt = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function PlateStudio({ initialPlate, config, vehicles, jobs, isAdmin }: { initialPlate: string; config: PlateConfig; vehicles: Vehicle[]; jobs: Job[]; isAdmin: boolean }) {
  const byPlate = useMemo(() => new Map(vehicles.map((v) => [v.plate.replace(/[^A-Z0-9]/gi, "").toUpperCase(), v])), [vehicles]);
  const first = byPlate.get(initialPlate.replace(/[^A-Z0-9]/gi, ""));
  const [plate, setPlate] = useState(initialPlate);
  const [qty, setQty] = useState(2);
  const [holderName, setHolderName] = useState(first?.holderName || "");
  const [holderTaxId, setHolderTaxId] = useState(first?.holderTaxId || "");
  const [notes, setNotes] = useState("");
  const [cfg, setCfg] = useState<PlateConfig>(config);
  const [showCfg, setShowCfg] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [pending, start] = useTransition();

  const kind = plateKind(plate);
  const known = byPlate.get(plate.replace(/[^A-Z0-9]/gi, "").toUpperCase());

  const onPlate = (v: string) => {
    const up = v.toUpperCase();
    setPlate(up);
    const veh = byPlate.get(up.replace(/[^A-Z0-9]/gi, ""));
    if (veh) {
      setHolderName(veh.holderName);
      setHolderTaxId(veh.holderTaxId);
    }
  };

  const openPrint = (text: string, c: PlateConfig, copies: number) => {
    const w = window.open("", "_blank", "width=900,height=400");
    if (!w) {
      setMsg("El navegador ha bloqueado la ventana de impresion. Permite las ventanas emergentes para este programa.");
      return false;
    }
    w.document.write(platePrintHtml(text, c, copies));
    w.document.close();
    return true;
  };

  const print = () => {
    setMsg("");
    if (!plate.trim()) return setMsg("Escribe la matricula.");
    if (!openPrint(plate, cfg, qty)) return;
    start(async () => {
      const r = await recordPlateJob({ plate, qty, holderName, holderTaxId, notes });
      setMsg(r.error || `Enviado a imprimir y apuntado en el registro: ${plate} x${qty}.`);
    });
  };

  const printTest = () => openPrint("8888 BBB", { ...cfg, cutLine: true }, 1);

  const downloadSvg = () => {
    const blob = new Blob([plateSheetSvg(plate, cfg)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `placa-${plate.replace(/\s+/g, "") || "sin-matricula"}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const saveCfg = () =>
    start(async () => {
      await savePlateConfig(cfg);
      setMsg("Ajustes de impresion guardados.");
    });

  const num = (k: keyof PlateConfig, label: string, step = 0.5) => (
    <Field label={label}>
      <TextInput type="number" step={step} value={String(cfg[k])} onChange={(e) => setCfg({ ...cfg, [k]: parseFloat(e.target.value) || 0 })} />
    </Field>
  );
  const check = (k: keyof PlateConfig, label: string) => (
    <label style={checkStyle}>
      <input type="checkbox" checked={Boolean(cfg[k])} onChange={(e) => setCfg({ ...cfg, [k]: e.target.checked })} /> {label}
    </label>
  );

  const q = search.trim().toUpperCase();
  const shown = q ? jobs.filter((j) => j.plate.includes(q) || j.holderName.toUpperCase().includes(q) || j.holderTaxId.includes(q)) : jobs;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ background: "#d9dde3", borderRadius: 10, padding: 12 }} dangerouslySetInnerHTML={{ __html: platePreviewSvg(plate, cfg) }} />
        <p style={{ ...muted, color: kind.ok ? "var(--color-success, #2e9d5b)" : "var(--color-warning, #c98a1b)" }}>{kind.text}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 12 }}>
          <Field label="Matricula">
            <TextInput
              value={plate}
              onChange={(e) => onPlate(e.target.value)}
              placeholder="1234 BCD"
              list="placas-vehiculos"
              autoFocus
              style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Numero de placas">
            <TextInput type="number" min={1} max={20} value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)} />
          </Field>
          <Field label="Titular / solicitante">
            <TextInput value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nombre" />
          </Field>
          <Field label="DNI / NIF">
            <TextInput value={holderTaxId} onChange={(e) => setHolderTaxId(e.target.value)} placeholder="12345678Z" style={{ textTransform: "uppercase" }} />
          </Field>
          <Field label="Notas">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delantera y trasera, duplicado..." />
          </Field>
        </div>
        <datalist id="placas-vehiculos">
          {vehicles.map((v) => (
            <option key={v.plate} value={v.plate}>
              {[v.label, v.holderName].filter(Boolean).join(" · ")}
            </option>
          ))}
        </datalist>
        {known && <p style={muted}>Vehiculo de la ficha: {[known.label, known.holderName].filter(Boolean).join(" · ")}</p>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <Button variant="primary" onClick={print} disabled={pending}>
            <IconPrint /> Imprimir {qty} {qty === 1 ? "placa" : "placas"}
          </Button>
          <Button onClick={downloadSvg}>Descargar dibujo (SVG)</Button>
          <Button variant="ghost" onClick={() => setShowCfg((s) => !s)}>
            {showCfg ? "Ocultar ajustes" : "Ajustes de impresion"}
          </Button>
        </div>
        {msg && <p style={{ ...muted, color: "var(--color-text-primary)" }}>{msg}</p>}
      </Card>

      {showCfg && (
        <Card>
          <SectionTitle>Ajustes de impresion</SectionTitle>
          <p style={muted}>
            Imprime la hoja de prueba sobre papel normal, ponla encima de una lamina y mide. Si sale movida, corrige el desplazamiento (en mm, + derecha / + abajo). Si sale
            mas grande o pequena, corrige la escala. En la ventana de imprimir elige la impresora de placas, tamano de papel {cfg.pageW} x {cfg.pageH} mm, margenes
            &quot;Ninguno&quot;, escala 100% y desmarca &quot;Encabezados y pies de pagina&quot;.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 12 }}>
            {num("pageW", "Ancho hoja (mm)", 1)}
            {num("pageH", "Alto hoja (mm)", 1)}
            {num("offsetX", "Mover derecha (mm)")}
            {num("offsetY", "Mover abajo (mm)")}
            {num("scale", "Escala (%)", 0.1)}
            {num("charHeight", "Alto letra (mm)")}
            {num("charWidth", "Ancho letra (mm)")}
            {num("stroke", "Grosor trazo (mm)")}
            {num("charGap", "Separacion letras (mm)")}
            {num("groupGap", "Hueco numeros-letras (mm)")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
            <Field label="Marca del fabricante / homologacion (abajo dcha.)">
              <TextInput value={cfg.makerText} onChange={(e) => setCfg({ ...cfg, makerText: e.target.value })} placeholder="Tu codigo de fabricante" />
            </Field>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
              {check("band", "Banda azul europea (E)")}
              {check("cutLine", "Linea fina de contorno para cortar")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <Button variant="primary" onClick={saveCfg} disabled={pending}>
              Guardar ajustes
            </Button>
            <Button onClick={printTest}>
              <IconPrint /> Hoja de prueba
            </Button>
            <Button variant="ghost" onClick={() => setCfg({ ...DEFAULT_PLATE, makerText: cfg.makerText })}>
              Volver a medidas de fabrica
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SectionTitle>Registro de placas hechas</SectionTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar matricula, nombre o DNI" />
            <CsvButton
              filename="registro-placas.csv"
              headers={["Fecha", "Matricula", "Placas", "Titular", "DNI/NIF", "Notas", "Usuario"]}
              rows={shown.map((j) => [fmt(j.createdAt), j.plate, j.qty, j.holderName, j.holderTaxId, j.notes, j.userName])}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
          {shown.length === 0 && <p style={muted}>Aun no hay placas en el registro.</p>}
          {shown.map((j) => (
            <div key={j.id} style={rowStyle}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: 100 }}>{j.plate}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                x{j.qty} · {j.holderName || "-"} {j.holderTaxId ? `(${j.holderTaxId})` : ""} {j.notes ? `· ${j.notes}` : ""}
              </span>
              <span style={{ color: "var(--color-text-muted)" }}>
                {fmt(j.createdAt)} {j.userName ? `· ${j.userName}` : ""}
              </span>
              <Button variant="ghost" style={{ padding: "4px 8px" }} onClick={() => onPlate(j.plate)} title="Volver a hacer">
                Repetir
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  style={{ padding: "4px 8px" }}
                  title="Borrar del registro"
                  onClick={() => confirm(`¿Borrar ${j.plate} del registro?`) && start(() => deletePlateJob(j.id))}
                >
                  <IconTrash />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const muted = { margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" } as const;
const checkStyle = { fontFamily: "var(--font-body)", fontSize: 13, display: "flex", gap: 6, alignItems: "center", color: "var(--color-text-primary)" } as const;
const rowStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  background: "var(--color-surface-2)",
  borderRadius: 8,
  padding: "6px 10px",
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  color: "var(--color-text-primary)",
} as const;
