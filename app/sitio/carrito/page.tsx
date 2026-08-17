import { CartPageContent } from "@/components/sitio/CartPageContent";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitioCarritoPage() {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  return (
    <div>
      <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
        Tu carrito
      </h1>
      <CartPageContent whatsapp={settings.whatsapp} />
    </div>
  );
}
