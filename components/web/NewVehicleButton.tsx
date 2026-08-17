"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { VehicleFormFields } from "./VehicleFormFields";
import { createVehicle } from "@/app/web/actions";

export function NewVehicleButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nuevo vehiculo
      </Button>
      {open && (
        <Modal title="Nuevo vehiculo de ocasion" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await createVehicle(fd);
              setOpen(false);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <VehicleFormFields />
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Anadir vehiculo
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
