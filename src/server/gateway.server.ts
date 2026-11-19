// Server-only: streaming call to Lovable AI Gateway (Gemini, chat completions) with strict JSON output.
export const AI_MODEL = "google/gemini-3.8-flash";

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function gatewayJSON<T>(system: string, user: string, schemaName: string, schema: object): Promise<T> {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new GatewayError(401, "AI is not configured (missing LOVABLE_API_KEY).");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    }),
  });
  if (!res.ok || !res.body) {
    let msg = `AI request failed (${res.status}).`;
    try { const j = await res.json(); msg = j?.error?.message ?? j?.message ?? msg; } catch { /* ignore */ }
    if (res.status === 402) msg = msg || "AI credits are exhausted.";
    if (res.status === 429) msg = "Too many AI requests right now — try again in a minute.";
    throw new GatewayError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const data = l.slice(5).trim();
      if (data === "[DONE]") continue;
      try { text += JSON.parse(data).choices?.[0]?.delta?.content ?? ""; } catch { /* partial */ }
    }
  }
  if (!text.trim()) throw new GatewayError(502, "The AI returned an empty answer.");
  try { return JSON.parse(text) as T; } catch { throw new GatewayError(502, "The AI answer could not be read."); }
}
