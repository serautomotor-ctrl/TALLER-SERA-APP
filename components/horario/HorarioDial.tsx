"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/inputs";
import { IconPause, IconPlay, IconStop } from "@/components/ui/icons";
import { fmtDur } from "@/lib/format";

type ActiveEntry = {
  id: string;
  task: string;
  plate: string;
  start: Date;
  pausedMs: number;
  paused: boolean;
  pauseStart: Date | null;
};

function useTicker(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function DialButton({ running, elapsedMs, onToggle }: { running: boolean; elapsedMs: number; onToggle: () => void }) {
  const R = 88;
  const CX = 100;
  const CY = 100;
  const circumference = 2 * Math.PI * R;
  const pct = running ? (elapsedMs % 3600000) / 3600000 : 0;
  const dash = circumference * pct;
  return (
    <div style={{ position: "relative", width: 200, height: 200 }}>
      <svg width="200" height="200" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth="10" />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={running ? "var(--color-accent)" : "var(--color-text-faint)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.3s linear" }}
        />
      </svg>
      <button
        onClick={onToggle}
        aria-label={running ? "Pausar" : "Iniciar"}
        style={{
          position: "absolute",
          inset: 14,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: running ? "var(--color-warning)" : "var(--color-accent)",
          color: "#1A0E04",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          boxShadow: "0 6px 0 rgba(0,0,0,0.35)",
        }}
      >
        {running ? <IconPause size={34} /> : <IconPlay size={34} />}
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, textTransform: "uppercase", letterSpacing: 1 }}>
          {running ? "Pausar" : "Iniciar"}
        </span>
      </button>
    </div>
  );
}

export function HorarioDial({
  activeEntry,
  startEntryAction,
  togglePauseAction,
  finishEntryAction,
}: {
  activeEntry: ActiveEntry | null;
  startEntryAction: (formData: FormData) => void;
  togglePauseAction?: () => void;
  finishEntryAction?: () => void;
}) {
  const running = !!activeEntry && !activeEntry.paused;
  const now = useTicker(running);

  const elapsed = activeEntry
    ? now -
      activeEntry.start.getTime() -
      activeEntry.pausedMs -
      (activeEntry.paused && activeEntry.pauseStart ? now - activeEntry.pauseStart.getTime() : 0)
    : 0;

  return (
    <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minWidth: 260 }}>
      <DialButton running={running} elapsedMs={elapsed} onToggle={() => (activeEntry ? togglePauseAction?.() : undefined)} />
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
        {fmtDur(Math.max(0, elapsed))}
      </p>
      {activeEntry ? (
        <>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            {activeEntry.task} {activeEntry.plate ? `· ${activeEntry.plate}` : ""}
          </p>
          <Button variant="danger" type="button" onClick={() => finishEntryAction?.()} style={{ width: "100%" }}>
            <IconStop /> Finalizar tarea
          </Button>
        </>
      ) : (
        <form action={startEntryAction} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <TextInput name="task" placeholder="Descripcion de la tarea" />
          <TextInput name="plate" placeholder="Matricula (opcional)" style={{ textTransform: "uppercase" }} />
          <Button variant="primary" type="submit">
            <IconPlay size={16} /> Iniciar
          </Button>
        </form>
      )}
    </Card>
  );
}
