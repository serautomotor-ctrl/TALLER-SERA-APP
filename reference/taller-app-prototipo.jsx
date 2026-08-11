import React, { useState, useEffect, useRef, useCallback } from "react";

const FONT_IMPORT_ID = "taller-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_IMPORT_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_IMPORT_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap";
  document.head.appendChild(link);
}

let jsQrLoadPromise = null;
function ensureJsQR() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (jsQrLoadPromise) return jsQrLoadPromise;
  jsQrLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js";
    script.onload = () => resolve(window.jsQR);
    script.onerror = () => reject(new Error("No se pudo cargar el lector de QR"));
    document.head.appendChild(script);
  });
  return jsQrLoadPromise;
}

const COLORS = {
  bg: "#14161A",
  surface: "#1D2027",
  surface2: "#262A32",
  surface3: "#30353F",
  border: "#3A3F49",
  textPrimary: "#F2F0E9",
  textMuted: "#9AA0AC",
  textFaint: "#666C78",
  accent: "#FF7A29",
  accentDark: "#C85A16",
  accentSoft: "#402611",
  steel: "#4C8DAE",
  steelSoft: "#152733",
  success: "#4CAF6D",
  successSoft: "#122B1B",
  warning: "#E8B93F",
  warningSoft: "#332A0E",
  danger: "#E1554F",
  dangerSoft: "#331414",
};

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function fmtDur(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}
function fmtEUR(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

async function storageGet(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (res && res.value != null) return JSON.parse(res.value);
    return fallback;
  } catch (e) {
    return fallback;
  }
}
async function storageSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
    return true;
  } catch (e) {
    return false;
  }
}

const NAV_ITEMS = [
  { id: "inicio", label: "Inicio", icon: IconHome },
  { id: "horario", label: "Horario", icon: IconClock },
  { id: "fichas", label: "Fichas", icon: IconCard },
  { id: "recepcion", label: "Recepcion", icon: IconClipboard },
  { id: "ordenes", label: "Ordenes y QR", icon: IconQr },
  { id: "facturas", label: "Facturas", icon: IconInvoice },
];

const CHECKPOINTS = [
  "Neumaticos",
  "Pastillas de freno",
  "Discos de freno",
  "Amortiguadores",
  "Niveles de liquidos",
  "Bateria",
  "Luces",
  "Escobillas",
  "Correa de distribucion",
  "Filtro de aire",
];

const CHECK_STATUS = {
  bien: { label: "Bien", tone: "success" },
  vigilar: { label: "Vigilar", tone: "warning" },
  cambiar: { label: "Cambiar", tone: "danger" },
};

function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCard(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M6.5 14h5" strokeLinecap="round" />
    </svg>
  );
}
function IconInvoice(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 3.5h9l3 3V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20Z" strokeLinejoin="round" />
      <path d="M9 9h6M9 12.5h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}
function IconQr(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3.2M17.5 14v3.2M14 17.5h1.8M20 14v1.8M17.5 20.5H20v-1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconPlay(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 30} height={props.size || 30} fill="currentColor" {...props}>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}
function IconPause(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 30} height={props.size || 30} fill="currentColor" {...props}>
      <rect x="6.5" y="5.5" width="4" height="13" rx="1" />
      <rect x="13.5" y="5.5" width="4" height="13" rx="1" />
    </svg>
  );
}
function IconStop(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 22} height={props.size || 22} fill="currentColor" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function IconClipboard(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" strokeLinecap="round" />
    </svg>
  );
}
function IconCamera(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.3" />
    </svg>
  );
}
function IconWhatsapp(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M12 2.5a9.4 9.4 0 0 0-8 14.3L2.5 21.5l4.9-1.4A9.4 9.4 0 1 0 12 2.5Zm0 1.7a7.7 7.7 0 0 1 6.6 11.6l-.2.4.9 3.3-3.4-1-.4.2A7.7 7.7 0 1 1 12 4.2Zm-3.4 3.9c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.4 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3-.3-.2-1.5-.8-1.8-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.2-.6-1.6-.9-2.1-.2-.5-.4-.4-.6-.4Z" />
    </svg>
  );
}
function IconBarcode(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M7 8v8M10 8v8M13 8v8M16.5 8v8" strokeLinecap="round" />
    </svg>
  );
}
function IconCameraLarge(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 22} height={props.size || 22} fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.3" />
    </svg>
  );
}
function IconWrench(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.6L4 16.2V20h3.8l5.3-5.3a4 4 0 0 0 4.6-5.4l-2.6 2.6-2-.5-.5-2Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function IconPrint(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6.5 8.5v-4h11v4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="8.5" width="16" height="7.5" rx="1.5" />
      <path d="M6.5 13.5h11V20h-11z" />
    </svg>
  );
}
function IconTrash(props) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4.5 6.5h15" strokeLinecap="round" />
      <path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V6.5" />
      <path d="M6.5 6.5 7.3 19.2A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.3l.8-12.7" />
    </svg>
  );
}

