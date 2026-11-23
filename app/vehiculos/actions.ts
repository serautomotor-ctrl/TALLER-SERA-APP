"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { requirePermission } from "@/lib/session";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function str(fd: FormData, k: string) {
  return String(fd.get(k) || "").trim();
}

function vehicleData(fd: FormData) {
  const km = parseInt(str(fd, "mileage").replace(/\D/g, ""), 10);
  const reg = str(fd, "firstRegistration");
  const d = reg ? new Date(`${reg}T12:00:00`) : null;
  return {
    brand: str(fd, "brand"),
    model: str(fd, "model"),
    vin: str(fd, "vin").toUpperCase(),
    mileage: Number.isFinite(km) ? km : null,
    firstRegistration: d && !Number.isNaN(d.getTime()) ? d : null,
    fuel: str(fd, "fuel"),
    color: str(fd, "color"),
    notes: str(fd, "notes"),
  };
}

/** Da de alta un vehiculo para un cliente que ya existe o para uno nuevo */
export async function createVehicle(fd: FormData): Promise<{ error?: string; id?: string }> {
  await requirePermission("vehiculos");
  const plate = str(fd, "plate").toUpperCase().replace(/[\s-]/g, "");
  if (!plate) return { error: "Escribe la matricula." };
  if (await prisma.vehicle.findUnique({ where: { plate } })) return { error: `Ya hay un vehiculo con la matricula ${plate}.` };

  const customerId = str(fd, "customerId");
  const name = str(fd, "name");
  if (!customerId && !name) return { error: "Elige el cliente o escribe el nombre del cliente nuevo." };

  const vehicle = await prisma.vehicle.create({
    data: {
      plate,
      ...vehicleData(fd),
      customer: customerId
        ? { connect: { id: customerId } }
        : { create: { name, phone: str(fd, "phone"), email: str(fd, "email"), taxId: str(fd, "taxId").toUpperCase(), address: str(fd, "address") } },
    },
    include: { customer: true },
  });
  await logAction("Vehiculo dado de alta", `${plate} de ${vehicle.customer.name}`);
  revalidatePath("/vehiculos");
  revalidatePath("/fichas");
  return { id: vehicle.id };
}

export async function updateVehicle(id: string, fd: FormData) {
  await requirePermission("vehiculos");
  const v = await prisma.vehicle.update({ where: { id }, data: vehicleData(fd) });
  await logAction("Vehiculo modificado", v.plate);
  revalidatePath("/vehiculos");
  revalidatePath("/fichas");
}

/** Sube uno o varios archivos (ficha tecnica, permiso de circulacion...) */
export async function uploadVehicleDocs(vehicleId: string, fd: FormData): Promise<{ error?: string; count?: number }> {
  await requirePermission("vehiculos");
  const kind = str(fd, "kind") || "Ficha tecnica";
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Elige un archivo." };
  for (const f of files) {
    if (!ALLOWED.includes(f.type)) return { error: `${f.name}: solo se admiten PDF o fotos (JPG, PNG).` };
    if (f.size > MAX_BYTES) return { error: `${f.name} pesa demasiado (maximo 4 MB). Haz la foto o el escaneo con menos calidad.` };
  }
  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { plate: true } });
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    await prisma.vehicleDocument.create({
      data: { vehicleId, kind, name: f.name.slice(0, 150), mime: f.type, size: buf.length, data: buf },
    });
  }
  await logAction("Documento de vehiculo subido", `${vehicle.plate}: ${kind} (${files.length})`);
  revalidatePath("/vehiculos");
  return { count: files.length };
}

export async function deleteVehicleDoc(id: string) {
  await requirePermission("vehiculos");
  const doc = await prisma.vehicleDocument.delete({ where: { id }, select: { kind: true, vehicle: { select: { plate: true } } } });
  await logAction("Documento de vehiculo borrado", `${doc.vehicle.plate}: ${doc.kind}`);
  revalidatePath("/vehiculos");
}
