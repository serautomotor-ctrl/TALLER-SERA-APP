const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super("No hay ninguna clave de IA configurada. Anadela en Ajustes.");
  }
}

export async function askAnthropic(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  if (!apiKey) throw new AnthropicNotConfiguredError();

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("La clave de IA no es valida. Comprueba que la has copiado bien en Ajustes.");
    }
    if (res.status === 429) {
      throw new Error("Se ha alcanzado el limite de uso de la IA. Intentalo de nuevo en un momento.");
    }
    throw new Error(`Error al consultar la IA (${res.status}). ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("La IA no devolvio ninguna respuesta.");
  return text;
}