function Pill({ children, tone = "muted" }) {
  const tones = {
    muted: { bg: COLORS.surface3, fg: COLORS.textMuted },
    success: { bg: COLORS.successSoft, fg: COLORS.success },
    warning: { bg: COLORS.warningSoft, fg: COLORS.warning },
    danger: { bg: COLORS.dangerSoft, fg: COLORS.danger },
    accent: { bg: COLORS.accentSoft, fg: COLORS.accent },
    steel: { bg: COLORS.steelSoft, fg: COLORS.steel },
  };
  const t = tones[tone] || tones.muted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        background: t.bg,
        color: t.fg,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 18,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "secondary", style, type = "button", disabled }) {
  const variants = {
    primary: { background: COLORS.accent, color: "#1A0E04", border: `1px solid ${COLORS.accent}` },
    secondary: { background: COLORS.surface2, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` },
    ghost: { background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.dangerSoft, color: COLORS.danger, border: `1px solid ${COLORS.danger}55` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "9px 16px",
        borderRadius: 9,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: 13.5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform 0.08s ease, opacity 0.15s ease",
        ...variants[variant],
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "Inter, sans-serif" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: COLORS.surface2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "9px 11px",
  color: COLORS.textPrimary,
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  outline: "none",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 60, ...(props.style || {}) }} />;
}
function Select(props) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>
      {props.children}
    </select>
  );
}

function Header({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
      <div>
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 0.3,
            color: COLORS.textPrimary,
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.textMuted, margin: "4px 0 0" }}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

function DialButton({ running, elapsedMs, onToggle }) {
  const R = 88;
  const CX = 100, CY = 100;
  const circumference = 2 * Math.PI * R;
  const pct = running ? ((elapsedMs % 3600000) / 3600000) : 0;
  const dash = circumference * pct;
  return (
    <div style={{ position: "relative", width: 200, height: 200 }}>
      <svg width="200" height="200" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={COLORS.surface3} strokeWidth="10" />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={running ? COLORS.accent : COLORS.textFaint}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.3s linear" }}
        />
      </svg>
      <button
        onClick={onToggle}
        aria-label={running ? "Pausar" : "Iniciar"}
        style={{
          position: "absolute",
          inset: 14,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: running ? `linear-gradient(180deg, ${COLORS.warning}, ${COLORS.warning})` : `${COLORS.accent}`,
          background: running ? COLORS.warning : COLORS.accent,
          color: "#1A0E04",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          boxShadow: "0 6px 0 rgba(0,0,0,0.35)",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(4px)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        {running ? <IconPause size={34} /> : <IconPlay size={34} />}
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase", letterSpacing: 1 }}>
          {running ? "Pausar" : "Iniciar"}
        </span>
      </button>
    </div>
  );
}

function useTicker(active) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function ScreenInicio({ clients, orders, timeEntries, activeEntry, goTo }) {
  const pendingTotal = clients.reduce((sum, c) => sum + (Number(c.pendingPayments) || 0), 0);
  const openOrders = orders.filter((o) => o.status !== "cerrada").length;
  const todayStr = new Date().toDateString();
  const todayMs = timeEntries
    .filter((e) => new Date(e.start).toDateString() === todayStr)
    .reduce((sum, e) => sum + (e.end ? e.end - e.start - (e.pausedMs || 0) : Date.now() - e.start - (e.pausedMs || 0)), 0);

  return (
    <div>
      <Header title="Inicio" subtitle="Resumen del dia en el taller" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
        <MetricCard label="Ordenes abiertas" value={openOrders} tone="accent" onClick={() => goTo("ordenes")} />
        <MetricCard label="Vehiculos registrados" value={clients.length} tone="steel" onClick={() => goTo("fichas")} />
        <MetricCard label="Cobros pendientes" value={fmtEUR(pendingTotal)} tone="warning" onClick={() => goTo("fichas")} />
        <MetricCard label="Horas de hoy" value={fmtDur(todayMs)} tone="success" onClick={() => goTo("horario")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle>Estado del control horario</SectionTitle>
          {activeEntry ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: activeEntry.paused ? COLORS.warning : COLORS.success,
                  boxShadow: activeEntry.paused ? "none" : `0 0 0 4px ${COLORS.successSoft}`,
                }}
              />
              <div>
                <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontWeight: 600, color: COLORS.textPrimary, fontSize: 14 }}>
                  {activeEntry.task || "Tarea sin nombre"} {activeEntry.plate ? `· ${activeEntry.plate}` : ""}
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
                  {activeEntry.paused ? "En pausa" : "En marcha"} desde las {fmtTime(activeEntry.start)}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5, marginTop: 10 }}>
              No hay ninguna tarea en marcha ahora mismo.
            </p>
          )}
          <div style={{ marginTop: 14 }}>
            <Button variant="primary" onClick={() => goTo("horario")}>
              <IconClock /> Ir a control horario
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle>Ultimas ordenes</SectionTitle>
          {orders.length === 0 && (
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5, marginTop: 10 }}>
              Todavia no hay ordenes de reparacion creadas.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {orders
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 4)
              .map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: COLORS.surface2,
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: COLORS.textPrimary, fontWeight: 600 }}>
                      {o.plate}
                    </p>
                    <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textMuted }}>{fmtDate(o.createdAt)}</p>
                  </div>
                  <StatusPill status={o.status} />
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        fontSize: 17,
        margin: 0,
        color: COLORS.textPrimary,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </h3>
  );
}

function MetricCard({ label, value, tone, onClick }) {
  const bar = { accent: COLORS.accent, steel: COLORS.steel, warning: COLORS.warning, success: COLORS.success }[tone];
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${bar}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: COLORS.textPrimary }}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    abierta: { tone: "steel", label: "Abierta" },
    en_progreso: { tone: "accent", label: "En progreso" },
    pendiente_piezas: { tone: "warning", label: "Pend. piezas" },
    cerrada: { tone: "success", label: "Cerrada" },
  };
  const m = map[status] || map.abierta;
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

function ScreenHorario({ timeEntries, setTimeEntries, activeEntry, setActiveEntry, clients }) {
  useTicker(!!activeEntry && !activeEntry.paused);
  const [task, setTask] = useState("");
  const [plate, setPlate] = useState("");

  const elapsed = activeEntry ? Date.now() - activeEntry.start - (activeEntry.pausedMs || 0) - (activeEntry.paused ? Date.now() - activeEntry.pauseStart : 0) : 0;

  const handleStart = () => {
    if (activeEntry) return;
    const entry = {
      id: uid("t"),
      task: task || "Tarea general",
      plate: plate.trim().toUpperCase(),
      start: Date.now(),
      end: null,
      pausedMs: 0,
      paused: false,
      pauseStart: null,
    };
    setActiveEntry(entry);
  };

  const handleTogglePause = () => {
    if (!activeEntry) {
      handleStart();
      return;
    }
    if (activeEntry.paused) {
      const pausedFor = Date.now() - activeEntry.pauseStart;
      setActiveEntry({ ...activeEntry, paused: false, pausedMs: activeEntry.pausedMs + pausedFor, pauseStart: null });
    } else {
      setActiveEntry({ ...activeEntry, paused: true, pauseStart: Date.now() });
    }
  };

  const handleFinish = () => {
    if (!activeEntry) return;
    const finished = { ...activeEntry, end: Date.now(), paused: false };
    setTimeEntries((prev) => [finished, ...prev]);
    setActiveEntry(null);
    setTask("");
    setPlate("");
  };

  const todayStr = new Date().toDateString();
  const todayEntries = timeEntries.filter((e) => new Date(e.start).toDateString() === todayStr);

  return (
    <div>
      <Header title="Control horario" subtitle="Inicia, pausa y cierra el tiempo dedicado a cada tarea" />
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minWidth: 260 }}>
          <DialButton running={!!activeEntry && !activeEntry.paused} elapsedMs={elapsed} onToggle={handleTogglePause} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
            {fmtDur(Math.max(0, elapsed))}
          </p>
          {activeEntry ? (
            <>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted, textAlign: "center", margin: 0 }}>
                {activeEntry.task} {activeEntry.plate ? `· ${activeEntry.plate}` : ""}
              </p>
              <Button variant="danger" onClick={handleFinish} style={{ width: "100%" }}>
                <IconStop /> Finalizar tarea
              </Button>
            </>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              <TextInput placeholder="Descripcion de la tarea" value={task} onChange={(e) => setTask(e.target.value)} />
              <TextInput placeholder="Matricula (opcional)" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Registro de hoy</SectionTitle>
          {todayEntries.length === 0 && (
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5, marginTop: 10 }}>
              Aun no se ha registrado ninguna tarea hoy.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {todayEntries.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: COLORS.surface2,
                  borderRadius: 8,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, color: COLORS.textPrimary }}>
                    {e.task} {e.plate ? `· ${e.plate}` : ""}
                  </p>
                  <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textMuted }}>
                    {fmtTime(e.start)} - {e.end ? fmtTime(e.end) : "en curso"}
                  </p>
                </div>
                <Pill tone="steel">{fmtDur(e.end - e.start - (e.pausedMs || 0))}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScreenFichas({ clients, setClients }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = clients.filter(
    (c) =>
      c.plate.toLowerCase().includes(query.toLowerCase()) ||
      c.clientName.toLowerCase().includes(query.toLowerCase())
  );
  const selected = clients.find((c) => c.id === selectedId) || null;

  const handleCreate = (data) => {
    const newClient = {
      id: uid("v"),
      plate: data.plate.toUpperCase(),
      clientName: data.clientName,
      phone: data.phone,
      model: data.model,
      history: [],
      warranties: [],
      pendingPayments: 0,
    };
    setClients((prev) => [newClient, ...prev]);
    setSelectedId(newClient.id);
    setShowNew(false);
  };

  return (
    <div>
      <Header
        title="Fichas por matricula"
        subtitle="Busca un vehiculo para ver historial, garantias y cobros pendientes"
        right={
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <IconPlus /> Nueva ficha
          </Button>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 12 }}>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <IconSearch style={{ position: "absolute", left: 10, top: 9, color: COLORS.textFaint }} />
            <TextInput
              placeholder="Buscar matricula o cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 32, width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 480, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13, padding: "6px 4px" }}>
                Sin resultados.
              </p>
            )}
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: "9px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: selectedId === c.id ? COLORS.accentSoft : "transparent",
                  border: `1px solid ${selectedId === c.id ? COLORS.accent + "55" : "transparent"}`,
                }}
              >
                <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13.5, color: COLORS.textPrimary }}>
                  {c.plate}
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textMuted }}>
                  {c.clientName || "Sin nombre"}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {selected ? (
          <FichaDetalle client={selected} setClients={setClients} />
        ) : (
          <Card>
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5 }}>
              Selecciona una ficha de la lista, o crea una nueva para empezar.
            </p>
          </Card>
        )}
      </div>

      {showNew && <NewFichaModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  );
}

function FichaDetalle({ client, setClients }) {
  const [newNote, setNewNote] = useState("");
  const [newPending, setNewPending] = useState("");
  const [newWarranty, setNewWarranty] = useState("");

  const update = (fn) => {
    setClients((prev) => prev.map((c) => (c.id === client.id ? fn({ ...c }) : c)));
  };

  const addHistory = () => {
    if (!newNote.trim()) return;
    update((c) => {
      c.history = [{ id: uid("h"), date: Date.now(), text: newNote.trim() }, ...c.history];
      return c;
    });
    setNewNote("");
  };

  const addPending = () => {
    const val = parseFloat(newPending.replace(",", "."));
    if (!val) return;
    update((c) => {
      c.pendingPayments = (Number(c.pendingPayments) || 0) + val;
      return c;
    });
    setNewPending("");
  };

  const clearPending = () => {
    update((c) => {
      c.pendingPayments = 0;
      return c;
    });
  };

  const addWarranty = () => {
    if (!newWarranty.trim()) return;
    update((c) => {
      c.warranties = [{ id: uid("w"), text: newWarranty.trim(), addedAt: Date.now() }, ...c.warranties];
      return c;
    });
    setNewWarranty("");
  };

  const removeWarranty = (id) => {
    update((c) => {
      c.warranties = c.warranties.filter((w) => w.id !== id);
      return c;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: COLORS.textPrimary, letterSpacing: 1 }}>
              {client.plate}
            </p>
            <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.textMuted }}>
              {client.clientName || "Sin nombre"} {client.phone ? `· ${client.phone}` : ""}
            </p>
            {client.model && (
              <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textFaint }}>{client.model}</p>
            )}
          </div>
          <Pill tone={client.pendingPayments > 0 ? "warning" : "success"}>
            {client.pendingPayments > 0 ? `Pendiente: ${fmtEUR(client.pendingPayments)}` : "Al dia"}
          </Pill>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle>Garantias vigentes</SectionTitle>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <TextInput placeholder="Ej: correa distribucion, 12 meses" value={newWarranty} onChange={(e) => setNewWarranty(e.target.value)} style={{ flex: 1 }} />
            <Button onClick={addWarranty}><IconPlus /></Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {client.warranties.length === 0 && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>Sin garantias registradas.</p>
            )}
            {client.warranties.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface2, borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textPrimary }}>{w.text}</span>
                <button onClick={() => removeWarranty(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Cobros pendientes</SectionTitle>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: client.pendingPayments > 0 ? COLORS.warning : COLORS.success, margin: "8px 0" }}>
            {fmtEUR(client.pendingPayments)}
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <TextInput placeholder="Importe a anadir" value={newPending} onChange={(e) => setNewPending(e.target.value)} style={{ flex: 1 }} />
            <Button onClick={addPending}><IconPlus /></Button>
          </div>
          <Button variant="ghost" onClick={clearPending} style={{ width: "100%" }}>Marcar como cobrado</Button>
        </Card>
      </div>

      <Card>
        <SectionTitle>Historial del vehiculo</SectionTitle>
        <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
          <TextInput placeholder="Anadir entrada al historial" value={newNote} onChange={(e) => setNewNote(e.target.value)} style={{ flex: 1 }} />
          <Button onClick={addHistory}><IconPlus /></Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {client.history.length === 0 && (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>Sin entradas en el historial.</p>
          )}
          {client.history.map((h) => (
            <div key={h.id} style={{ display: "flex", gap: 10, padding: "8px 10px", background: COLORS.surface2, borderRadius: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: COLORS.textFaint, minWidth: 74 }}>{fmtDate(h.date)}</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textPrimary }}>{h.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: 20,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>{title}</SectionTitle>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 18, cursor: "pointer" }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewFichaModal({ onClose, onCreate }) {
  const [plate, setPlate] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [model, setModel] = useState("");

  return (
    <Modal title="Nueva ficha de vehiculo" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Matricula">
          <TextInput value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="0000 ABC" />
        </Field>
        <Field label="Cliente">
          <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre y apellidos" />
        </Field>
        <Field label="Telefono">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="600 000 000" />
        </Field>
        <Field label="Vehiculo">
          <TextInput value={model} onChange={(e) => setModel(e.target.value)} placeholder="Marca y modelo" />
        </Field>
        <Button
          variant="primary"
          onClick={() => plate.trim() && onCreate({ plate, clientName, phone, model })}
          style={{ marginTop: 6 }}
        >
          Crear ficha
        </Button>
      </div>
    </Modal>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ScreenRecepcion({ orders, receptions, setReceptions, clients }) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const activeOrders = orders.slice().sort((a, b) => b.createdAt - a.createdAt);
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;
  const client = selectedOrder ? clients.find((c) => c.plate === selectedOrder.plate) : null;

  const getOrCreate = (order) => {
    const existing = receptions.find((r) => r.orderId === order.id);
    if (existing) return existing;
    const fresh = {
      id: uid("r"),
      orderId: order.id,
      plate: order.plate,
      requestedItems: order.description
        ? order.description.split(/\n|;/).map((t) => t.trim()).filter(Boolean).map((t) => ({ id: uid("ri"), text: t }))
        : [],
      findings: [],
      checkpoints: {},
      budgetStatus: "sin_enviar",
      createdAt: Date.now(),
    };
    setReceptions((prev) => [fresh, ...prev]);
    return fresh;
  };

  const reception = selectedOrder ? getOrCreate(selectedOrder) : null;

  const update = (fn) => {
    if (!reception) return;
    setReceptions((prev) => prev.map((r) => (r.id === reception.id ? fn({ ...r }) : r)));
  };

  return (
    <div>
      <Header title="Recepcion activa" subtitle="Registra el estado del vehiculo al entrar en el taller, separando lo pedido por el cliente de los hallazgos" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 12 }}>
          <SectionTitle>Ordenes</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 480, overflowY: "auto" }}>
            {activeOrders.length === 0 && (
              <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13 }}>
                Crea primero una orden en Ordenes y QR.
              </p>
            )}
            {activeOrders.map((o) => {
              const has = receptions.some((r) => r.orderId === o.id);
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: selectedOrderId === o.id ? COLORS.accentSoft : "transparent",
                    border: `1px solid ${selectedOrderId === o.id ? COLORS.accent + "55" : "transparent"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13.5, color: COLORS.textPrimary }}>
                      {o.plate}
                    </span>
                    {has && <Pill tone="success">Iniciada</Pill>}
                  </div>
                  <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textMuted }}>{fmtDate(o.createdAt)}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {reception ? (
          <RecepcionDetalle reception={reception} update={update} client={client} />
        ) : (
          <Card>
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5 }}>
              Selecciona una orden para iniciar o continuar su recepcion activa.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function RecepcionDetalle({ reception, update, client }) {
  const [newRequested, setNewRequested] = useState("");
  const [newFinding, setNewFinding] = useState("");
  const fileInputRef = useRef(null);
  const [findingForPhoto, setFindingForPhoto] = useState(null);

  const addRequested = () => {
    if (!newRequested.trim()) return;
    update((r) => {
      r.requestedItems = [...r.requestedItems, { id: uid("ri"), text: newRequested.trim() }];
      return r;
    });
    setNewRequested("");
  };
  const removeRequested = (id) => {
    update((r) => {
      r.requestedItems = r.requestedItems.filter((i) => i.id !== id);
      return r;
    });
  };

  const addFinding = () => {
    if (!newFinding.trim()) return;
    update((r) => {
      r.findings = [...r.findings, { id: uid("f"), text: newFinding.trim(), photos: [], price: "" }];
      return r;
    });
    setNewFinding("");
  };
  const removeFinding = (id) => {
    update((r) => {
      r.findings = r.findings.filter((f) => f.id !== id);
      return r;
    });
  };
  const setFindingPrice = (id, price) => {
    update((r) => {
      r.findings = r.findings.map((f) => (f.id === id ? { ...f, price } : f));
      return r;
    });
  };

  const setCheckpoint = (name, status) => {
    update((r) => {
      r.checkpoints = { ...r.checkpoints, [name]: status };
      return r;
    });
  };

  const openPhotoPicker = (findingId) => {
    setFindingForPhoto(findingId);
    fileInputRef.current && fileInputRef.current.click();
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !findingForPhoto) return;
    const urls = await Promise.all(files.map(fileToDataUrl));
    update((r) => {
      r.findings = r.findings.map((f) => (f.id === findingForPhoto ? { ...f, photos: [...f.photos, ...urls] } : f));
      return r;
    });
    e.target.value = "";
    setFindingForPhoto(null);
  };

  const removePhoto = (findingId, idx) => {
    update((r) => {
      r.findings = r.findings.map((f) =>
        f.id === findingId ? { ...f, photos: f.photos.filter((_, i) => i !== idx) } : f
      );
      return r;
    });
  };

  const budgetTotal = reception.findings.reduce((sum, f) => sum + (parseFloat(String(f.price).replace(",", ".")) || 0), 0);

  const phoneDigits = client && client.phone ? client.phone.replace(/[^\d+]/g, "") : "";

  const buildMessage = () => {
    const lines = [];
    lines.push(`Hola${client && client.clientName ? " " + client.clientName.split(" ")[0] : ""}, te escribimos del taller sobre tu vehiculo ${reception.plate}.`);
    if (reception.requestedItems.length) {
      lines.push("");
      lines.push("Trabajos solicitados:");
      reception.requestedItems.forEach((i) => lines.push(`- ${i.text}`));
    }
    if (reception.findings.length) {
      lines.push("");
      lines.push("Hallazgos detectados en la revision:");
      reception.findings.forEach((f) => {
        const p = parseFloat(String(f.price).replace(",", "."));
        lines.push(`- ${f.text}${p ? ` (${fmtEUR(p)})` : ""}`);
      });
    }
    if (budgetTotal > 0) {
      lines.push("");
      lines.push(`Presupuesto total: ${fmtEUR(budgetTotal)}`);
      lines.push("Responde a este mensaje para aceptar o rechazar el presupuesto.");
    }
    return lines.join("\n");
  };

  const sendWhatsapp = (statusAfter) => {
    const text = encodeURIComponent(buildMessage());
    const url = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^\+/, "")}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    if (statusAfter) {
      update((r) => {
        r.budgetStatus = statusAfter;
        r.sentAt = Date.now();
        return r;
      });
    }
  };

  const setBudgetStatus = (status) => {
    update((r) => {
      r.budgetStatus = status;
      return r;
    });
  };

  const BUDGET_STATUS = {
    sin_enviar: { label: "Sin enviar", tone: "muted" },
    enviado: { label: "Enviado, esperando respuesta", tone: "warning" },
    aceptado: { label: "Cliente acepto", tone: "success" },
    rechazado: { label: "Cliente rechazo", tone: "danger" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFiles} style={{ display: "none" }} />

      <Card>
        <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: COLORS.textPrimary, letterSpacing: 1 }}>
          {reception.plate}
        </p>
        {client && (
          <p style={{ margin: "3px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
            {client.clientName || "Sin nombre"} {client.phone ? `· ${client.phone}` : "· sin telefono en la ficha"}
          </p>
        )}
        <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
          Recepcion iniciada el {fmtDate(reception.createdAt)}
        </p>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Pill tone="steel">Pedido del cliente</Pill>
          </div>
          <SectionTitle>Motivo de la visita</SectionTitle>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <TextInput placeholder="Anadir trabajo pedido" value={newRequested} onChange={(e) => setNewRequested(e.target.value)} style={{ flex: 1 }} />
            <Button onClick={addRequested}><IconPlus /></Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reception.requestedItems.length === 0 && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>Sin trabajos pedidos registrados.</p>
            )}
            {reception.requestedItems.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.steelSoft, borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textPrimary }}>{i.text}</span>
                <button onClick={() => removeRequested(i.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Pill tone="warning">Hallazgo en recepcion</Pill>
          </div>
          <SectionTitle>Detectado por el taller</SectionTitle>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <TextInput placeholder="Anadir hallazgo" value={newFinding} onChange={(e) => setNewFinding(e.target.value)} style={{ flex: 1 }} />
            <Button onClick={addFinding}><IconPlus /></Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reception.findings.length === 0 && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>Sin hallazgos registrados.</p>
            )}
            {reception.findings.map((f) => (
              <div key={f.id} style={{ background: COLORS.warningSoft, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textPrimary, flex: 1 }}>{f.text}</span>
                  <TextInput
                    placeholder="Precio"
                    value={f.price || ""}
                    onChange={(e) => setFindingPrice(f.id, e.target.value)}
                    style={{ width: 74, padding: "5px 8px", fontSize: 12 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openPhotoPicker(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.warning }} aria-label="Anadir foto">
                      <IconCamera />
                    </button>
                    <button onClick={() => removeFinding(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
                      <IconTrash />
                    </button>
                  </div>
                </div>
                {f.photos.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {f.photos.map((p, idx) => (
                      <div key={idx} style={{ position: "relative" }}>
                        <img src={p} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: `1px solid ${COLORS.border}` }} />
                        <button
                          onClick={() => removePhoto(f.id, idx)}
                          style={{
                            position: "absolute",
                            top: -5,
                            right: -5,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: COLORS.danger,
                            color: "#fff",
                            border: "none",
                            fontSize: 10,
                            lineHeight: "16px",
                            cursor: "pointer",
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Puntos de control</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 10 }}>
          {CHECKPOINTS.map((name) => {
            const status = reception.checkpoints[name];
            return (
              <div key={name} style={{ background: COLORS.surface2, borderRadius: 8, padding: "9px 10px" }}>
                <p style={{ margin: "0 0 6px", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.textPrimary }}>{name}</p>
                <div style={{ display: "flex", gap: 5 }}>
                  {Object.entries(CHECK_STATUS).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setCheckpoint(name, key)}
                      style={{
                        flex: 1,
                        border: "none",
                        borderRadius: 6,
                        padding: "5px 0",
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        cursor: "pointer",
                        background: status === key
                          ? { success: COLORS.success, warning: COLORS.warning, danger: COLORS.danger }[meta.tone]
                          : COLORS.surface3,
                        color: status === key ? "#151515" : COLORS.textMuted,
                      }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <SectionTitle>Presupuesto y aviso al cliente</SectionTitle>
          <Pill tone={BUDGET_STATUS[reception.budgetStatus || "sin_enviar"].tone}>
            {BUDGET_STATUS[reception.budgetStatus || "sin_enviar"].label}
          </Pill>
        </div>
        <p style={{ margin: "10px 0 4px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, color: COLORS.textPrimary }}>
          {fmtEUR(budgetTotal)}
        </p>
        <p style={{ margin: "0 0 14px", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
          Suma de los precios anadidos a cada hallazgo. El mensaje incluye tambien los trabajos pedidos por el cliente.
        </p>
        {!phoneDigits && (
          <p style={{ margin: "0 0 10px", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.warning }}>
            Esta ficha no tiene telefono guardado: se abrira WhatsApp sin numero, tendras que elegirlo a mano.
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary" onClick={() => sendWhatsapp("enviado")}>
            <IconWhatsapp /> Enviar presupuesto por WhatsApp
          </Button>
          <Button variant="ghost" onClick={() => setBudgetStatus("aceptado")}>Marcar aceptado</Button>
          <Button variant="ghost" onClick={() => setBudgetStatus("rechazado")}>Marcar rechazado</Button>
        </div>
      </Card>
    </div>
  );
}

function OrderTimerControls({ order, activeEntry, setActiveEntry, setTimeEntries, setOrders }) {
  useTicker(!!activeEntry && activeEntry.orderId === order.id && !activeEntry.paused);

  const isThisActive = activeEntry && activeEntry.orderId === order.id;
  const otherActive = activeEntry && activeEntry.orderId !== order.id;

  const elapsed = isThisActive
    ? Date.now() - activeEntry.start - (activeEntry.pausedMs || 0) - (activeEntry.paused ? Date.now() - activeEntry.pauseStart : 0)
    : 0;

  const handleStart = () => {
    if (activeEntry) return;
    setActiveEntry({
      id: uid("t"),
      task: order.description || "Reparacion",
      plate: order.plate,
      orderId: order.id,
      start: Date.now(),
      end: null,
      pausedMs: 0,
      paused: false,
      pauseStart: null,
    });
    setOrders((prev) => prev.map((o) => (o.id === order.id && o.status === "abierta" ? { ...o, status: "en_progreso" } : o)));
  };

  const handleTogglePause = () => {
    if (!isThisActive) return;
    if (activeEntry.paused) {
      const pausedFor = Date.now() - activeEntry.pauseStart;
      setActiveEntry({ ...activeEntry, paused: false, pausedMs: activeEntry.pausedMs + pausedFor, pauseStart: null });
    } else {
      setActiveEntry({ ...activeEntry, paused: true, pauseStart: Date.now() });
    }
  };

  const handleFinish = () => {
    if (!isThisActive) return;
    const finished = { ...activeEntry, end: Date.now(), paused: false };
    setTimeEntries((prev) => [finished, ...prev]);
    setActiveEntry(null);
  };

  if (isThisActive) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: activeEntry.paused ? COLORS.warning : COLORS.success, minWidth: 62 }}>
          {fmtDur(Math.max(0, elapsed))}
        </span>
        <Button variant={activeEntry.paused ? "primary" : "secondary"} onClick={handleTogglePause}>
          {activeEntry.paused ? <IconPlay size={15} /> : <IconPause size={15} />} {activeEntry.paused ? "Reanudar" : "Pausar"}
        </Button>
        <Button variant="danger" onClick={handleFinish}>
          <IconStop size={14} /> Finalizar
        </Button>
      </div>
    );
  }

  return (
    <Button variant="secondary" disabled={!!otherActive} onClick={handleStart}>
      <IconPlay size={15} /> Iniciar reparacion
    </Button>
  );
}

function upsertOrderItem(items, article) {
  const list = items || [];
  const existing = list.find((it) => it.articleId === article.id);
  if (existing) {
    return list.map((it) => (it.articleId === article.id ? { ...it, qty: it.qty + 1 } : it));
  }
  return [...list, { id: uid("oi"), articleId: article.id, name: article.name, price: article.price, qty: 1 }];
}

function OrderArticles({ order, setOrders, articles }) {
  const [showAdd, setShowAdd] = useState(false);
  const items = order.items || [];
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);

  const addArticle = (article) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, items: upsertOrderItem(o.items, article) } : o)));
  };
  const changeQty = (itemId, delta) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, items: (o.items || []).map((it) => (it.id === itemId ? { ...it, qty: Math.max(1, it.qty + delta) } : it)) }
          : o
      )
    );
  };
  const removeItem = (itemId) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, items: (o.items || []).filter((it) => it.id !== itemId) } : o)));
  };

  return (
    <div style={{ width: "100%", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.3 }}>
          Articulos
        </span>
        <Button variant="ghost" onClick={() => setShowAdd(true)} style={{ padding: "5px 10px", fontSize: 12 }}>
          <IconPlus /> Anadir articulo
        </Button>
      </div>
      {items.length === 0 ? (
        <p style={{ margin: "6px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textFaint }}>
          Sin articulos anadidos.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface2, borderRadius: 7, padding: "6px 9px" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textPrimary, flex: 1 }}>{it.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => changeQty(it.id, -1)} style={{ width: 20, height: 20, border: "none", borderRadius: 5, background: COLORS.surface3, color: COLORS.textMuted, cursor: "pointer" }}>-</button>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.textPrimary, minWidth: 14, textAlign: "center" }}>{it.qty}</span>
                <button onClick={() => changeQty(it.id, 1)} style={{ width: 20, height: 20, border: "none", borderRadius: 5, background: COLORS.surface3, color: COLORS.textMuted, cursor: "pointer" }}>+</button>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.accent, minWidth: 60, textAlign: "right" }}>{fmtEUR(it.price * it.qty)}</span>
              <button onClick={() => removeItem(it.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint, marginLeft: 4 }}>
                <IconTrash />
              </button>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 2 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: COLORS.textPrimary }}>
              Subtotal articulos: {fmtEUR(subtotal)}
            </span>
          </div>
        </div>
      )}
      {showAdd && <AddArticleModal articles={articles} onClose={() => setShowAdd(false)} onAdd={addArticle} />}
    </div>
  );
}

