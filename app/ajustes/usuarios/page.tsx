import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/inputs";
import { NewUserForm, PermissionChecks, ResetPasswordForm } from "@/components/ajustes/UserForms";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { removeUser, updateUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) {
    return (
      <div>
        <Header title="Usuarios y permisos" />
        <Card>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13.5 }}>Solo un administrador puede gestionar usuarios.</p>
        </Card>
      </div>
    );
  }

  const [users, mechanics] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { mechanic: true } }),
    prisma.mechanic.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <Header
        title="Usuarios y permisos"
        subtitle="Cada persona entra con su usuario y solo ve lo que le dejes. Todo lo que hace queda en el registro"
        right={
          <Link href="/ajustes">
            <Button type="button" variant="ghost">
              Volver a Ajustes
            </Button>
          </Link>
        }
      />
      <Card style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
          La contrasena general del taller (la de siempre) sigue funcionando como <strong>Administrador</strong>. Si cambias los permisos de alguien, se aplican la proxima vez que
          entre (que pulse Salir y vuelva a entrar).
        </p>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {users.map((u) => (
          <Card key={u.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <SectionTitle>{u.name}</SectionTitle>
                {u.isAdmin && <Pill tone="accent">Administrador</Pill>}
                {!u.active && <Pill tone="danger">Desactivado</Pill>}
                {u.mechanic && <Pill tone="steel">Operario: {u.mechanic.name}</Pill>}
              </div>
              <form action={removeUser.bind(null, u.id)}>
                <Button type="submit" variant="danger">
                  Borrar
                </Button>
              </form>
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                Permisos ({u.isAdmin ? "todo" : `${u.permissions.length} secciones`})
              </summary>
              <form action={updateUser.bind(null, u.id)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" name="active" defaultChecked={u.active} /> Puede entrar
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" name="isAdmin" defaultChecked={u.isAdmin} /> Administrador
                  </label>
                  <Select name="mechanicId" defaultValue={u.mechanicId || ""} style={{ maxWidth: 200 }}>
                    <option value="">No es operario</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        Operario: {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <PermissionChecks selected={u.permissions} />
                <Button type="submit" variant="primary" style={{ alignSelf: "flex-start" }}>
                  Guardar permisos
                </Button>
              </form>
              <div style={{ marginTop: 10 }}>
                <ResetPasswordForm userId={u.id} />
              </div>
            </details>
          </Card>
        ))}
        <Card>
          <SectionTitle>Nuevo usuario</SectionTitle>
          <NewUserForm mechanics={mechanics} />
        </Card>
      </div>
    </div>
  );
}
