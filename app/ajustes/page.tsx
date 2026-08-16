import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Field, TextInput } from "@/components/ui/inputs";
import { ChangePasswordForm } from "@/components/ajustes/ChangePasswordForm";
import { ChecklistEditor } from "@/components/ajustes/ChecklistEditor";
import { prisma } from "@/lib/prisma";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  return (
    <div>
      <Header title="Ajustes" subtitle="Datos del taller, tarifa por hora y seguridad de acceso" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
        <Card>
          <SectionTitle>Datos del taller</SectionTitle>
          <form action={updateSettings} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <Field label="Nombre o razon social">
              <TextInput name="workshopName" defaultValue={settings.workshopName} style={{ width: "100%" }} />
            </Field>
            <Field label="CIF / NIF">
              <TextInput name="taxId" defaultValue={settings.taxId} style={{ width: "100%" }} />
            </Field>
            <Field label="Direccion">
              <TextInput name="address" defaultValue={settings.address} style={{ width: "100%" }} />
            </Field>
            <Field label="Telefono">
              <TextInput name="phone" defaultValue={settings.phone} style={{ width: "100%" }} />
            </Field>
            <Field label="Email">
              <TextInput name="email" type="email" defaultValue={settings.email} style={{ width: "100%" }} />
            </Field>
            <Field label="Tarifa por hora (para el panel de rentabilidad)">
              <TextInput name="hourlyRate" defaultValue={String(settings.hourlyRate)} style={{ width: "100%" }} />
            </Field>
            <Button type="submit" variant="primary" style={{ alignSelf: "flex-start" }}>
              Guardar cambios
            </Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Puntos de control de la recepcion</SectionTitle>
          <p style={{ margin: "4px 0 12px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
            Lista que aparece al revisar un vehiculo en Recepcion. Anade o quita los que necesites.
          </p>
          <ChecklistEditor items={settings.checklist} />
        </Card>

        <Card>
          <SectionTitle>Contrasena de acceso</SectionTitle>
          <p style={{ margin: "4px 0 12px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
            Esta es la contrasena que usa todo el taller para entrar en la aplicacion.
          </p>
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
