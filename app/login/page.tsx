import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/inputs";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        action={login}
        style={{
          width: "100%",
          maxWidth: 340,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1A0E04",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            AS
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              margin: 0,
              textAlign: "center",
            }}
          >
            Automecanica Sera
          </h1>
        </div>

        {next && <input type="hidden" name="next" value={next} />}
        <Field label="Contrasena de acceso">
          <TextInput type="password" name="password" placeholder="••••••••" autoFocus required style={{ width: "100%" }} />
        </Field>

        {error && (
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-danger)" }}>
            Contrasena incorrecta. Intentalo de nuevo.
          </p>
        )}

        <Button type="submit" variant="primary" style={{ width: "100%" }}>
          Entrar
        </Button>
      </form>
    </div>
  );
}