function AddArticleModal({ articles, onClose, onAdd }) {
  const [mode, setMode] = useState("buscar");
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState([]);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const filtered = articles.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  const handlePick = (article) => {
    onAdd(article);
    setAdded((prev) => [article.name, ...prev].slice(0, 5));
  };

  useEffect(() => {
    if (mode !== "escanear") return;
    let cancelled = false;

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    (async () => {
      try {
        await ensureJsQR();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = window.jsQR && window.jsQR(imgData.data, imgData.width, imgData.height);
            if (code && code.data && code.data.startsWith("ARTICULO:")) {
              const id = code.data.slice("ARTICULO:".length);
              const article = articles.find((a) => a.id === id);
              if (article) {
                handlePick(article);
              } else {
                setScanError("QR leido, pero ese articulo no esta en el catalogo.");
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setScanError("No se pudo acceder a la camara. Usa la busqueda manual.");
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [mode]);

  return (
    <Modal title="Anadir articulo a la orden" onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <Button variant={mode === "buscar" ? "primary" : "ghost"} onClick={() => setMode("buscar")} style={{ flex: 1 }}>
          Buscar
        </Button>
        <Button variant={mode === "escanear" ? "primary" : "ghost"} onClick={() => setMode("escanear")} style={{ flex: 1 }}>
          <IconCamera /> Escanear QR
        </Button>
      </div>

      {mode === "buscar" ? (
        <div>
          <TextInput placeholder="Buscar articulo" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>
                Sin resultados. Crea el articulo primero en el catalogo.
              </p>
            )}
            {filtered.map((a) => (
              <div
                key={a.id}
                onClick={() => handlePick(a)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface2, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
              >
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textPrimary }}>{a.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.accent }}>{fmtEUR(a.price)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "4 / 3" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
          {scanError && (
            <p style={{ margin: "8px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.danger }}>{scanError}</p>
          )}
          <p style={{ margin: "8px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.textMuted }}>
            Apunta la camara al QR pegado en el articulo.
          </p>
        </div>
      )}

      {added.length > 0 && (
        <div style={{ marginTop: 12, padding: "8px 10px", background: COLORS.successSoft, borderRadius: 8 }}>
          <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.success }}>
            Anadido: {added.join(", ")}
          </p>
        </div>
      )}
      <Button variant="secondary" onClick={onClose} style={{ width: "100%", marginTop: 12 }}>
        Listo
      </Button>
    </Modal>
  );
}

function ArticleQrModal({ article, onClose }) {
  const qrData = encodeURIComponent(`ARTICULO:${article.id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${qrData}`;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=380,height=520");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>Etiqueta ${article.name}</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding:20px;">
          <h3 style="margin-bottom:2px;">${article.name}</h3>
          <p style="color:#555; margin-top:0;">${fmtEUR(article.price)}</p>
          <img src="${qrUrl}" width="200" height="200" />
          <p style="margin-top:10px; font-size:11px; color:#777;">Pega en el articulo. Escanea desde la orden para sumarlo.</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal title="QR del articulo" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 10 }}>
          <img src={qrUrl} width={200} height={200} alt={`QR ${article.name}`} />
        </div>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{article.name}</p>
        <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: COLORS.accent }}>{fmtEUR(article.price)}</p>
        <Button variant="primary" onClick={handlePrint} style={{ width: "100%" }}>
          <IconPrint /> Imprimir etiqueta
        </Button>
      </div>
    </Modal>
  );
}

function ArticlesCatalogModal({ articles, setArticles, onClose }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qrArticle, setQrArticle] = useState(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    const article = { id: uid("art"), name: name.trim(), price: parseFloat(String(price).replace(",", ".")) || 0 };
    setArticles((prev) => [article, ...prev]);
    setName("");
    setPrice("");
    setQrArticle(article);
  };

  const removeArticle = (id) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Modal title="Catalogo de articulos" onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TextInput placeholder="Nombre, ej: Limpiador de frenos" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
        <TextInput placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 80 }} />
        <Button variant="primary" onClick={handleCreate}><IconPlus /></Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
        {articles.length === 0 && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>
            Todavia no hay articulos en el catalogo.
          </p>
        )}
        {articles.map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface2, borderRadius: 8, padding: "8px 10px" }}>
            <div>
              <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textPrimary, fontWeight: 600 }}>{a.name}</p>
              <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.accent }}>{fmtEUR(a.price)}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button onClick={() => setQrArticle(a)} style={{ padding: "5px 9px" }}><IconQr /></Button>
              <button onClick={() => removeArticle(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
      {qrArticle && <ArticleQrModal article={qrArticle} onClose={() => setQrArticle(null)} />}
    </Modal>
  );
}

