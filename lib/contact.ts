/** Utilidades para abrir WhatsApp o el correo con un mensaje ya escrito. */

export function phoneForWhatsapp(phone: string | null | undefined) {
  let digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  // Numeros espanoles de 9 cifras: anadimos el prefijo 34
  if (digits.length === 9 && /^[6789]/.test(digits)) digits = "34" + digits;
  if (digits.startsWith("0034")) digits = digits.slice(2);
  return digits;
}

export function whatsappLink(phone: string | null | undefined, text: string) {
  const digits = phoneForWhatsapp(phone);
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string) {
  return `mailto:${encodeURIComponent(String(email || "").trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function firstName(name: string | null | undefined) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}
