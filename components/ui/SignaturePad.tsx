"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

/**
 * Lienzo para firmar con el dedo (tablet/movil) o el raton.
 * Devuelve la firma como imagen PNG (data URL) al pulsar "Guardar firma".
 */
export function SignaturePad({
  onSave,
  saving,
  saveLabel = "Guardar firma",
  height = 170,
}: {
  onSave: (dataUrl: string) => void;
  saving?: boolean;
  saveLabel?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111";
      setEmpty(true);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setEmpty(true);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || empty) return;
    // Reducimos la imagen para no guardar firmas enormes en la base de datos
    const out = document.createElement("canvas");
    const w = 480;
    out.width = w;
    out.height = Math.round((canvas.height / canvas.width) * w);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    onSave(out.toDataURL("image/png"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        style={{ width: "100%", height, background: "#fff", borderRadius: 10, border: "1px dashed var(--color-border)", touchAction: "none", cursor: "crosshair" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" variant="ghost" onClick={clear}>
          Borrar
        </Button>
        <Button type="button" variant="primary" disabled={empty || saving} onClick={save} style={{ flex: 1 }}>
          {saving ? "Guardando..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
