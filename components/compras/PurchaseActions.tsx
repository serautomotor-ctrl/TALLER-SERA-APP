"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { removePurchase, setPurchasePaid } from "@/app/compras/actions";

export function PurchaseActions({ id, paid, canPay }: { id: string; paid: boolean; canPay: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {canPay && (
        <Button type="button" variant={paid ? "ghost" : "primary"} disabled={pending} onClick={() => start(() => setPurchasePaid(id, !paid))}>
          {paid ? "Marcar como no pagada" : "Marcar como pagada"}
        </Button>
      )}
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("¿Borrar esta compra? Si metio piezas en el almacen, se restaran.")) return;
          start(async () => {
            await removePurchase(id);
            router.replace("/compras");
          });
        }}
      >
        Borrar
      </Button>
    </div>
  );
}
