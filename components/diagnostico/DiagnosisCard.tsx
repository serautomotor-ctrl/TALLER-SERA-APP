"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { IconTrash } from "@/components/ui/icons";
import { fmtDate } from "@/lib/format";
import { removeDiagnosis, setResolution } from "@/app/diagnostico/actions";

type Diagnosis = {
  id: string;
  plate: string;
  symptoms: string;
  aiResponse: string;
  resolved: boolean;
  resolution: string;
  createdAt: Date;
};

export function DiagnosisCard({ diagnosis, expanded }: { diagnosis: Diagnosis; expanded: boolean }) {
  const [, startTransition] = useTransition();

  return (
    <Card style={expanded ? { border: "1px solid var(--color-accent)" } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>
            {diagnosis.plate ? `${diagnosis.plate} · ` : ""}
            {fmtDate(diagnosis.createdAt)}
          </p>
          <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>{diagnosis.symptoms}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pill tone={diagnosis.resolved ? "success" : "warning"}>{diagnosis.resolved ? "Resuelto" : "Sin resolver"}</Pill>
          {!expanded && (
            <Link href={`/diagnostico?id=${diagnosis.id}`} style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-accent)" }}>
              Ver
            </Link>
          )}
          <button
            type="button"
            onClick={() => startTransition(() => removeDiagnosis(diagnosis.id))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
            {diagnosis.aiResponse}
          </div>
          {diagnosis.resolution ? (
            <div>
              <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Resolucion real
              </p>
              <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>{diagnosis.resolution}</p>
            </div>
          ) : (
            <form action={setResolution.bind(null, diagnosis.id)} style={{ display: "flex", gap: 8 }}>
              <TextInput name="resolution" placeholder="Que fue realmente (ayuda a futuros diagnosticos)" style={{ flex: 1 }} />
              <Button type="submit">Guardar</Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
