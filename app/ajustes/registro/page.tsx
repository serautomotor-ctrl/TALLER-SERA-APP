import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { CsvButton } from "@/components/ui/CsvButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const logs = await prisma.auditLog.findMany({
    where: q
      ? { OR: [{ userName: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }, { detail: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { at: "desc" },
    take: 400,
  });

  return (
    <div>
      <Header
        title="Registro de acciones"
        subtitle="Quien ha hecho que y cuando: facturas, cobros, cambios de numero, caja, compras, usuarios..."
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <CsvButton
              filename="registro_acciones.csv"
              headers={["Fecha", "Usuario", "Accion", "Detalle"]}
              rows={logs.map((l) => [l.at.toLocaleString("es-ES"), l.userName, l.action, l.detail])}
            />
            <Link href="/ajustes">
              <Button type="button" variant="ghost">
                Volver a Ajustes
              </Button>
            </Link>
          </div>
        }
      />
      <form action="/ajustes/registro" method="get" style={{ marginBottom: 12, maxWidth: 340 }}>
        <TextInput name="q" defaultValue={q} placeholder="Buscar por usuario, accion o detalle" style={{ width: "100%" }} />
      </form>
      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 12.5, minWidth: 560 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--color-text-muted)" }}>
              <th style={th}>Fecha</th>
              <th style={th}>Usuario</th>
              <th style={th}>Accion</th>
              <th style={th}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...td, color: "var(--color-text-faint)" }}>
                  Sin registros todavia.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={{ ...td, whiteSpace: "nowrap", color: "var(--color-text-muted)" }}>{l.at.toLocaleString("es-ES")}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{l.userName || "-"}</td>
                <td style={{ ...td, fontWeight: 600 }}>{l.action}</td>
                <td style={td}>{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const th = { padding: "10px 12px", fontWeight: 600 } as const;
const td = { padding: "8px 12px" } as const;
