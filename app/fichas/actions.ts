"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createVehicleForNewCustomer(formData: FormData) {
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  if (!plate || !name) return;

  const mileage = parseInt(String(formData.get("mileage") || ""), 10);

  const vehicle = await prisma.vehicle.create({
    data: {
      plate,
      brand: String(formData.get("brand") || "").trim(),
      model: String(formData.get("model") || "").trim(),
      vin: String(formData.get("vin") || "").trim(),
      mileage: Number.isFinite(mileage) ? mileage : null,
      customer: {
        create: {
          name,
          phone: String(formData.get("phone") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          address: String(formData.get("address") || "").trim(),
          taxId: String(formData.get("taxId") || "").trim(),
        },
      },
    },
  });

  revalidatePath("/fichas");
  redirect(`/fichas?id=${vehicle.id}`);
}

export async function createVehicleForExistingCustomer(formData: FormData) {
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  const customerId = String(formData.get("customerId") || "").trim();
  if (!plate || !customerId) return;

  const mileage = parseInt(String(formData.get("mileage") || ""), 10);

  const vehicle = await prisma.vehicle.create({
    data: {
      plate,
      brand: String(formData.get("brand") || "").trim(),
      model: String(formData.get("model") || "").trim(),
      vin: String(formData.get("vin") || "").trim(),
      mileage: Number.isFinite(mileage) ? mileage : null,
      customerId,
    },
  });

  revalidatePath("/fichas");
  redirect(`/fichas?id=${vehicle.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      taxId: String(formData.get("taxId") || "").trim(),
    },
  });
  revalidatePath("/fichas");
}

export async function updateVehicle(vehicleId: string, formData: FormData) {
  const mileage = parseInt(String(formData.get("mileage") || ""), 10);
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      brand: String(formData.get("brand") || "").trim(),
      model: String(formData.get("model") || "").trim(),
      vin: String(formData.get("vin") || "").trim(),
      mileage: Number.isFinite(mileage) ? mileage : null,
    },
  });
  revalidatePath("/fichas");
}

export async function addHistory(vehicleId: string, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await prisma.historyEntry.create({ data: { vehicleId, text } });
  revalidatePath("/fichas");
}

export async function addPendingPayment(vehicleId: string, formData: FormData) {
  const amount = parseFloat(String(formData.get("amount") || "").replace(",", "."));
  if (!amount) return;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return;
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { pendingPayments: Number(vehicle.pendingPayments) + amount },
  });
  revalidatePath("/fichas");
  revalidatePath("/");
}

export async function clearPending(vehicleId: string) {
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { pendingPayments: 0 } });
  revalidatePath("/fichas");
  revalidatePath("/");
}

export async function addWarranty(vehicleId: string, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await prisma.warranty.create({ data: { vehicleId, text } });
  revalidatePath("/fichas");
}

export async function removeWarranty(id: string) {
  await prisma.warranty.delete({ where: { id } });
  revalidatePath("/fichas");
}
