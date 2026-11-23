"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { Field, Select } from "@/components/ui/inputs";
import { IconCamera, IconTrash } from "@/components/ui/icons";
import { QuickPlateButton } from "@/components/placas/QuickPlateButton";
import { deleteVehicleDoc, updateVehicle, uploadVehicleDocs } from "@/app/vehiculos/actions";
import { VehicleFields } from "./NewVehicleButton";
import { prepareDocFiles } from "./docFiles";

type Doc = { id: string; kind: string; name: string; mime: string; size: number; createdAt: string };
type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  vin: string;
  mileage: number | null;
  firstRegistration: Date | null;
  fuel: string;
  color: string;
  notes: string;
  customer: { id: string; name: string; phone: string; taxId: string; vehicles: { id: string; plate: string }[] };
  documents: Doc[];
};

const KINDS = ["Ficha tecnica", "Permiso de circulacion", "ITV", "Seguro", "Otro"];
const docUrl = (id: string) => `/vehiculos/doc/${id}`;
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function VehicleDetail({ vehicle }: { vehicle: Vehicle }) {
  const [kind, setKind] = useState(KINDS[0]);
  const [viewing, setViewing] = useState<Doc | null>(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const upload = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setMsg("");
    start(async () => {
      const fd = new FormData();
      fd.set("kind", kind);
      for (const f of await prepareDocFiles(files)) fd.append("files", f);
      const r = await uploadVehicleDocs(vehicle.id, fd);
      setMsg(r.error || `Subido: ${kind}${(r.count || 0) > 1 ? ` (${r.count} archivos)` : ""}.`);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    });
  };

  const fichas = vehicle.documents.filter((d) => d.kind === "Ficha tecnica");
  const others = vehicle.customer.vehicles.filter((v) => v.id !== vehicle.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", letterSpacing: 1 }}>{vehicle.plate}</p>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-primary)" }}>
              {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Sin marca ni modelo"}
            </p>
            <p style={muted}>
              Cliente: <Link href={`/fichas?id=${vehicle.id}`} style={{ color: "var(--color-accent)", fontWeight: 600 }}>{vehicle.customer.name || "Sin nombre"}</Link>
              {vehicle.customer.phone ? ` · ${vehicle.customer.phone}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {fichas.length > 0 && (
              <Button variant="primary" onClick={() => setViewing(fichas[0])}>
                Ver ficha tecnica
              </Button>
            )}
            <QuickPlateButton plate={vehicle.plate} holderName={vehicle.customer.name} holderTaxId={vehicle.customer.taxId} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 14 }}>
          <Data label="Bastidor" value={vehicle.vin} mono />
          <Data label="Km" value={vehicle.mileage != null ? vehicle.mileage.toLocaleString("es-ES") : ""} />
          <Data label="1a matriculacion" value={vehicle.firstRegistration ? new Date(vehicle.firstRegistration).toLocaleDateString("es-ES") : ""} />
          <Data label="Combustible" value={vehicle.fuel} />
          <Data label="Color" value={vehicle.color} />
        </div>
        {vehicle.notes && <p style={muted}>{vehicle.notes}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Editar datos
          </Button>
          <Link href={`/vehiculos?cliente=${vehicle.customer.id}`}>
            <Button variant="ghost">Anadir otro vehiculo a este cliente</Button>
          </Link>
        </div>
        {others.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <span style={muted}>Otros vehiculos del cliente:</span>
            {others.map((v) => (
              <Link key={v.id} href={`/vehiculos?id=${v.id}`}>
                <Pill tone="steel">{v.plate}</Pill>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Ficha tecnica y documentacion</SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
          <Field label="Que vas a subir">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </Select>
          </Field>
          <Button variant="primary" disabled={pending} onClick={() => fileRef.current?.click()}>
            {pending ? "Subiendo..." : "Subir archivo (PDF o foto)"}
          </Button>
          <Button disabled={pending} onClick={() => camRef.current?.click()}>
            <IconCamera /> Hacer foto
          </Button>
          <input ref={fileRef} type="file" multiple accept="application/pdf,image/*" hidden onChange={(e) => upload(e.target.files)} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files)} />
        </div>
        {msg && <p style={{ ...muted, color: "var(--color-text-primary)" }}>{msg}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}>
          {vehicle.documents.length === 0 && <p style={muted}>Aun no hay documentos. Sube la ficha tecnica escaneada (PDF) o hazle una foto por cada cara.</p>}
          {vehicle.documents.map((d) => (
            <div key={d.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden", background: "var(--color-surface-2)" }}>
              <button onClick={() => setViewing(d)} style={{ display: "block", width: "100%", height: 120, padding: 0, border: "none", cursor: "pointer", background: "#fff" }} title="Ver">
                {d.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={docUrl(d.id)} alt={d.kind} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "#c0392b" }}>
                    PDF
                  </span>
                )}
              </button>
              <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-primary)", minWidth: 0 }}>
                  <strong>{d.kind}</strong>
                  <br />
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {new Date(d.createdAt).toLocaleDateString("es-ES")} · {kb(d.size)}
                  </span>
                </span>
                <button
                  title="Borrar"
                  onClick={() => confirm(`¿Borrar ${d.kind}?`) && start(() => deleteVehicleDoc(d.id))}
                  style={{ background: "none", border: "none", color: "var(--color-text-faint)", cursor: "pointer" }}
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {viewing && (
        <Modal title={`${viewing.kind} · ${vehicle.plate}`} onClose={() => setViewing(null)} maxWidth={1000}>
          {viewing.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={docUrl(viewing.id)} alt={viewing.kind} style={{ width: "100%", display: "block", borderRadius: 8 }} />
          ) : (
            <iframe src={docUrl(viewing.id)} title={viewing.kind} style={{ width: "100%", height: "72vh", border: "none", borderRadius: 8, background: "#fff" }} />
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <a href={docUrl(viewing.id)} target="_blank" rel="noreferrer">
              <Button>Abrir en pestana nueva</Button>
            </a>
            <a href={`${docUrl(viewing.id)}?descargar=1`}>
              <Button variant="ghost">Descargar</Button>
            </a>
            {vehicle.documents.length > 1 &&
              vehicle.documents
                .filter((d) => d.id !== viewing.id)
                .map((d) => (
                  <Button key={d.id} variant="ghost" onClick={() => setViewing(d)}>
                    Ver {d.kind.toLowerCase()} ({new Date(d.createdAt).toLocaleDateString("es-ES")})
                  </Button>
                ))}
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Editar ${vehicle.plate}`} onClose={() => setEditing(false)} maxWidth={520}>
          <form
            action={(fd) =>
              start(async () => {
                await updateVehicle(vehicle.id, fd);
                setEditing(false);
              })
            }
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <VehicleFields v={vehicle} />
            <Button variant="primary" type="submit" disabled={pending}>
              Guardar
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Data({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "7px 10px" }}>
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontFamily: mono ? "var(--font-mono)" : "var(--font-body)", fontSize: 13.5, color: "var(--color-text-primary)", wordBreak: "break-all" }}>{value || "-"}</p>
    </div>
  );
}

const muted = { margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" } as const;
