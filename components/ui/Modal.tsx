"use client";

import type { ReactNode } from "react";
import { SectionTitle } from "./SectionTitle";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: 20,
          width: "100%",
          maxWidth: 420,
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>{title}</SectionTitle>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-muted)", fontSize: 18, cursor: "pointer" }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
