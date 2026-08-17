import { IconWhatsapp } from "@/components/ui/icons";

export function WhatsappFloatingButton({ whatsapp }: { whatsapp: string }) {
  if (!whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "#25D366",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        zIndex: 40,
      }}
    >
      <IconWhatsapp width={26} height={26} />
    </a>
  );
}
