import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Field, TextInput } from "@/components/ui/inputs";
import { ChangePasswordForm } from "@/components/ajustes/ChangePasswordForm";
import { ChecklistEditor } from "@/components/ajustes/ChecklistEditor";
import { AiKeyForm } from "@/components/ajustes/AiKeyForm";
import { prisma } from "@/lib/prisma";
import { updateNextInvoiceNumber, updateSettings } from "./actions";

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
          <SectionTitle>Numeracion de facturas</SectionTitle>
          <p style={{ margin: "4px 0 12px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
            Por defecto la numeracion es automatica y correlativa (AAAA-0001, AAAA-0002...). Si quieres continuar la
            numeracion de otro programa (por ejemplo, empezar por la 300) o corregir un error puntual, escribe aqui el
            numero que debe tener la <b>proxima</b> factura que emitas. Se usara una sola vez y luego se vuelve a la
            numeracion automatica a partir de ese punto.
          </p>
          <form action={updateNextInvoiceNumber} style={{ display: "flex", gap: 8 }}>
            <TextInput
              name="nextInvoiceNumberOverride"
              defaultValue={settings.nextInvoiceNumberOverride}
              placeholder="Ej: 2026-0300 (vacio = automatico)"
              style={{ flex: 1 }}
            />
            <Button type="submit">Guardar</Button>
          </form>
          {settings.nextInvoiceNumberOverride && (
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-warning)" }}>
              La proxima factura usara el numero &quot;{settings.nextInvoiceNumberOverride}&quot;.
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle>Diagnostico con IA</SectionTitle>
          <p style={{ margin: "4px 0 12px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
            Clave API de Anthropic (Claude) para el modulo de Diagnostico. Se saca en{" "}
            <span style={{ color: "var(--color-text-primary)" }}>console.anthropic.com</span>, en la seccion de claves API.
          </p>
          <AiKeyForm hasKey={!!settings.aiApiKey} />
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
