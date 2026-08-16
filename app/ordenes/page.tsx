import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { IconWrench, IconQr } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { NewOrderButton } from "@/components/ordenes/NewOrderButton";
import { ArticlesCatalogButton } from "@/components/ordenes/ArticlesCatalogButton";
import { OrderStatusSelect } from "@/components/ordenes/OrderStatusSelect";
import { OrderTimerControls } from "@/components/ordenes/OrderTimerControls";
import { OrderArticlesPanel } from "@/components/ordenes/OrderArticlesPanel";
import { QrModalParam } from "@/components/ordenes/QrModalParam";
import { fmtDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { startOrderTimer } from "./actions";
import { togglePause, finishEntry } from "@/app/horario/actions";

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ qr?: string }> }) {
  const { qr } = await searchParams;

  const [orders, articles, activeEntry] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.article.findMany({ orderBy: { name: "asc" } }),
    prisma.timeEntry.findFirst({ where: { end: null } }),
  ]);

  const qrOrder = qr ? orders.find((o) => o.id === qr) ?? null : null;

  return (
    <div>
      <Header
        title="Ordenes y codigos QR"
        subtitle="Crea la orden de reparacion, controla el tiempo, anade articulos y genera etiquetas QR"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <ArticlesCatalogButton articles={articles.map((a) => ({ id: a.id, name: a.name, price: Number(a.price), costPrice: Number(a.costPrice) }))} />
            <NewOrderButton />
          </div>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {orders.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no hay ordenes de reparacion. Crea la primera para generar su QR.
            </p>
          </Card>
        )}
        {orders.map((o) => {
          const isActive = !!activeEntry && activeEntry.orderId === o.id;
          const otherActive = !!activeEntry && activeEntry.orderId !== o.id;
          return (
            <Card key={o.id} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--color-steel-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-steel)" }}>
                    <IconWrench />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{o.plate}</p>
                    <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                      {o.description || "Sin descripcion"} · {fmtDate(o.createdAt)}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <OrderTimerControls
                    isActive={isActive}
                    activeEntry={isActive && activeEntry ? activeEntry : null}
                    otherActive={otherActive}
                    startAction={startOrderTimer.bind(null, o.id)}
                    togglePauseAction={isActive && activeEntry ? togglePause.bind(null, activeEntry.id) : undefined}
                    finishAction={isActive && activeEntry ? finishEntry.bind(null, activeEntry.id) : undefined}
                  />
                  <OrderStatusSelect orderId={o.id} status={o.status} />
                  <Link href={`/ordenes?qr=${o.id}`}>
                    <Button type="button">
                      <IconQr /> Ver QR
                    </Button>
                  </Link>
                </div>
              </div>
              <OrderArticlesPanel
                orderId={o.id}
                items={o.items.map((it) => ({ id: it.id, name: it.name, price: Number(it.price), qty: it.qty }))}
                articles={articles.map((a) => ({ id: a.id, name: a.name, price: Number(a.price) }))}
              />
            </Card>
          );
        })}
      </div>

      <QrModalParam order={qrOrder ? { id: qrOrder.id, plate: qrOrder.plate } : null} />
    </div>
  );
}
