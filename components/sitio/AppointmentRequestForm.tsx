"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/inputs";
import { requestAppointment } from "@/app/sitio/contacto/actions";

const initialState: { ok?: boolean; error?: string } = {};

export function AppointmentRequestForm() {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    return requestAppointment(formData);
  }, initialState);

  if (state.ok) {
    return (
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-success)" }}>
        Peticion enviada. Nos pondremos en contacto contigo para confirmar la cita.
      </p>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Tu nombre">
          <TextInput name="clientName" placeholder="Nombre y apellidos" required />
        </Field>
        <Field label="Telefono">
          <TextInput name="phone" placeholder="600 000 000" required />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Fecha preferida">
          <TextInput name="date" type="date" required />
        </Field>
        <Field label="Hora preferida">
          <TextInput name="time" type="time" defaultValue="09:00" />
        </Field>
      </div>
      <Field label="Matricula (opcional)">
        <TextInput name="plate" placeholder="0000 ABC" style={{ textTransform: "uppercase" }} />
      </Field>
      <Field label="Motivo de la visita">
        <TextInput name="reason" placeholder="Revision, cambio de neumaticos..." />
      </Field>
      <Field label="Cuentanos mas (opcional)">
        <TextArea name="notes" placeholder="Cualquier detalle que nos ayude a prepararnos" />
      </Field>
      {state.error && <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-danger)" }}>{state.error}</p>}
      <Button type="submit" variant="primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "Enviando..." : "Pedir cita"}
      </Button>
    </form>
  );
}
