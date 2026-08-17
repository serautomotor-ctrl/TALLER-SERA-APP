import { Card } from "@/components/ui/Card";
import { AppointmentRequestForm } from "@/components/sitio/AppointmentRequestForm";
import { IconWhatsapp } from "@/components/ui/icons";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitioContactoPage() {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });
  const mapsUrl = settings.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}` : "";

  return (
    <div>
      <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
        Contacto y cita previa
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 20 }} className="sitio-vehicle-grid">
        <Card>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--color-text-primary)" }}>
            {settings.workshopName}
          </p>
          {settings.address && (
            <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--color-text-muted)" }}>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                  {settings.address}
                </a>
              ) : (
                settings.address
              )}
            </p>
          )}
          {settings.phone && (
            <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--color-text-primary)" }}>
              Telefono: <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            </p>
          )}
          {settings.whatsapp && (
            <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 13.5 }}>
              <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-success)" }}>
                <IconWhatsapp /> Escribir por WhatsApp
              </a>
            </p>
          )}
          {settings.businessHours && (
            <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--color-text-muted)", whiteSpace: "pre-line" }}>
              {settings.businessHours}
            </p>
          )}
        </Card>
        <Card>
          <p style={{ margin: "0 0 12px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>
            Pide cita online
          </p>
          <AppointmentRequestForm />
        </Card>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .sitio-vehicle-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
