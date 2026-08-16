import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TextInput } from "@/components/ui/inputs";
import { DiagnosisForm } from "@/components/diagnostico/DiagnosisForm";
import { DiagnosisCard } from "@/components/diagnostico/DiagnosisCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiagnosticoPage({ searchParams }: { searchParams: Promise<{ id?: string; q?: string }> }) {
  const { id, q = "" } = await searchParams;

  const [settings, diagnoses] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
    prisma.diagnosis.findMany({
      where: q
        ? { OR: [{ symptoms: { contains: q, mode: "insensitive" } }, { plate: { contains: q, mode: "insensitive" } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <Header title="Diagnostico con IA" subtitle="Describe los sintomas y consulta una sugerencia, apoyada en el historial propio del taller" />

      {!settings.aiApiKey && (
        <Card style={{ marginBottom: 14, borderColor: "var(--color-warning)" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--color-warning)" }}>
            Todavia no has configurado una clave de IA. Ve a Ajustes para anadirla y poder usar esta funcion.
          </p>
        </Card>
      )}

      <div style={{ marginBottom: 14 }}>
        <DiagnosisForm />
      </div>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Historial de averias del taller</SectionTitle>
        <form action="/diagnostico" method="get" style={{ marginTop: 10 }}>
          <TextInput name="q" defaultValue={q} placeholder="Buscar por matricula o sintomas" style={{ width: "100%" }} />
        </form>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {diagnoses.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no hay diagnosticos guardados.
            </p>
          </Card>
        )}
        {diagnoses.map((d) => (
          <DiagnosisCard key={d.id} diagnosis={d} expanded={d.id === id} />
        ))}
      </div>
    </div>
  );
}
