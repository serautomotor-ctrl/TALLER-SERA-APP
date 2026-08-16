"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/inputs";
import { setOrderStatus } from "@/app/ordenes/actions";

const OPTIONS = [
  { value: "abierta", label: "Abierta" },
  { value: "en_progreso", label: "En progreso" },
  { value: "pendiente_piezas", label: "Pend. piezas" },
  { value: "cerrada", label: "Cerrada" },
];

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: string }) {
  const [, startTransition] = useTransition();

  return (
    <Select
      key={status}
      defaultValue={status}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          setOrderStatus(orderId, value);
        });
      }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
