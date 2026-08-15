"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconPause, IconPlay, IconStop } from "@/components/ui/icons";
import { fmtDur } from "@/lib/format";

type ActiveEntry = { start: Date; pausedMs: number; paused: boolean; pauseStart: Date | null };

export function OrderTimerControls({
  isActive,
  activeEntry,
  otherActive,
  startAction,
  togglePauseAction,
  finishAction,
}: {
  isActive: boolean;
  activeEntry: ActiveEntry | null;
  otherActive: boolean;
  startAction: () => void;
  togglePauseAction?: () => void;
  finishAction?: () => void;
}) {
  const running = isActive && !!activeEntry && !activeEntry.paused;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (isActive && activeEntry) {
    const elapsed =
      now -
      activeEntry.start.getTime() -
      activeEntry.pausedMs -
      (activeEntry.paused && activeEntry.pauseStart ? now - activeEntry.pauseStart.getTime() : 0);

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: activeEntry.paused ? "var(--color-warning)" : "var(--color-success)", minWidth: 62 }}>
          {fmtDur(Math.max(0, elapsed))}
        </span>
        <Button variant={activeEntry.paused ? "primary" : "secondary"} type="button" onClick={() => togglePauseAction?.()}>
          {activeEntry.paused ? <IconPlay size={15} /> : <IconPause size={15} />} {activeEntry.paused ? "Reanudar" : "Pausar"}
        </Button>
        <Button variant="danger" type="button" onClick={() => finishAction?.()}>
          <IconStop size={14} /> Finalizar
        </Button>
      </div>
    );
  }

  return (
    <Button variant="secondary" type="button" disabled={otherActive} onClick={() => startAction()}>
      <IconPlay size={15} /> Iniciar reparacion
    </Button>
  );
}
