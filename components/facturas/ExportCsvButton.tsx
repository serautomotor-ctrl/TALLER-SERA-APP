"use client";

import { Button } from "@/components/ui/Button";
import { IconPrint } from "@/components/ui/icons";
import { fmtDate } from "@/lib/format";

type Invoice = {
  number: string;
  createdAt: Date;
  clientName: string;
  clientNif: string;
  plate: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  hash: string;
};

function csvEscape(val: string) {
  if (/[",\n;]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

export function ExportCsvButton({ invoices }: { invoices: Invoice[] }) {
  const handleExport = () => {
    const headers = ["numero", "fecha", "cliente", "nif_cliente", "matricula", "base_imponible", "iva", "total", "hash"];
    const rows = invoices.map((inv) =>
      [inv.number, fmtDate(inv.createdAt), inv.clientName, inv.clientNif, inv.plate, inv.subtotal.toFixed(2), inv.vatTotal.toFixed(2), inv.total.toFixed(2), inv.hash]
        .map((v) => csvEscape(String(v ?? "")))
        .join(";")
    );
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="ghost" type="button" onClick={handleExport}>
      <IconPrint /> Exportar CSV
    </Button>
  );
}
