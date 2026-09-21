// Reads a payment screenshot and compares the amount on it with the amount due.
// Advisory only — never blocks a submission and never writes to the database.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // ~8MB of raw image data

type ScanStatus = "match" | "mismatch" | "unreadable";

interface ParsedProof {
  readable: boolean;
  amount: number | null;
  currency: string | null;
  paid_at: string | null;
  reference: string | null;
  recipient: string | null;
  confidence: number | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const unreadable = (reason: string, details: Record<string, unknown> = {}) =>
  json({ status: "unreadable" as ScanStatus, amount: null, details: { reason, ...details } });

const PROMPT = `You are reading a screenshot of a bank transfer or PayNow payment receipt.
Return the total amount that was transferred (the amount the payer sent), the currency code,
the date/time of the transfer in ISO format, the transaction reference number, and the recipient name.
Set readable to false if the image is not a payment receipt or the amount cannot be read.
Never guess an amount: if it is not clearly visible, set amount to null and readable to false.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    readable: { type: "boolean" },
    amount: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    paid_at: { type: ["string", "null"] },
    reference: { type: ["string", "null"] },
    recipient: { type: ["string", "null"] },
    confidence: { type: ["number", "null"] },
  },
  required: ["readable", "amount", "currency", "paid_at", "reference", "recipient", "confidence"],
};

async function readStreamedJson(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && typeof evt.response?.output_text === "string") {
          completedText = evt.response.output_text;
        }
      } catch (_) {
        // ignore non-JSON keepalive lines
      }
    }
  }
  return text || completedText;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return unreadable("ai_unavailable");

    const body = await req.json().catch(() => null);
    const imageDataUrl: string | undefined = body?.image_data_url;
    const expectedAmount = Number(body?.expected_amount);
    const currency: string = typeof body?.currency === "string" ? body.currency : "SGD";

    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return json({ error: "image_data_url (data:image/...) required" }, 400);
    }
    const base64Length = imageDataUrl.length - (imageDataUrl.indexOf(",") + 1);
    if (base64Length * 0.75 > MAX_IMAGE_BYTES) {
      return unreadable("image_too_large");
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              { type: "input_image", image_url: imageDataUrl },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "payment_proof",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const detail = await aiRes.text().catch(() => "");
      console.warn("[scan-payment-proof] gateway error", aiRes.status, detail.slice(0, 500));
      return unreadable("ai_error", { http_status: aiRes.status });
    }

    const raw = await readStreamedJson(aiRes);
    let parsed: ParsedProof | null = null;
    try {
      parsed = JSON.parse(raw) as ParsedProof;
    } catch (_) {
      parsed = null;
    }

    if (!parsed || !parsed.readable || parsed.amount === null || !Number.isFinite(Number(parsed.amount))) {
      return unreadable("not_readable", { parsed: parsed ?? undefined });
    }

    const scanned = Number(Number(parsed.amount).toFixed(2));
    const details = {
      amount: scanned,
      currency: parsed.currency || currency,
      paid_at: parsed.paid_at,
      reference: parsed.reference,
      recipient: parsed.recipient,
      confidence: parsed.confidence,
      expected_amount: Number.isFinite(expectedAmount) ? Number(expectedAmount.toFixed(2)) : null,
      scanned_at: new Date().toISOString(),
    };

    if (!Number.isFinite(expectedAmount)) {
      return json({ status: "unreadable" as ScanStatus, amount: scanned, details });
    }

    const status: ScanStatus = Math.abs(scanned - expectedAmount) <= 0.01 ? "match" : "mismatch";
    return json({ status, amount: scanned, details });
  } catch (error) {
    console.error("[scan-payment-proof] error", error);
    return unreadable("exception");
  }
});
