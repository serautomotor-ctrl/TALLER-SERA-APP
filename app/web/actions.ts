"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { $Enums } from "@/app/generated/prisma/client";

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ---------- Vehiculos de ocasion ----------

export async function createVehicle(formData: FormData) {
  const brand = String(formData.get("brand") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const price = num(formData, "price");
  if (!brand || !model || price === null) return;

  await prisma.usedVehicle.create({
    data: {
      brand,
      model,
      price,
      year: num(formData, "year"),
      mileage: num(formData, "mileage"),
      fuel: (String(formData.get("fuel") || "otro") as $Enums.FuelType),
      transmission: (String(formData.get("transmission") || "manual") as $Enums.TransmissionType),
      power: String(formData.get("power") || "").trim(),
      color: String(formData.get("color") || "").trim(),
      doors: num(formData, "doors"),
      owners: num(formData, "owners"),
      warrantyMonths: num(formData, "warrantyMonths") || 0,
      extras: String(formData.get("extras") || "").trim(),
      description: String(formData.get("description") || "").trim(),
    },
  });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio/ocasion");
}

export async function updateVehicle(id: string, formData: FormData) {
  const brand = String(formData.get("brand") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const price = num(formData, "price");
  if (!brand || !model || price === null) return;

  await prisma.usedVehicle.update({
    where: { id },
    data: {
      brand,
      model,
      price,
      year: num(formData, "year"),
      mileage: num(formData, "mileage"),
      fuel: (String(formData.get("fuel") || "otro") as $Enums.FuelType),
      transmission: (String(formData.get("transmission") || "manual") as $Enums.TransmissionType),
      power: String(formData.get("power") || "").trim(),
      color: String(formData.get("color") || "").trim(),
      doors: num(formData, "doors"),
      owners: num(formData, "owners"),
      warrantyMonths: num(formData, "warrantyMonths") || 0,
      extras: String(formData.get("extras") || "").trim(),
      description: String(formData.get("description") || "").trim(),
    },
  });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio/ocasion");
  revalidatePath(`/sitio/ocasion/${id}`);
}

export async function setVehicleStatus(id: string, status: $Enums.VehicleSaleStatus) {
  await prisma.usedVehicle.update({ where: { id }, data: { status } });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio/ocasion");
  revalidatePath(`/sitio/ocasion/${id}`);
}

export async function toggleVehicleFeatured(id: string, featured: boolean) {
  await prisma.usedVehicle.update({ where: { id }, data: { featured } });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio");
}

export async function addVehiclePhoto(id: string, dataUrl: string) {
  const vehicle = await prisma.usedVehicle.findUnique({ where: { id } });
  if (!vehicle) return;
  await prisma.usedVehicle.update({ where: { id }, data: { photos: [...vehicle.photos, dataUrl] } });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio/ocasion");
  revalidatePath(`/sitio/ocasion/${id}`);
}

export async function removeVehiclePhoto(id: string, index: number) {
  const vehicle = await prisma.usedVehicle.findUnique({ where: { id } });
  if (!vehicle) return;
  await prisma.usedVehicle.update({ where: { id }, data: { photos: vehicle.photos.filter((_, i) => i !== index) } });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio/ocasion");
  revalidatePath(`/sitio/ocasion/${id}`);
}

export async function removeVehicle(id: string) {
  await prisma.usedVehicle.delete({ where: { id } });
  revalidatePath("/web/vehiculos");
  revalidatePath("/sitio/ocasion");
}

// ---------- Productos ----------

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const price = num(formData, "price");
  if (!name || price === null) return;

  await prisma.product.create({
    data: {
      name,
      price,
      category: String(formData.get("category") || "").trim(),
      brand: String(formData.get("brand") || "").trim(),
      condition: (String(formData.get("condition") || "nuevo") as $Enums.ProductCondition),
      description: String(formData.get("description") || "").trim(),
    },
  });
  revalidatePath("/web/productos");
  revalidatePath("/sitio/productos");
}

export async function updateProduct(id: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const price = num(formData, "price");
  if (!name || price === null) return;

  await prisma.product.update({
    where: { id },
    data: {
      name,
      price,
      category: String(formData.get("category") || "").trim(),
      brand: String(formData.get("brand") || "").trim(),
      condition: (String(formData.get("condition") || "nuevo") as $Enums.ProductCondition),
      description: String(formData.get("description") || "").trim(),
    },
  });
  revalidatePath("/web/productos");
  revalidatePath("/sitio/productos");
  revalidatePath(`/sitio/productos/${id}`);
}

export async function setProductAvailable(id: string, available: boolean) {
  await prisma.product.update({ where: { id }, data: { available } });
  revalidatePath("/web/productos");
  revalidatePath("/sitio/productos");
  revalidatePath(`/sitio/productos/${id}`);
}

export async function toggleProductFeatured(id: string, featured: boolean) {
  await prisma.product.update({ where: { id }, data: { featured } });
  revalidatePath("/web/productos");
  revalidatePath("/sitio");
}

export async function addProductPhoto(id: string, dataUrl: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;
  await prisma.product.update({ where: { id }, data: { photos: [...product.photos, dataUrl] } });
  revalidatePath("/web/productos");
  revalidatePath("/sitio/productos");
  revalidatePath(`/sitio/productos/${id}`);
}

export async function removeProductPhoto(id: string, index: number) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;
  await prisma.product.update({ where: { id }, data: { photos: product.photos.filter((_, i) => i !== index) } });
  revalidatePath("/web/productos");
  revalidatePath("/sitio/productos");
  revalidatePath(`/sitio/productos/${id}`);
}

export async function removeProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/web/productos");
  revalidatePath("/sitio/productos");
}

// ---------- Servicios ----------

export async function createService(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const count = await prisma.service.count();
  await prisma.service.create({
    data: {
      name,
      description: String(formData.get("description") || "").trim(),
      order: count,
    },
  });
  revalidatePath("/web/servicios");
  revalidatePath("/sitio/servicios");
  revalidatePath("/sitio");
}

export async function updateService(id: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.service.update({
    where: { id },
    data: { name, description: String(formData.get("description") || "").trim() },
  });
  revalidatePath("/web/servicios");
  revalidatePath("/sitio/servicios");
  revalidatePath("/sitio");
}

export async function setServicePhoto(id: string, dataUrl: string) {
  await prisma.service.update({ where: { id }, data: { photoUrl: dataUrl } });
  revalidatePath("/web/servicios");
  revalidatePath("/sitio/servicios");
  revalidatePath("/sitio");
}

export async function removeService(id: string) {
  await prisma.service.delete({ where: { id } });
  revalidatePath("/web/servicios");
  revalidatePath("/sitio/servicios");
  revalidatePath("/sitio");
}
