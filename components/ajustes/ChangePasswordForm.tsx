"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/inputs";
import { changePassword } from "@/app/ajustes/actions";

const initialState: { error?: string; ok?: boolean } = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    return changePassword(formData);
  }, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Field label="Contrasena actual">
        <TextInput type="password" name="currentPassword" required style={{ width: "100%" }} />
      </Field>
      <Field label="Nueva contrasena">
        <TextInput type="password" name="newPassword" required minLength={6} style={{ width: "100%" }} />
      </Field>
      <Field label="Repite la nueva contrasena">
        <TextInput type="password" name="confirmPassword" required minLength={6} style={{ width: "100%" }} />
      </Field>
      {state.error && (
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-danger)" }}>{state.error}</p>
      )}
      {state.ok && (
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-success)" }}>
          Contrasena actualizada correctamente.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "Guardando..." : "Cambiar contrasena"}
      </Button>
    </form>
  );
}
