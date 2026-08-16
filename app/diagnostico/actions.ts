"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { askAnthropic } from "@/lib/anthropic";

const SYSTEM_PROMPT = `Eres un mecanico experto que ayuda a un taller de automecanica en España a diagnosticar averias.
Te daran una descripcion de los sintomas de un vehiculo, y a veces el historial de casos anteriores del propio taller como referencia.
Responde en español, de forma breve y practica, con este formato:
1. Posibles causas (de la mas probable a la menos probable)
2. Comprobaciones recomendadas para confirmar cada causa
3. Nivel de urgencia (bajo, medio, alto)
No inventes datos del vehiculo que no te han dado. Se conciso, esto lo va a leer un mecanico con prisa.`;

export async function runDiagnosis(formData: FormData): Promise<{ error?: string; diagnosisId?: string }> {
  const symptoms = String(formData.get("symptoms") || "").trim();
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  if (!symptoms) return { error: "Describe los sintomas primero." };

  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  const recentCases = await prisma.diagnosis.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { symptoms: true, aiResponse: true, resolution: true },
  });

  let userMessage = `Sintomas del vehiculo${plate ? ` (matricula ${plate})` : ""}: ${symptoms}`;
  if (recentCases.length > 0) {
    userMessage += "\n\nHistorial reciente de averias de este taller (puede ser util como referencia, o puede no tener relacion):\n";
    recentCases.forEach((c, i) => {
      userMessage += `\nCaso ${i + 1}: ${c.symptoms}\nDiagnostico dado: ${c.aiResponse.slice(0, 300)}${c.resolution ? `\nResolucion real: ${c.resolution}` : ""}\n`;
    });
  }

  try {
    const aiResponse = await askAnthropic(settings.aiApiKey, SYSTEM_PROMPT, userMessage);
    const diagnosis = await prisma.diagnosis.create({
      data: { plate, symptoms, aiResponse },
    });
    revalidatePath("/diagnostico");
    return { diagnosisId: diagnosis.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error desconocido al consultar la IA." };
  }
}

export async function setResolution(id: string, formData: FormData) {
  const resolution = String(formData.get("resolution") || "").trim();
  await prisma.diagnosis.update({ where: { id }, data: { resolution, resolved: true } });
  revalidatePath("/diagnostico");
}

export async function removeDiagnosis(id: string) {
  await prisma.diagnosis.delete({ where: { id } });
  revalidatePath("/diagnostico");
}
