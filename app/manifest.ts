import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Automecánica Sera",
    short_name: "Mi Taller",
    description: "Gestion del taller: ordenes, clientes, facturacion y mas.",
    start_url: "/",
    display: "standalone",
    background_color: "#14161A",
    theme_color: "#14161A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
