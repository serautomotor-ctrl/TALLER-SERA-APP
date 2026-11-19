"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { acceptBudgetOnline } from "@/app/doc/actions";

export function BudgetAcceptForm({ budgetId, token, defaultName }: { budgetId: string; token: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [saving, start] = useTransition();

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", color: "#14161a" }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Aceptar el presupuesto</div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#555" }}>
        Si estas de acuerdo, escribe tu nombre y firma con el dedo en el recuadro. Asi el taller puede empezar la reparacion.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre y apellidos"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14, marginBottom: 10, fontFamily: "inherit", color: "#14161a", background: "#fff" }}
      />
      <SignaturePad
        saving={saving}
        saveLabel="Acepto el presupuesto"
        onSave={(url) =>
          start(async () => {
            setError("");
            const res = await acceptBudgetOnline(budgetId, token, name, url);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      />
      {error && <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}
