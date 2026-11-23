"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconPrint } from "@/components/ui/icons";
import { platePrintHtml } from "@/lib/plate";
import { getPlateConfig, recordPlateJob } from "@/app/placas/actions";

/** Un clic: imprime las 2 placas del vehiculo con los ajustes guardados y lo apunta en el registro */
export function QuickPlateButton({ plate, holderName, holderTaxId }: { plate: string; holderName: string; holderTaxId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const go = async () => {
    setMsg("");
    // La ventana se abre en el mismo clic (si no, el navegador la bloquea) y luego se rellena
    const w = window.open("", "_blank", "width=900,height=400");
    if (!w) return setMsg("Permite las ventanas emergentes para imprimir.");
    w.document.write("<p style='font-family:Arial'>Preparando placas...</p>");
    setBusy(true);
    try {
      const cfg = await getPlateConfig();
      w.document.open();
      w.document.write(platePrintHtml(plate, cfg, 2));
      w.document.close();
      await recordPlateJob({ plate, qty: 2, holderName, holderTaxId, notes: "Desde la ficha" });
      setMsg("Enviadas a imprimir (2 placas).");
    } catch {
      w.close();
      setMsg("No se pudo preparar la impresion.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Button variant="primary" onClick={go} disabled={busy} style={{ padding: "6px 12px" }}>
        <IconPrint /> {busy ? "Preparando..." : "Crear matricula"}
      </Button>
      {msg && <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>{msg}</span>}
    </span>
  );
}
