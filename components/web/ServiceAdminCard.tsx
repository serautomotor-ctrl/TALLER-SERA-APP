"use client";

import { useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextArea, TextInput } from "@/components/ui/inputs";
import { IconCamera, IconTrash } from "@/components/ui/icons";
import { compressImage } from "@/lib/image";
import { removeService, setServicePhoto, updateService } from "@/app/web/actions";

export type AdminService = { id: string; name: string; description: string; photoUrl: string };

export function ServiceAdminCard({ service }: { service: AdminService }) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      await setServicePhoto(service.id, dataUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {service.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={service.photoUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 64, height: 64, borderRadius: 10, background: "var(--color-surface-2)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{service.name}</p>
        {service.description && (
          <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>{service.description}</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Button type="button" variant="ghost" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <IconCamera /> {uploading ? "Subiendo..." : "Foto"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Eliminar ${service.name}?`)) startTransition(() => removeService(service.id));
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {editing && (
        <Modal title={`Editar ${service.name}`} onClose={() => setEditing(false)}>
          <form
            action={async (fd) => {
              await updateService(service.id, fd);
              setEditing(false);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <Field label="Nombre del servicio">
              <TextInput name="name" defaultValue={service.name} required />
            </Field>
            <Field label="Descripcion">
              <TextArea name="description" defaultValue={service.description} />
            </Field>
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Guardar cambios
            </Button>
          </form>
        </Modal>
      )}
    </Card>
  );
}
