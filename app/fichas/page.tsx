import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { TextInput } from "@/components/ui/inputs";
import { IconSearch } from "@/components/ui/icons";
import { NewFichaButton } from "@/components/fichas/NewFichaButton";
import { FichaDetalle } from "@/components/fichas/FichaDetalle";
import { prisma } from "@/lib/prisma";

export default async function FichasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>;
}) {
  const { q = "", id } = await searchParams;

  const vehicles = await prisma.vehicle.findMany({
    where: q
      ? {
          OR: [
            { plate: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  const selected = id
    ? await prisma.vehicle.findUnique({
        where: { id },
        include: { history: { orderBy: { date: "desc" } }, warranties: { orderBy: { addedAt: "desc" } } },
      })
    : null;

  return (
    <div>
      <Header title="Fichas por matricula" subtitle="Busca un vehiculo para ver historial, garantias y cobros pendientes" right={<NewFichaButton />} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 12 }}>
          <form action="/fichas" method="get" style={{ position: "relative", marginBottom: 10 }}>
            <IconSearch style={{ position: "absolute", left: 10, top: 9, color: "var(--color-text-faint)" }} />
            <TextInput name="q" defaultValue={q} placeholder="Buscar matricula o cliente" style={{ paddingLeft: 32, width: "100%" }} />
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 480, overflowY: "auto" }}>
            {vehicles.length === 0 && (
              <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13, padding: "6px 4px" }}>Sin resultados.</p>
            )}
            {vehicles.map((v) => {
              const active = v.id === id;
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              params.set("id", v.id);
              return (
                <Link
                  key={v.id}
                  href={`/fichas?${params.toString()}`}
                  style={{
                    display: "block",
                    padding: "9px 10px",
                    borderRadius: 8,
                    background: active ? "var(--color-accent-soft)" : "transparent",
                    border: `1px solid ${active ? "color-mix(in srgb, var(--color-accent) 33%, transparent)" : "transparent"}`,
                  }}
                >
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>
                    {v.plate}
                  </p>
                  <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {v.clientName || "Sin nombre"}
                  </p>
                </Link>
              );
            })}
          </div>
        </Card>

        {selected ? (
          <FichaDetalle vehicle={selected} />
        ) : (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Selecciona una ficha de la lista, o crea una nueva para empezar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