function ScreenOrdenes({ orders, setOrders, clients, activeEntry, setActiveEntry, setTimeEntries, articles, setArticles }) {
  const [showNew, setShowNew] = useState(false);
  const [qrOrder, setQrOrder] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const handleCreate = (data) => {
    const order = {
      id: uid("o"),
      plate: data.plate.toUpperCase(),
      description: data.description,
      status: "abierta",
      createdAt: Date.now(),
      items: [],
    };
    setOrders((prev) => [order, ...prev]);
    setShowNew(false);
    setQrOrder(order);
  };

  const setStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return (
    <div>
      <Header
        title="Ordenes y codigos QR"
        subtitle="Crea la orden de reparacion, controla el tiempo, anade articulos y genera etiquetas QR"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={() => setShowCatalog(true)}>
              <IconBarcode /> Articulos
            </Button>
            <Button variant="primary" onClick={() => setShowNew(true)}>
              <IconPlus /> Nueva orden
            </Button>
          </div>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {orders.length === 0 && (
          <Card>
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5 }}>
              Todavia no hay ordenes de reparacion. Crea la primera para generar su QR.
            </p>
          </Card>
        )}
        {orders
          .slice()
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((o) => (
            <Card key={o.id} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: COLORS.steelSoft, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.steel }}>
                    <IconWrench />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{o.plate}</p>
                    <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
                      {o.description || "Sin descripcion"} · {fmtDate(o.createdAt)}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <OrderTimerControls
                    order={o}
                    activeEntry={activeEntry}
                    setActiveEntry={setActiveEntry}
                    setTimeEntries={setTimeEntries}
                    setOrders={setOrders}
                  />
                  <Select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                    <option value="abierta">Abierta</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="pendiente_piezas">Pend. piezas</option>
                    <option value="cerrada">Cerrada</option>
                  </Select>
                  <Button onClick={() => setQrOrder(o)}><IconQr /> Ver QR</Button>
                </div>
              </div>
              <OrderArticles order={o} setOrders={setOrders} articles={articles} />
            </Card>
          ))}
      </div>

      {showNew && (
        <NewOrderModal
          clients={clients}
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
      {qrOrder && <QrModal order={qrOrder} onClose={() => setQrOrder(null)} />}
      {showCatalog && <ArticlesCatalogModal articles={articles} setArticles={setArticles} onClose={() => setShowCatalog(false)} />}
    </div>
  );
}

