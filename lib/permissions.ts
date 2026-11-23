/**
 * Secciones del programa y permisos. Sin dependencias de servidor: se usa en el proxy,
 * en el menu y en las paginas.
 */

export const SECTIONS = [
  { key: "horario", label: "Horario y fichaje", paths: ["/horario"], group: "Taller" },
  { key: "fichas", label: "Fichas de clientes y vehiculos", paths: ["/fichas"], group: "Taller" },
  { key: "vehiculos", label: "Vehiculos y ficha tecnica", paths: ["/vehiculos"], group: "Taller" },
  { key: "agenda", label: "Agenda", paths: ["/agenda"], group: "Taller" },
  { key: "avisos", label: "Avisos a clientes", paths: ["/avisos"], group: "Taller" },
  { key: "recepcion", label: "Recepcion", paths: ["/recepcion"], group: "Taller" },
  { key: "ordenes", label: "Ordenes y QR", paths: ["/ordenes"], group: "Taller" },
  { key: "taller", label: "Planificador del taller", paths: ["/taller"], group: "Taller" },
  { key: "articulos", label: "Articulos y stock", paths: ["/articulos"], group: "Taller" },
  { key: "cortesia", label: "Vehiculos de cortesia", paths: ["/cortesia"], group: "Taller" },
  { key: "placas", label: "Placas de matricula", paths: ["/placas"], group: "Taller" },
  { key: "diagnostico", label: "Diagnostico con IA", paths: ["/diagnostico"], group: "Taller" },
  { key: "presupuestos", label: "Presupuestos", paths: ["/presupuestos"], group: "Oficina" },
  { key: "facturas", label: "Facturas", paths: ["/facturas"], group: "Oficina" },
  { key: "caja", label: "Cobros y caja", paths: ["/caja"], group: "Oficina" },
  { key: "compras", label: "Proveedores y compras", paths: ["/compras"], group: "Oficina" },
  { key: "aseguradoras", label: "Aseguradoras", paths: ["/aseguradoras"], group: "Oficina" },
  { key: "fiscal", label: "Fiscal (libros, 303, 347)", paths: ["/fiscal"], group: "Gestion" },
  { key: "rentabilidad", label: "Rentabilidad", paths: ["/rentabilidad"], group: "Gestion" },
  { key: "operarios", label: "Operarios y jornada", paths: ["/operarios"], group: "Gestion" },
  { key: "web", label: "Pagina web", paths: ["/web"], group: "Gestion" },
  { key: "ajustes", label: "Ajustes, usuarios y registro", paths: ["/ajustes"], group: "Gestion" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

/** Permisos de partida al crear un usuario mecanico */
export const MECHANIC_DEFAULT: SectionKey[] = ["horario", "fichas", "vehiculos", "agenda", "recepcion", "ordenes", "taller", "articulos", "cortesia", "placas", "diagnostico"];

type UserLike = { isAdmin: boolean; permissions: string[] };

export function canAccess(user: UserLike, key: SectionKey) {
  return user.isAdmin || user.permissions.includes(key);
}

/** Que seccion protege esta ruta (null = libre para cualquiera con sesion, p. ej. Inicio) */
export function sectionForPath(pathname: string): SectionKey | null {
  for (const s of SECTIONS) {
    if (s.paths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return s.key;
  }
  return null;
}
