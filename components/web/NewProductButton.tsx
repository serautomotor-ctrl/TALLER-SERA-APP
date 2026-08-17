"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { ProductFormFields } from "./ProductFormFields";
import { createProduct } from "@/app/web/actions";

export function NewProductButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nuevo producto
      </Button>
      {open && (
        <Modal title="Nuevo producto" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await createProduct(fd);
              setOpen(false);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <ProductFormFields />
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Anadir producto
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
