"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Field, TextArea, TextInput } from "@/components/ui/inputs";
import { IconSparkle } from "@/components/ui/icons";
import { runDiagnosis } from "@/app/diagnostico/actions";

type State = { error?: string; diagnosisId?: string; response?: string };
const initialState: State = {};

export function DiagnosisForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(async (_prev: State, formData: FormData) => {
    return runDiagnosis(formData);
  }, initialState);

  useEffect(() => {
    if (state.diagnosisId) {
      router.push(`/diagnostico?id=${state.diagnosisId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.diagnosisId]);

  return (
    <Card>
      <SectionTitle>Describe la averia</SectionTitle>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        <Field label="Matricula (opcional)">
          <TextInput name="plate" placeholder="0000 ABC" style={{ textTransform: "uppercase" }} />
        </Field>
        <Field label="Sintomas">
          <TextArea
            name="symptoms"
            placeholder="Ej: al arrancar en frio hace un ruido metalico durante unos segundos y luego desaparece..."
            style={{ minHeight: 90 }}
            required
          />
        </Field>
        <Button type="submit" variant="primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
          <IconSparkle /> {pending ? "Consultando IA..." : "Diagnosticar"}
        </Button>
      </form>
      {state.error && (
        <p style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-danger)" }}>{state.error}</p>
      )}
    </Card>
  );
}
