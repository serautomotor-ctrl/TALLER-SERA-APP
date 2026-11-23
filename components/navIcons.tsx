import type { SVGProps } from "react";
import {
  IconBarcode,
  IconBell,
  IconBoard,
  IconBook,
  IconCalendar,
  IconCar,
  IconCard,
  IconCash,
  IconChart,
  IconClipboard,
  IconClock,
  IconEstimate,
  IconInvoice,
  IconQr,
  IconSettings,
  IconShield,
  IconSparkle,
  IconTruck,
  IconUsers,
  IconWorld,
} from "./ui/icons";

function IconMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function IconPlate(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="2.5" y="7.5" width="19" height="9" rx="1.8" />
      <path d="M6 7.5v9" />
      <path d="M9 12h3M14.5 12h4" strokeLinecap="round" />
    </svg>
  );
}

/** Icono de cada seccion (claves de lib/permissions) */
export const NAV_ICONS = {
  menu: IconMenu,
  horario: IconClock,
  fichas: IconCard,
  agenda: IconCalendar,
  avisos: IconBell,
  recepcion: IconClipboard,
  ordenes: IconQr,
  taller: IconBoard,
  articulos: IconBarcode,
  cortesia: IconCar,
  placas: IconPlate,
  diagnostico: IconSparkle,
  presupuestos: IconEstimate,
  facturas: IconInvoice,
  caja: IconCash,
  compras: IconTruck,
  aseguradoras: IconShield,
  fiscal: IconBook,
  rentabilidad: IconChart,
  operarios: IconUsers,
  web: IconWorld,
  ajustes: IconSettings,
} as const;
