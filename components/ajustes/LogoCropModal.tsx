"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function LogoCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [cutY, setCutY] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImgSrc(String(reader.result));
    reader.readAsDataURL(file);
  }, [file]);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const maxWidth = 320;
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    setDisplaySize({ width, height });
    setCutY(height);
  };

  const updateFromClientY = (clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let y = clientY - rect.top;
    y = Math.max(20, Math.min(displaySize.height, y));
    setCutY(y);
  };

  const startDrag = (clientY: number) => {
    draggingRef.current = true;
    updateFromClientY(clientY);
  };
  const endDrag = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientY(e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current && e.touches[0]) updateFromClientY(e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", endDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySize.height]);

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !displaySize.width) return;
    const scaleToNatural = img.naturalWidth / displaySize.width;
    const cropHeightNatural = Math.round(cutY * scaleToNatural);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = cropHeightNatural;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, img.naturalWidth, cropHeightNatural, 0, 0, img.naturalWidth, cropHeightNatural);
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <Modal title="Ajusta el logo" onClose={onCancel}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
          Arrastra la linea naranja hasta justo encima de lo que quieras quitar (por ejemplo, el telefono). Se
          eliminara todo lo que quede por debajo.
        </p>
        {imgSrc && (
          <div
            ref={containerRef}
            style={{ position: "relative", width: displaySize.width || "100%", margin: "0 auto", touchAction: "none", userSelect: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              onLoad={handleImgLoad}
              alt="Logo a recortar"
              style={{ display: "block", width: displaySize.width || "auto", height: displaySize.height || "auto", background: "#fff" }}
            />
            {displaySize.height > 0 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: cutY,
                    height: displaySize.height - cutY,
                    background: "rgba(0,0,0,0.55)",
                  }}
                />
                <div
                  onMouseDown={(e) => startDrag(e.clientY)}
                  onTouchStart={(e) => startDrag(e.touches[0].clientY)}
                  style={{
                    position: "absolute",
                    left: -6,
                    right: -6,
                    top: cutY - 12,
                    height: 24,
                    cursor: "ns-resize",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: "100%", height: 3, background: "var(--color-accent)" }} />
                  <div
                    style={{
                      position: "absolute",
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      border: "2px solid #fff",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={!imgSrc}>
            Guardar logo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