function NewOrderModal({ clients, onClose, onCreate }) {
  const [plate, setPlate] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Modal title="Nueva orden de reparacion" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Matricula">
          <TextInput list="plates" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="0000 ABC" />
          <datalist id="plates">
            {clients.map((c) => (
              <option key={c.id} value={c.plate} />
            ))}
          </datalist>
        </Field>
        <Field label="Motivo de la visita">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion del trabajo solicitado" />
        </Field>
        <Button variant="primary" onClick={() => plate.trim() && onCreate({ plate, description })} style={{ marginTop: 6 }}>
          Crear orden y generar QR
        </Button>
      </div>
    </Modal>
  );
}

function QrModal({ order, onClose }) {
  const qrData = encodeURIComponent(`ORDEN:${order.id}|MATRICULA:${order.plate}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${qrData}`;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>Etiqueta ${order.plate}</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding:24px;">
          <h2 style="margin-bottom:4px;">${order.plate}</h2>
          <p style="color:#555; margin-top:0;">Orden ${order.id}</p>
          <img src="${qrUrl}" width="240" height="240" />
          <p style="margin-top:12px; font-size:12px; color:#777;">Escanea para acceder a la orden de reparacion</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal title="Codigo QR de la orden" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 10 }}>
          <img src={qrUrl} width={220} height={220} alt={`QR orden ${order.plate}`} />
        </div>
        <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: COLORS.textPrimary }}>
          {order.plate}
        </p>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted, textAlign: "center" }}>
          Pega esta etiqueta en el vehiculo. Al escanearla se identifica la orden {order.id}.
        </p>
        <Button variant="primary" onClick={handlePrint} style={{ width: "100%" }}>
          <IconPrint /> Imprimir etiqueta
        </Button>
      </div>
    </Modal>
  );
}

