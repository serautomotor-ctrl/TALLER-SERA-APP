"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { IconCamera, IconTrash } from "@/components/ui/icons";
import { compressImage } from "@/lib/image";

export function PhotoManager({
  photos,
  addPhoto,
  removePhoto,
}: {
  photos: string[];
  addPhoto: (dataUrl: string) => Promise<void>;
  removePhoto: (index: number) => Promise<void>;
}) {
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await compressImage(file);
        await addPhoto(dataUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {photos.map((p, idx) => (
          <div key={idx} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-border)" }} />
            <button
              type="button"
              onClick={() => startTransition(() => removePhoto(idx))}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--color-danger)",
                color: "#fff",
                border: "none",
                fontSize: 11,
                lineHeight: "18px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
        <IconCamera /> {uploading ? "Subiendo..." : "Anadir fotos"}
      </Button>
    </div>
  );
}
