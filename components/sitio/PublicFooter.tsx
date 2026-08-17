import { IconWhatsapp } from "@/components/ui/icons";

export function PublicFooter({
  workshopName,
  address,
  phone,
  whatsapp,
  businessHours,
}: {
  workshopName: string;
  address: string;
  phone: string;
  whatsapp: string;
  businessHours: string;
}) {
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";

  return (
    <footer style={{ borderTop: "1px solid var(--color-border)", marginTop: 40, background: "var(--color-surface)" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
            {workshopName}
          </p>
          {address && (
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                  {address}
                </a>
              ) : (
                address
              )}
            </p>
          )}
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Contacto
          </p>
          {phone && (
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>
              <a href={`tel:${phone}`}>{phone}</a>
            </p>
          )}
          {whatsapp && (
            <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 13 }}>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-success)" }}>
                <IconWhatsapp /> WhatsApp
              </a>
            </p>
          )}
        </div>
        {businessHours && (
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
              Horario
            </p>
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)", whiteSpace: "pre-line" }}>
              {businessHours}
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