async function sha256Hex(text) {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) return "";
  const enc = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fmtDdmmyyyy(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}${d.getFullYear()}`;
}

function nextInvoiceNumber(invoices) {
  const year = new Date().getFullYear();
  const thisYear = invoices.filter((i) => i.number.startsWith(String(year)));
  const max = thisYear.reduce((m, i) => {
    const n = parseInt(i.number.split("-")[1], 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${year}-${String(max + 1).padStart(4, "0")}`;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  const s = String(val == null ? "" : val);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportInvoicesCsv(invoices) {
  const headers = ["numero", "fecha", "cliente", "nif_cliente", "matricula", "base_imponible", "iva", "total", "hash"];
  const rows = invoices
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((inv) =>
      [
        inv.number,
        fmtDate(inv.createdAt),
        inv.clientName || "",
        inv.clientNif || "",
        inv.plate || "",
        inv.subtotal.toFixed(2),
        inv.vatTotal.toFixed(2),
        inv.total.toFixed(2),
        inv.hash,
      ]
        .map(csvEscape)
        .join(";")
    );
  const csv = [headers.join(";"), ...rows].join("\n");
  downloadFile(`facturas_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}

function exportInvoiceJson(invoice, company) {
  const payload = { ...invoice, emisor: company };
  downloadFile(`factura_${invoice.number}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function ScreenFacturas({ invoices, setInvoices, clients, company, setCompany }) {
  const [showNew, setShowNew] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [editingCompany, setEditingCompany] = useState(false);

  const createInvoice = async (data) => {
    const subtotal = data.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const vatTotal = data.items.reduce((s, it) => s + it.qty * it.unitPrice * (it.vat / 100), 0);
    const total = subtotal + vatTotal;
    const number = nextInvoiceNumber(invoices);
    const sorted = invoices.slice().sort((a, b) => a.createdAt - b.createdAt);
    const prevHash = sorted.length ? sorted[sorted.length - 1].hash : "";
    const createdAt = Date.now();
    const payload = JSON.stringify({ number, plate: data.plate, clientName: data.clientName, total: total.toFixed(2), createdAt, prevHash });
    const hash = (await sha256Hex(payload)) || uid("hash");
    const qrParams = new URLSearchParams({
      nif: company.nif || "",
      numserie: number,
      fecha: fmtDdmmyyyy(createdAt),
      importe: total.toFixed(2),
    });
    const qrData = `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${qrParams.toString()}`;
    const invoice = {
      id: uid("inv"),
      number,
      plate: data.plate,
      clientName: data.clientName,
      clientNif: data.clientNif,
      items: data.items,
      subtotal,
      vatTotal,
      total,
      createdAt,
      status: "emitida",
      prevHash,
      hash,
      qrData,
    };
    setInvoices((prev) => [invoice, ...prev]);
    setShowNew(false);
    setViewInvoice(invoice);
  };

  const totalFacturado = invoices.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <Header
        title="Facturacion"
        subtitle="Borrador de facturas con numeracion correlativa, IVA y hash de control (sin conexion Verifactu por ahora)"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            {invoices.length > 0 && (
              <Button variant="ghost" onClick={() => exportInvoicesCsv(invoices)}>
                <IconPrint /> Exportar CSV
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowNew(true)}>
              <IconPlus /> Nueva factura
            </Button>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Facturas emitidas" value={invoices.length} tone="steel" />
        <MetricCard label="Facturado total" value={fmtEUR(totalFacturado)} tone="accent" />
        <MetricCard label="Ultimo numero" value={invoices.length ? invoices[0].number : "-"} tone="success" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Datos del taller para la factura</SectionTitle>
          <Button variant="ghost" onClick={() => setEditingCompany((v) => !v)}>{editingCompany ? "Listo" : "Editar"}</Button>
        </div>
        {editingCompany ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <Field label="Nombre o razon social">
              <TextInput value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            </Field>
            <Field label="NIF / CIF">
              <TextInput value={company.nif} onChange={(e) => setCompany({ ...company, nif: e.target.value })} />
            </Field>
            <Field label="Direccion">
              <TextInput value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
            </Field>
          </div>
        ) : (
          <p style={{ margin: "8px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>
            {company.name || "Sin nombre"} · {company.nif || "sin NIF"} {company.address ? `· ${company.address}` : ""}
          </p>
        )}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invoices.length === 0 && (
          <Card>
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted, fontSize: 13.5 }}>
              Todavia no se ha emitido ninguna factura.
            </p>
          </Card>
        )}
        {invoices.map((inv) => (
          <Card key={inv.id} onClick={() => setViewInvoice(inv)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>
                {inv.number}
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.textMuted }}>
                {inv.clientName || "Sin cliente"} {inv.plate ? `· ${inv.plate}` : ""} · {fmtDate(inv.createdAt)}
              </p>
            </div>
            <Pill tone="success">{fmtEUR(inv.total)}</Pill>
          </Card>
        ))}
      </div>

      {showNew && (
        <NewInvoiceModal clients={clients} onClose={() => setShowNew(false)} onCreate={createInvoice} />
      )}
      {viewInvoice && <InvoiceModal invoice={viewInvoice} company={company} onClose={() => setViewInvoice(null)} />}
    </div>
  );
}

