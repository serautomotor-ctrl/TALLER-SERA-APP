"use client";

import { Button } from "./Button";

function esc(val: string) {
  return /[";\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
}

/**
 * Descarga una tabla como CSV para Excel en espanol: separador ";", decimales con coma
 * y BOM para que salgan bien las tildes.
 */
export function CsvButton({ filename, headers, rows, label = "Descargar Excel (CSV)" }: { filename: string; headers: string[]; rows: (string | number)[][]; label?: string }) {
  const download = () => {
    const fmt = (v: string | number) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : esc(String(v ?? "")));
    const csv = "﻿" + [headers.map(esc).join(";"), ...rows.map((r) => r.map(fmt).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" variant="ghost" onClick={download} disabled={!rows.length}>
      {label}
    </Button>
  );
}
