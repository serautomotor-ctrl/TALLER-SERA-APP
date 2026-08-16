"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/inputs";
import { Pill } from "@/components/ui/Pill";
import { updateAiApiKey } from "@/app/ajustes/actions";

export function AiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <Pill tone={hasKey ? "success" : "warning"}>{hasKey ? "Clave configurada" : "Sin configurar"}</Pill>
      </div>
      <form
        action={async (formData) => {
          await updateAiApiKey(formData);
          setSaved(true);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <Field label="Clave API">
          <TextInput type="password" name="aiApiKey" placeholder={hasKey ? "••••••••••••••••" : "sk-ant-..."} style={{ width: "100%" }} />
        </Field>
        <Button type="submit" variant="primary" style={{ alignSelf: "flex-start" }}>
          Guardar
        </Button>
      </form>
      {saved && (
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-success)" }}>Clave guardada.</p>
      )}
    </div>
  );
}
