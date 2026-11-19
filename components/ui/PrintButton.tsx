"use client";

import { Button } from "./Button";
import { IconPrint } from "./icons";

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()}>
      <IconPrint /> {label}
    </Button>
  );
}