function NewInvoiceModal({ clients, onClose, onCreate }) {
  const [plate, setPlate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [items, setItems] = useState([{ id: uid("li"), concept: "", qty: 1, unitPrice: 0, vat: 21 }]);

  const handlePlateChange = (val) => {
    setPlate(val.toUpperCase());
    const match = clients.find((c) => c.plate === val.toUpperCase());
    if (match) {
      setClientName(match.clientName || "");
    }
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { id: uid("li"), concept: "", qty: 1, unitPrice: 0, vat: 21 }]);
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const vatTotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0) * ((Number(it.vat) || 0) / 100), 0);
  const total = subtotal + vatTotal;

  const canSubmit = plate.trim() && items.some((it) => it.concept.trim());

  return (
    <Modal title="Nueva factura" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Matricula">
            <TextInput list="fac-plates" value={plate} onChange={(e) => handlePlateChange(e.target.value)} placeholder="0000 ABC" />
            <datalist id="fac-plates">
              {clients.map((c) => (
                <option key={c.id} value={c.plate} />
              ))}
            </datalist>
          </Field>
          <Field label="Cliente">
            <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre o razon social" />
          </Field>
        </div>
        <Field label="NIF del cliente (opcional)">
          <TextInput value={clientNif} onChange={(e) => setClientNif(e.target.value)} placeholder="00000000A" />
        </Field>

        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, letterSpacing: 0.3, textTransform: "uppercase" }}>Conceptos</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 50px 70px 55px 20px", gap: 6, alignItems: "center" }}>
                <TextInput placeholder="Concepto" value={it.concept} onChange={(e) => updateItem(it.id, "concept", e.target.value)} style={{ fontSize: 12.5, padding: "6px 8px" }} />
                <TextInput type="number" min="0" value={it.qty} onChange={(e) => updateItem(it.id, "qty", e.target.value)} style={{ fontSize: 12.5, padding: "6px 6px" }} />
                <TextInput type="number" min="0" step="0.01" placeholder="Precio" value={it.unitPrice} onChange={(e) => updateItem(it.id, "unitPrice", e.target.value)} style={{ fontSize: 12.5, padding: "6px 6px" }} />
                <Select value={it.vat} onChange={(e) => updateItem(it.id, "vat", e.target.value)} style={{ fontSize: 12, padding: "6px 4px" }}>
                  <option value="21">21%</option>
                  <option value="10">10%</option>
                  <option value="4">4%</option>
                  <option value="0">0%</option>
                </Select>
                <button onClick={() => removeItem(it.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={addItem} style={{ marginTop: 8 }}>
            <IconPlus /> Anadir concepto
          </Button>
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          <Row label="Base imponible" value={fmtEUR(subtotal)} />
          <Row label="IVA" value={fmtEUR(vatTotal)} />
          <Row label="Total" value={fmtEUR(total)} strong />
        </div>

        <Button variant="primary" disabled={!canSubmit} onClick={() => onCreate({ plate, clientName, clientNif, items: items.map((it) => ({ ...it, qty: Number(it.qty) || 0, unitPrice: Number(it.unitPrice) || 0, vat: Number(it.vat) || 0 })) })}>
          Emitir factura
        </Button>
      </div>
    </Modal>
  );
}

