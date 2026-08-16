"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { addChecklistItem, removeChecklistItem } from "@/app/ajustes/actions";

export function ChecklistEditor({ items }: { items: string[] }) {
  const [, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <form action={addChecklistItem} style={{ display: "flex", gap: 8 }}>
        <TextInput name="text" placeholder="Ej: Filtro de habitaculo" style={{ flex: 1 }} />
        <Button type="submit">
          <IconPlus />
        </Button>
      </form>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 999,
              padding: "5px 6px 5px 12px",
              fontFamily: "var(--font-body)",
              fontSize: 12.5,
              color: "var(--color-text-primary)",
            }}
          >
            {item}
            <button
              type="button"
              onClick={() => startTransition(() => removeChecklistItem(item))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", display: "flex" }}
            >
              <IconTrash />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
