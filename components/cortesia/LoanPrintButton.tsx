"use client";

import { Button } from "@/components/ui/Button";
import { IconPrint } from "@/components/ui/icons";

type Loan = {
  carLabel: string;
  clientName: string;
  phone: string;
  clientPlate: string;
  outAt: string;
  expectedBack: string;
  kmOut: number | null;
  fuelOut: string;
  notes: string;
  signatureUrl: string;
};

export function LoanPrintButton({ loan, workshopName }: { loan: Loan; workshopName: string }) {
  const print = () => {
    const w = window.open("", "_blank", "width=560,height=720");
    if (!w) return;
    w.document.write(`
      <html><head><title>Prestamo ${loan.carLabel}</title></head>
      <body style="font-family: Arial, sans-serif; padding:24px; color:#111; font-size:13px;" onload="window.print()">
        <h2 style="margin:0 0 4px;">Contrato de vehiculo de cortesia</h2>
        <p style="margin:0 0 14px; color:#555;">${workshopName}</p>
        <p><strong>Vehiculo prestado:</strong> ${loan.carLabel}</p>
        <p><strong>Cliente:</strong> ${loan.clientName} ${loan.phone ? "· " + loan.phone : ""}</p>
        ${loan.clientPlate ? `<p><strong>Vehiculo del cliente en reparacion:</strong> ${loan.clientPlate}</p>` : ""}
        <p><strong>Entrega:</strong> ${loan.outAt} ${loan.expectedBack ? `· <strong>Devolucion prevista:</strong> ${loan.expectedBack}` : ""}</p>
        <p><strong>Km de salida:</strong> ${loan.kmOut ?? "-"} · <strong>Combustible:</strong> ${loan.fuelOut || "-"}</p>
        ${loan.notes ? `<p><strong>Observaciones:</strong> ${loan.notes}</p>` : ""}
        <p style="font-size:12px; color:#333; margin-top:18px;">El cliente recibe el vehiculo en buen estado y se compromete a devolverlo en las mismas condiciones y con el mismo nivel de combustible.
        Durante el prestamo es responsable de las sanciones de trafico, danos no cubiertos por el seguro y del uso adecuado del vehiculo.</p>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:30px;">
          <div>Firma del taller</div>
          <div style="text-align:center;">${loan.signatureUrl ? `<img src="${loan.signatureUrl}" style="width:200px; display:block;" />` : "<div style='height:60px'></div>"}Firma del cliente</div>
        </div>
      </body></html>`);
    w.document.close();
  };
  return (
    <Button type="button" variant="ghost" onClick={print}>
      <IconPrint /> Contrato
    </Button>
  );
}
