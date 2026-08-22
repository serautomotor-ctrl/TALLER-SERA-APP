"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/inputs";
import { setOrderObservations } from "@/app/ordenes/actions";

export function OrderObservations({ orderId, observations }: { orderId: string; observations: string }) {
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (formData) => {
        await setOrderObservations(orderId, formData);
        setSaved(true);
      }}
      style={{ width: "100%", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 6 }}
    >
      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
        Observaciones
      </span>
      <TextArea
        name="observations"
        defaultValue={observations}
        onChange={() => setSaved(false)}
        placeholder="Diagnostico, hallazgos o notas de cierre de la reparacion..."
        style={{ width: "100%", minHeight: 60 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button type="submit" style={{ alignSelf: "flex-start" }}>
          Guardar observaciones
        </Button>
        {saved && (
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-success)" }}>Guardado.</span>
        )}
      </div>
    </form>
  );
}
