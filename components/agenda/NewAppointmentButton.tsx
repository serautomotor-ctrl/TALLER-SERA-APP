"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { createAppointment } from "@/app/agenda/actions";

export function NewAppointmentButton({ dateKey }: { dateKey: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nueva cita
      </Button>
      {open && (
        <Modal title="Nueva cita" onClose={() => setOpen(false)}>
          <form
            action={async (formData) => {
              await createAppointment(formData);
              setOpen(false);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
              <Field label="Fecha">
                <TextInput type="date" name="date" defaultValue={dateKey} required />
              </Field>
              <Field label="Hora">
                <TextInput type="time" name="time" defaultValue="09:00" required />
              </Field>
            </div>
            <Field label="Matricula (opcional)">
              <TextInput name="plate" placeholder="0000 ABC" style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="Cliente">
              <TextInput name="clientName" placeholder="Nombre y apellidos" />
            </Field>
            <Field label="Motivo">
              <TextInput name="reason" placeholder="Revision, cambio de neumaticos..." />
            </Field>
            <Field label="Notas (opcional)">
              <TextArea name="notes" placeholder="Notas adicionales" />
            </Field>
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Guardar cita
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
