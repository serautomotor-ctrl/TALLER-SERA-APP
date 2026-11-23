import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Para subir fichas tecnicas (PDF o fotos). Vercel no deja pasar de 4,5 MB por envio.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
};

export default nextConfig;
