import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { CartProvider } from "@/components/sitio/CartContext";
import { PublicHeader } from "@/components/sitio/PublicHeader";
import { PublicFooter } from "@/components/sitio/PublicFooter";
import { WhatsappFloatingButton } from "@/components/sitio/WhatsappFloatingButton";

export const dynamic = "force-dynamic";

export default async function SitioLayout({ children }: { children: ReactNode }) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  return (
    <CartProvider>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        <PublicHeader workshopName={settings.workshopName} />
        <main style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "24px 20px" }}>{children}</main>
        <PublicFooter
          workshopName={settings.workshopName}
          address={settings.address}
          phone={settings.phone}
          whatsapp={settings.whatsapp}
          businessHours={settings.businessHours}
        />
        <WhatsappFloatingButton whatsapp={settings.whatsapp} />
      </div>
    </CartProvider>
  );
}
