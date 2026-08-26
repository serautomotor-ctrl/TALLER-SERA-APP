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

function EntryRow({
  entry,
  onTogglePause,
  onFinish,
}: {
  entry: ActiveEntry;
  onTogglePause: () => void;
  onFinish: () => void;
}) {
  const running = !entry.paused;
  const now = useTicker(running);
  const elapsed =
    now - entry.start.getTime() - entry.pausedMs - (entry.paused && entry.pauseStart ? now - entry.pauseStart.getTime() : 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        background: "var(--color-surface-2)",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            flexShrink: 0,
            background: entry.paused ? "var(--color-warning)" : "var(--color-success)",
            boxShadow: entry.paused ? "none" : "0 0 0 3px var(--color-success-soft)",
          }}
        />
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>
            {entry.task || "Tarea sin nombre"} {entry.plate ? `· ${entry.plate}` : ""}
          </p>
          <p style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: entry.paused ? "var(--color-warning)" : "var(--color-success)" }}>
            {fmtDur(Math.max(0, elapsed))}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant={entry.paused ? "primary" : "secondary"} type="button" onClick={onTogglePause}>
          {entry.paused ? <IconPlay size={15} /> : <IconPause size={15} />} {entry.paused ? "Reanudar" : "Pausar"}
        </Button>
        <Button variant="danger" type="button" onClick={onFinish}>
          <IconStop size={14} /> Finalizar
        </Button>
      </div>
    </div>
  );
}

export function HorarioDial({
  activeEntries,
  startEntryAction,
  togglePauseAction,
  finishEntryAction,
}: {
  activeEntries: ActiveEntry[];
  startEntryAction: (formData: FormData) => void;
  togglePauseAction: (id: string) => void;
  finishEntryAction: (id: string) => void;
}) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 260 }}>
      {activeEntries.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onTogglePause={() => togglePauseAction(entry.id)}
              onFinish={() => finishEntryAction(entry.id)}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5, margin: 0 }}>
          No hay ninguna tarea en marcha ahora mismo.
        </p>
      )}
      <form action={startEntryAction} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, paddingTop: activeEntries.length > 0 ? 4 : 0, borderTop: activeEntries.length > 0 ? "1px solid var(--color-border)" : "none" }}>
        <TextInput name="task" placeholder="Descripcion de la tarea" />
        <TextInput name="plate" placeholder="Matricula (opcional)" style={{ textTransform: "uppercase" }} />
        <Button variant="primary" type="submit">
          <IconPlay size={16} /> Iniciar nueva tarea
        </Button>
      </form>
    </Card>
  );
}
