"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextArea, TextInput } from "@/components/ui/inputs";
import { IconPlus } from "@/components/ui/icons";
import { createService } from "@/app/web/actions";

export function NewServiceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nuevo servicio
      </Button>
      {open && (
        <Modal title="Nuevo servicio" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await createService(fd);
              setOpen(false);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <Field label="Nombre del servicio">
              <TextInput name="name" placeholder="Cambio de aceite y filtros" required />
            </Field>
            <Field label="Descripcion">
              <TextArea name="description" placeholder="En que consiste, que incluye..." />
            </Field>
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Anadir servicio
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
