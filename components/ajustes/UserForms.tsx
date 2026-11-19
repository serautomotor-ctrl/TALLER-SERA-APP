"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { SECTIONS, MECHANIC_DEFAULT } from "@/lib/permissions";
import { createUser, resetUserPassword } from "@/app/ajustes/usuarios/actions";

export function PermissionChecks({ selected }: { selected: string[] }) {
  const groups = ["Taller", "Oficina", "Gestion"] as const;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
      {groups.map((g) => (
        <div key={g}>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "var(--color-text-faint)", textTransform: "uppercase" }}>{g}</p>
          {SECTIONS.filter((s) => s.group === g).map((s) => (
            <label key={s.key} style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 12.5, padding: "2px 0" }}>
              <input type="checkbox" name="perm" value={s.key} defaultChecked={selected.includes(s.key)} />
              {s.label}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

export function NewUserForm({ mechanics }: { mechanics: { id: string; name: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          setError("");
          const res = await createUser(fd);
          if (res.error) setError(res.error);
          else ref.current?.reset();
        })
      }
      style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        <Field label="Nombre de usuario">
          <TextInput name="name" required placeholder="Ej: Juan" />
        </Field>
        <Field label="Contrasena">
          <TextInput name="password" type="password" required minLength={4} />
        </Field>
        <Field label="Es el operario...">
          <Select name="mechanicId" defaultValue="">
            <option value="">(ninguno)</option>
            {mechanics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
        <input type="checkbox" name="isAdmin" /> Administrador (puede entrar en todo y gestionar usuarios)
      </label>
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>Que puede ver (vienen marcadas las tipicas de un mecanico):</p>
      <PermissionChecks selected={MECHANIC_DEFAULT} />
      {error && <p style={{ margin: 0, color: "var(--color-danger)", fontSize: 12.5 }}>{error}</p>}
      <Button type="submit" variant="primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        Crear usuario
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await resetUserPassword(userId, fd);
          setMsg(res.error || "Contrasena cambiada.");
        })
      }
      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
    >
      <TextInput name="password" type="password" placeholder="Nueva contrasena" minLength={4} required style={{ maxWidth: 180 }} />
      <Button type="submit" disabled={pending}>
        Cambiar
      </Button>
      {msg && <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>{msg}</span>}
    </form>
  );
}
