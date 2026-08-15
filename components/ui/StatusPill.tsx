import { Pill } from "./Pill";
import type { Tone } from "./tones";

const STATUS_MAP: Record<string, { tone: Tone; label: string }> = {
  abierta: { tone: "steel", label: "Abierta" },
  en_progreso: { tone: "accent", label: "En progreso" },
  pendiente_piezas: { tone: "warning", label: "Pend. piezas" },
  cerrada: { tone: "success", label: "Cerrada" },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_MAP[status] || STATUS_MAP.abierta;
  return <Pill tone={m.tone}>{m.label}</Pill>;
}