function Row({ label, value, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 500, color: strong ? COLORS.textPrimary : COLORS.textMuted }}>
        {label}
      </span>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500, color: strong ? COLORS.accent : COLORS.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

function InvoiceModal({ invoice, company, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(invoice.qrData)}`;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=460,height=680");
    if (!w) return;
    const rows = invoice.items
      .map(
        (it) =>
          `<tr><td>${it.concept}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${it.unitPrice.toFixed(2)} EUR</td><td style="text-align:right">${it.vat}%</td></tr>`
      )
      .join("");
    w.document.write(`
      <html>
        <head><title>Factura ${invoice.number}</title></head>
        <body style="font-family: Arial, sans-serif; padding:24px; color:#111;">
          <h2 style="margin-bottom:2px;">Factura ${invoice.number}</h2>
          <p style="color:#555; margin-top:0;">${fmtDate(invoice.createdAt)}</p>
          <p><strong>${company.name || ""}</strong><br/>${company.nif || ""}<br/>${company.address || ""}</p>
          <p>Cliente: ${invoice.clientName || "-"} ${invoice.clientNif ? "(" + invoice.clientNif + ")" : ""}<br/>Vehiculo: ${invoice.plate}</p>
          <table width="100%" style="border-collapse:collapse; margin-top:12px;">
            <thead><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left;">Concepto</th><th>Cant.</th><th>Precio</th><th>IVA</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:14px;">Base imponible: ${invoice.subtotal.toFixed(2)} EUR<br/>IVA: ${invoice.vatTotal.toFixed(2)} EUR<br/><strong>Total: ${invoice.total.toFixed(2)} EUR</strong></p>
          <img src="${qrUrl}" width="150" height="150" style="margin-top:16px;" />
          <p style="font-size:10px; color:#888; word-break:break-all;">Hash: ${invoice.hash}</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal title={`Factura ${invoice.number}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.textMuted }}>
          {invoice.clientName || "Sin cliente"} {invoice.clientNif ? `· ${invoice.clientNif}` : ""} · {invoice.plate}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, background: COLORS.surface2, borderRadius: 8, padding: 10 }}>
          {invoice.items.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: "Inter, sans-serif", color: COLORS.textPrimary }}>
              <span>{it.concept} x{it.qty}</span>
              <span>{fmtEUR(it.qty * it.unitPrice)}</span>
            </div>
          ))}
        </div>
        <Row label="Base imponible" value={fmtEUR(invoice.subtotal)} />
        <Row label="IVA" value={fmtEUR(invoice.vatTotal)} />
        <Row label="Total" value={fmtEUR(invoice.total)} strong />
        <div style={{ display: "flex", justifyContent: "center", background: "#fff", borderRadius: 10, padding: 10 }}>
          <img src={qrUrl} width={150} height={150} alt="QR factura" />
        </div>
        <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: COLORS.textFaint, wordBreak: "break-all" }}>
          hash: {invoice.hash.slice(0, 40)}...
        </p>
        <Button variant="primary" onClick={handlePrint}>
          <IconPrint /> Imprimir / descargar
        </Button>
        <Button variant="ghost" onClick={() => exportInvoiceJson(invoice, company)}>
          Exportar JSON (para otro software)
        </Button>
      </div>
    </Modal>
  );
}

export default function TallerApp() {
  useEffect(() => {
    ensureFonts();
  }, []);

  const [screen, setScreen] = useState("inicio");
  const [loaded, setLoaded] = useState(false);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [receptions, setReceptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [company, setCompany] = useState({ name: "", nif: "", address: "" });
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [c, o, t, a, r, inv, comp, arts] = await Promise.all([
        storageGet("clients", []),
        storageGet("orders", []),
        storageGet("time-entries", []),
        storageGet("active-entry", null),
        storageGet("receptions", []),
        storageGet("invoices", []),
        storageGet("company-info", { name: "", nif: "", address: "" }),
        storageGet("articles", []),
      ]);
      if (!mounted) return;
      setClients(c);
      setOrders(o);
      setTimeEntries(t);
      setActiveEntry(a);
      setReceptions(r);
      setInvoices(inv);
      setCompany(comp);
      setArticles(arts);
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) storageSet("clients", clients);
  }, [clients, loaded]);
  useEffect(() => {
    if (loaded) storageSet("orders", orders);
  }, [orders, loaded]);
  useEffect(() => {
    if (loaded) storageSet("time-entries", timeEntries);
  }, [timeEntries, loaded]);
  useEffect(() => {
    if (loaded) storageSet("active-entry", activeEntry);
  }, [activeEntry, loaded]);
  useEffect(() => {
    if (loaded) storageSet("receptions", receptions);
  }, [receptions, loaded]);
  useEffect(() => {
    if (loaded) storageSet("invoices", invoices);
  }, [invoices, loaded]);
  useEffect(() => {
    if (loaded) storageSet("company-info", company);
  }, [company, loaded]);
  useEffect(() => {
    if (loaded) storageSet("articles", articles);
  }, [articles, loaded]);

  if (!loaded) {
    return (
      <div style={{ background: COLORS.bg, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.textMuted }}>Cargando taller...</p>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: 640, display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#1A0E04" }}>
            <IconWrench />
          </div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.textPrimary, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Mi Taller
          </span>
        </div>
        {screen !== "inicio" && (
          <button
            onClick={() => setScreen("inicio")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: COLORS.surface2,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            <IconHome />
            Inicio
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "22px 24px", minWidth: 0, overflowY: "auto" }}>
        {screen === "inicio" && (
          <ScreenInicio clients={clients} orders={orders} timeEntries={timeEntries} activeEntry={activeEntry} goTo={setScreen} />
        )}
        {screen === "horario" && (
          <ScreenHorario
            timeEntries={timeEntries}
            setTimeEntries={setTimeEntries}
            activeEntry={activeEntry}
            setActiveEntry={setActiveEntry}
            clients={clients}
          />
        )}
        {screen === "fichas" && <ScreenFichas clients={clients} setClients={setClients} />}
        {screen === "recepcion" && <ScreenRecepcion orders={orders} receptions={receptions} setReceptions={setReceptions} clients={clients} />}
        {screen === "ordenes" && (
          <ScreenOrdenes
            orders={orders}
            setOrders={setOrders}
            clients={clients}
            activeEntry={activeEntry}
            setActiveEntry={setActiveEntry}
            setTimeEntries={setTimeEntries}
            articles={articles}
            setArticles={setArticles}
          />
        )}
        {screen === "facturas" && (
          <ScreenFacturas invoices={invoices} setInvoices={setInvoices} clients={clients} company={company} setCompany={setCompany} />
        )}
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          flexShrink: 0,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "10px 4px 12px",
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: active ? COLORS.accent : COLORS.textFaint,
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 11,
                borderTop: `2px solid ${active ? COLORS.accent : "transparent"}`,
              }}
            >
              <Icon />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
