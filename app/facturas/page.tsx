import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";

export default function FacturasPage() {
  return (
    <div>
      <Header title="Facturacion" subtitle="Numeracion correlativa, IVA y control de facturas" />
      <Card>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
          Esta seccion estara disponible proximamente.
        </p>
      </Card>
    </div>
  );
}
