"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { IconCamera, IconTrash } from "@/components/ui/icons";
import { LogoCropModal } from "./LogoCropModal";
import { removeLogo, updateLogo } from "@/app/ajustes/actions";

export function LogoUploadForm({ logoUrl }: { logoUrl: string }) {
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPendingFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) setPendingFile(file);
  };

  const handleCropConfirm = async (dataUrl: string) => {
    setPendingFile(null);
    setUploading(true);
    try {
      await updateLogo(dataUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo del taller" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, background: "#fff", padding: 4 }} />
      ) : (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 64,
            height: 64,
            borderRadius: 8,
            background: "var(--color-surface-2)",
            border: "1px dashed var(--color-border)",
            cursor: "pointer",
            outline: "none",
          }}
          aria-label="Haz clic y pulsa Ctrl+V para pegar el logo"
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button" variant="ghost" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <IconCamera /> {uploading ? "Guardando..." : logoUrl ? "Cambiar logo" : "Subir logo"}
          </Button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => startTransition(() => removeLogo())}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
              aria-label="Quitar logo"
            >
              <IconTrash />
            </button>
          )}
        </div>
        {!logoUrl && (
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-text-faint)" }}>
            O haz clic en el recuadro y pulsa Ctrl+V para pegar una imagen copiada.
          </p>
        )}
      </div>

      {pendingFile && (
        <LogoCropModal file={pendingFile} onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
