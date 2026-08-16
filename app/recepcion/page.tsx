import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { ReceptionDetalle } from "@/components/recepcion/ReceptionDetalle";
import { fmtDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getOrCreateReception } from "./actions";

export const dynamic = "force-dynamic";

export default async function RecepcionPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { reception: true } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const selectedOrder = id ? orders.find((o) => o.id === id) ?? null : null;
  if (selectedOrder && !selectedOrder.reception) {
    await getOrCreateReception(selectedOrder.id);
  }

  const reception = selectedOrder
    ? await prisma.reception.findUnique({
        where: { orderId: selectedOrder.id },
        include: { requestedItems: true, findings: true },
      })
    : null;

  const vehicle = selectedOrder ? await prisma.vehicle.findUnique({ where: { plate: selectedOrder.plate } }) : null;

  return (
    <div>
      <Header
        title="Recepcion activa"
        subtitle="Registra el estado del vehiculo al entrar en el taller, separando lo pedido por el cliente de los hallazgos"
      />
      <div className="list-detail-grid">
        <Card style={{ padding: 12 }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Ordenes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 480, overflowY: "auto" }}>
            {orders.length === 0 && (
              <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13 }}>
                Crea primero una orden en Ordenes y QR.
              </p>
            )}
            {orders.map((o) => {
              const active = o.id === id;
              return (
                <Link
                  key={o.id}
                  href={`/recepcion?id=${o.id}`}
                  style={{
                    display: "block",
                    padding: "9px 10px",
                    borderRadius: 8,
                    background: active ? "var(--color-accent-soft)" : "transparent",
                    border: `1px solid ${active ? "color-mix(in srgb, var(--color-accent) 33%, transparent)" : "transparent"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>{o.plate}</span>
                    {o.reception && <Pill tone="success">Iniciada</Pill>}
                  </div>
                  <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>{fmtDate(o.createdAt)}</p>
                </Link>
              );
            })}
          </div>
        </Card>

        {reception && selectedOrder ? (
          <ReceptionDetalle
            reception={{
              ...reception,
              findings: reception.findings.map((f) => ({ ...f, price: f.price === null ? null : Number(f.price) })),
              checkpoints: (reception.checkpoints as Record<string, string>) || {},
            }}
            order={{ id: selectedOrder.id, plate: selectedOrder.plate }}
            client={vehicle ? { clientName: vehicle.clientName, phone: vehicle.phone } : null}
            checklist={settings.checklist}
          />
        ) : (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Selecciona una orden para iniciar o continuar su recepcion activa.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
