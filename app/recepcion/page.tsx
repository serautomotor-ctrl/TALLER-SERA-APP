import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";

export default function RecepcionPage() {
  return (
    <div>
      <Header title="Recepcion activa" subtitle="Registra el estado del vehiculo al entrar en el taller" />
      <Card>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
          Esta seccion estara disponible proximamente.
        </p>
      </Card>
    </div>
  );
}
