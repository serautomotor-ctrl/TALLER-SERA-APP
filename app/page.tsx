export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1a0e04",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 26,
        }}
      >
        AS
      </div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 34,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Automecánica Sera
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 15, maxWidth: 420 }}>
        La aplicación de gestión del taller se está construyendo. Este mensaje
        confirma que la web ya está publicada y funcionando en internet.
      </p>
    </main>
  );
}
