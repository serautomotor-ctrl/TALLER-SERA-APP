import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canAccess } from "@/lib/permissions";

/** Devuelve el archivo de un documento de vehiculo para verlo en el navegador (o descargarlo con ?descargar=1) */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !canAccess(user, "vehiculos")) return new Response("Sin permiso", { status: 403 });
  const { id } = await ctx.params;
  const doc = await prisma.vehicleDocument.findUnique({ where: { id }, include: { vehicle: { select: { plate: true } } } });
  if (!doc) return new Response("No encontrado", { status: 404 });

  const ext = doc.mime === "application/pdf" ? "pdf" : doc.mime.split("/")[1] || "bin";
  const filename = `${doc.vehicle.plate}-${doc.kind}`.replace(/[^\w-]+/g, "_") + "." + ext;
  const download = new URL(request.url).searchParams.has("descargar");
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
