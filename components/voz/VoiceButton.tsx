"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { executeVoice, interpretVoice, type VoiceProposal } from "@/app/voz/actions";
import { fmtEUR } from "@/lib/format";

type Phase = "idle" | "listening" | "thinking" | "proposal" | "done";

// Tipos minimos del reconocimiento de voz del navegador (Chrome/Edge/Safari)
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const PLATE_KEY = "taller_voz_matricula";

function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const INTENT_LABEL: Record<string, string> = {
  add_item: "Apuntar en la orden",
  note: "Anotar en observaciones",
  status: "Cambiar el estado",
  timer_start: "Empezar el tiempo",
  timer_stop: "Parar el tiempo",
  new_order: "Abrir una orden nueva",
};
const STATUS_LABEL: Record<string, string> = { abierta: "Abierta", en_progreso: "En curso", pendiente_piezas: "Esperando piezas", cerrada: "Terminada" };

export function VoiceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [proposal, setProposal] = useState<VoiceProposal | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [freeName, setFreeName] = useState("");
  const [freePrice, setFreePrice] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [plate, setPlate] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");
  const pendingRef = useRef("");
  const errorRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cosas que solo existen en el navegador: si hay microfono y la ultima matricula usada
    const id = setTimeout(() => {
      setSupported(!!getRecognition());
      try {
        setPlate(localStorage.getItem(PLATE_KEY));
      } catch {
        // sin almacenamiento local: no pasa nada
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const rememberPlate = (p: string | null) => {
    setPlate(p);
    try {
      if (p) localStorage.setItem(PLATE_KEY, p);
      else localStorage.removeItem(PLATE_KEY);
    } catch {
      // sin almacenamiento local
    }
  };

  const interpret = async (text: string) => {
    if (!text.trim()) return setPhase("idle");
    setPhase("thinking");
    setResult(null);
    try {
      const p = await interpretVoice(text, plate);
      setProposal(p);
      if (p.plate) rememberPlate(p.plate);
      setQty(p.qty || 1);
      setChoice(p.candidates[0]?.id || (p.intent === "add_item" ? "libre" : ""));
      setFreeName(p.text);
      setFreePrice("");
      setPhase("proposal");
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "No se pudo interpretar." });
      setPhase("done");
    }
  };

  const listen = () => {
    const rec = getRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    recRef.current = rec;
    finalRef.current = "";
    errorRef.current = "";
    setHeard("");
    setProposal(null);
    setResult(null);
    rec.lang = "es-ES";
    rec.interimResults = true;
    // Seguimos escuchando aunque hagas pausas (matricula... pausa... "apuntale...").
    // Paramos solos tras 2,5 s de silencio desde lo ultimo que se ha oido.
    rec.continuous = true;
    rec.maxAlternatives = 1;

    const armSilence = (ms: number) => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => rec.stop(), ms);
    };
    armSilence(8000); // si no dices nada en 8 s, se para

    rec.onresult = (e) => {
      // Reconstruimos todo el texto cada vez. En Android cada trozo suele repetir el anterior
      // ("9368", "9368 MND", "9368 MND apuntale..."): nos quedamos con el mas largo.
      const parts: string[] = [];
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim();
        if (!t) continue;
        if (r.isFinal) {
          const prev = parts[parts.length - 1];
          if (prev && t.toLowerCase().startsWith(prev.toLowerCase())) parts[parts.length - 1] = t;
          else if (!prev || !prev.toLowerCase().includes(t.toLowerCase())) parts.push(t);
        } else interim = t;
      }
      let finalText = parts.join(" ");
      if (interim && finalText && interim.toLowerCase().startsWith(finalText.toLowerCase())) {
        finalText = "";
      }
      finalRef.current = parts.join(" ");
      setHeard([finalText, interim].filter(Boolean).join(" ").trim());
      // Guardamos tambien lo provisional por si el navegador corta sin dar el resultado final
      pendingRef.current = interim;
      armSilence(2500);
    };
    rec.onerror = (e) => {
      const msg: Record<string, string> = {
        "not-allowed":
          "Este navegador no deja usar el microfono. Abre el programa en Chrome o Edge (o en el movil), pulsa el icono que hay a la izquierda de la direccion, entra en Microfono y elige Permitir. Mientras tanto puedes escribir la frase abajo.",
        "service-not-allowed": "Este navegador no permite el dictado. Prueba en Chrome o Edge, o escribe la frase abajo.",
        "audio-capture": "No encuentro ningun microfono. Comprueba que esta conectado y que ninguna otra aplicacion lo esta usando.",
        network: "El dictado necesita internet (el navegador convierte la voz en texto en sus servidores). Revisa la conexion.",
        "no-speech": "No te he oido. Pulsa el microfono y habla cerca del movil, sin esperar mucho.",
        "language-not-supported": "Este navegador no tiene dictado en espanol. Prueba con Chrome.",
      };
      if (e.error === "aborted") return;
      errorRef.current = msg[e.error] || `El dictado ha fallado (${e.error}). Prueba otra vez o escribe la frase.`;
    };
    rec.onend = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      const text = (finalRef.current || pendingRef.current).trim();
      pendingRef.current = "";
      if (text) {
        setHeard(text);
        interpret(text);
      } else {
        setResult({ ok: false, message: errorRef.current || "No te he oido. Pulsa el microfono y vuelve a decirlo un poco mas alto." });
        setPhase("done");
      }
    };
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setResult({ ok: false, message: "No se pudo encender el microfono. Cierra esta ventana y vuelve a intentarlo." });
      setPhase("done");
    }
  };

  const stopListening = () => recRef.current?.stop();

  const confirm = async () => {
    if (!proposal?.intent || !proposal.plate) return;
    setPhase("thinking");
    const res = await executeVoice({
      intent: proposal.intent,
      plate: proposal.plate,
      orderId: proposal.orderId,
      qty,
      articleId: choice && choice !== "libre" ? choice : null,
      freeName,
      freePrice: parseFloat(freePrice.replace(",", ".")) || 0,
      text: proposal.text,
      status: proposal.status,
    });
    setResult(res);
    setPhase("done");
    router.refresh();
  };

  const openPanel = () => {
    setOpen(true);
    if (supported) listen();
  };
  const close = () => {
    recRef.current?.stop();
    setOpen(false);
    setPhase("idle");
    setProposal(null);
    setResult(null);
    setHeard("");
  };

  return (
    <>
      <button type="button" className="no-print" onClick={openPanel} title="Dictar por voz" aria-label="Dictar por voz" style={fab}>
        <MicIcon />
      </button>

      {open && (
        <div className="no-print" style={overlay} onClick={close}>
          <div style={sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 18, textTransform: "uppercase" }}>Dictar al taller</strong>
              <button type="button" onClick={close} style={{ background: "none", border: "none", color: "var(--color-text-muted)", fontSize: 22, cursor: "pointer" }}>
                &times;
              </button>
            </div>

            {plate && (
              <p style={{ ...small, marginBottom: 10 }}>
                Matricula en uso: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{plate}</strong> · si no dices otra, uso esta.{" "}
                <button type="button" onClick={() => rememberPlate(null)} style={linkBtn}>
                  Olvidar
                </button>
              </p>
            )}

            {(phase === "idle" || phase === "listening") && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <button
                  type="button"
                  onClick={phase === "listening" ? stopListening : listen}
                  disabled={!supported}
                  style={{ ...bigMic, background: phase === "listening" ? "var(--color-danger)" : "var(--color-accent)", animation: phase === "listening" ? "vozPulse 1.2s infinite" : "none" }}
                >
                  <MicIcon size={34} />
                </button>
                <p style={{ ...small, marginTop: 10 }}>
                  {!supported
                    ? "Este navegador no tiene dictado por voz (funciona en Chrome, Edge y Safari). Puedes escribirlo abajo."
                    : phase === "listening"
                      ? "Te escucho... di la matricula y lo que hay que hacer. Cuando acabes, pulsa o espera un momento."
                      : "Pulsa y habla"}
                </p>
                {heard && <p style={{ fontFamily: "var(--font-body)", fontSize: 16, margin: "8px 0 0", color: "var(--color-text-primary)" }}>«{heard}»</p>}
                <p style={{ ...small, marginTop: 12, textAlign: "left" }}>
                  Ejemplos: «1234 BCD apuntale un limpiador de frenos» · «ponle dos litros de aceite» · «anota que hace ruido la rueda» · «pasala a esperando piezas» ·
                  «empieza el tiempo» · «abre una orden para 5678 KLM cambio de aceite».
                </p>
              </div>
            )}

            {phase === "thinking" && <p style={{ ...small, textAlign: "center", padding: 20 }}>Pensando...</p>}

            {phase === "proposal" && proposal && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ ...small, margin: 0 }}>He entendido: «{proposal.heard}»</p>
                {proposal.error ? (
                  <div style={{ ...box, borderColor: "var(--color-warning)", color: "var(--color-warning)" }}>{proposal.error}</div>
                ) : (
                  <div style={box}>
                    <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15 }}>{INTENT_LABEL[proposal.intent || ""]}</div>
                    <div style={{ ...small, marginTop: 2 }}>{proposal.orderLabel || proposal.plate}</div>

                    {proposal.intent === "add_item" && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={small}>Cantidad</span>
                          <button type="button" style={qtyBtn} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                            −
                          </button>
                          <strong style={{ minWidth: 20, textAlign: "center" }}>{qty}</strong>
                          <button type="button" style={qtyBtn} onClick={() => setQty((q) => q + 1)}>
                            +
                          </button>
                        </div>
                        {proposal.candidates.map((c) => (
                          <label key={c.id} style={option(choice === c.id)}>
                            <input type="radio" name="voz-art" checked={choice === c.id} onChange={() => setChoice(c.id)} />
                            <span style={{ flex: 1 }}>{c.name}</span>
                            <span style={small}>
                              {fmtEUR(c.price)} · stock {c.stock}
                            </span>
                          </label>
                        ))}
                        <label style={option(choice === "libre")}>
                          <input type="radio" name="voz-art" checked={choice === "libre"} onChange={() => setChoice("libre")} />
                          <span style={{ flex: 1 }}>{proposal.candidates.length ? "Otro, que no esta en el catalogo" : "No esta en el catalogo: apuntarlo igual"}</span>
                        </label>
                        {choice === "libre" && (
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px", gap: 6 }}>
                            <input value={freeName} onChange={(e) => setFreeName(e.target.value)} style={input} />
                            <input value={freePrice} onChange={(e) => setFreePrice(e.target.value)} placeholder="Precio" inputMode="decimal" style={input} />
                          </div>
                        )}
                      </div>
                    )}
                    {proposal.intent === "note" && <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 14 }}>«{proposal.text}»</p>}
                    {proposal.intent === "status" && proposal.status && (
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 14 }}>Nuevo estado: {STATUS_LABEL[proposal.status]}</p>
                    )}
                    {proposal.intent === "new_order" && (
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 14 }}>Trabajo: {proposal.text || "(sin descripcion)"}</p>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={listen} disabled={!supported} style={{ ...btn, flex: 1 }}>
                    Repetir
                  </button>
                  {!proposal.error && (
                    <button type="button" onClick={confirm} disabled={proposal.intent === "add_item" && choice === "libre" && !freeName.trim()} style={{ ...btn, ...primary, flex: 2 }}>
                      Confirmar
                    </button>
                  )}
                </div>
              </div>
            )}

            {phase === "done" && result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {heard && <p style={{ ...small, margin: 0 }}>He oido: «{heard}»</p>}
                <div style={{ ...box, borderColor: result.ok ? "var(--color-success)" : "var(--color-danger)", color: result.ok ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>
                  {result.message}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={close} style={{ ...btn, flex: 1 }}>
                    Cerrar
                  </button>
                  <button type="button" onClick={listen} disabled={!supported} style={{ ...btn, ...primary, flex: 2 }}>
                    Dictar otra cosa
                  </button>
                </div>
              </div>
            )}

            {phase !== "thinking" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = typed;
                  setTyped("");
                  setHeard(t);
                  interpret(t);
                }}
                style={{ display: "flex", gap: 6, marginTop: 14, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}
              >
                <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="...o escribelo aqui" style={{ ...input, flex: 1 }} />
                <button type="submit" disabled={!typed.trim()} style={btn}>
                  Enviar
                </button>
              </form>
            )}
          </div>
          <style>{`@keyframes vozPulse { 0% { box-shadow: 0 0 0 0 rgba(229,72,77,.5) } 70% { box-shadow: 0 0 0 18px rgba(229,72,77,0) } 100% { box-shadow: 0 0 0 0 rgba(229,72,77,0) } }`}</style>
        </div>
      )}
    </>
  );
}

function MicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" strokeLinecap="round" />
    </svg>
  );
}

const fab: CSSProperties = {
  position: "fixed",
  right: 18,
  bottom: 84,
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: "none",
  background: "var(--color-accent)",
  color: "#1A0E04",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
  cursor: "pointer",
  zIndex: 45,
};
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 };
const sheet: CSSProperties = {
  width: "100%",
  maxWidth: 480,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 18,
  color: "var(--color-text-primary)",
  marginBottom: 8,
};
const bigMic: CSSProperties = { width: 84, height: 84, borderRadius: "50%", border: "none", color: "#1A0E04", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const small: CSSProperties = { fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)", margin: 0 };
const box: CSSProperties = { border: "1px solid var(--color-border)", background: "var(--color-surface-2)", borderRadius: 10, padding: 12, fontFamily: "var(--font-body)", fontSize: 13.5 };
const btn: CSSProperties = {
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-2)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
const primary: CSSProperties = { background: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#1A0E04" };
const input: CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "9px 11px",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  minWidth: 0,
};
const qtyBtn: CSSProperties = { width: 32, height: 32, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontSize: 16 };
const linkBtn: CSSProperties = { background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: 12.5 };
function option(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
    background: active ? "var(--color-accent-soft)" : "var(--color-surface)",
    fontFamily: "var(--font-body)",
    fontSize: 13.5,
    cursor: "pointer",
  };
}
