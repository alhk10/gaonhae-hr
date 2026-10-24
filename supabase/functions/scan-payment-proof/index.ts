// Reads a payment screenshot and compares the amount on it with the amount due.
// Advisory for uploads; for stored payments (payment_ids/invoice_ids) it saves the result.
import { createClient } from "npm:@supabase/supabase-js@2";

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

type ScanOut = { status: ScanStatus; amount: number | null; details: Record<string, unknown> };
const unread = (reason: string, details: Record<string, unknown> = {}): ScanOut =>
  ({ status: "unreadable", amount: null, details: { reason, ...details } });

async function scanImage(imageDataUrl: string, expectedAmount: number, currency: string): Promise<ScanOut> {
  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return unread("ai_unavailable");

    const base64Length = imageDataUrl.length - (imageDataUrl.indexOf(",") + 1);
    if (base64Length * 0.75 > MAX_IMAGE_BYTES) {
      return unread("image_too_large");
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
      return unread("ai_error", { http_status: aiRes.status });
    }

    const raw = await readStreamedJson(aiRes);
    let parsed: ParsedProof | null = null;
    try {
      parsed = JSON.parse(raw) as ParsedProof;
    } catch (_) {
      parsed = null;
    }

    if (!parsed || !parsed.readable || parsed.amount === null || !Number.isFinite(Number(parsed.amount))) {
      return unread("not_readable", { parsed: parsed ?? undefined });
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
      return { status: "unreadable", amount: scanned, details };
    }

    const status: ScanStatus = Math.abs(scanned - expectedAmount) <= 0.01 ? "match" : "mismatch";
    return { status, amount: scanned, details };
  } catch (error) {
    console.error("[scan-payment-proof] error", error);
    return unread("exception");
  }
}

// Resolves a stored proof URL or path to an object path in the payment-proofs bucket.
function proofPath(url: string): string | null {
  const marker = "/payment-proofs/";
  const i = url.indexOf(marker);
  let p = i >= 0 ? url.slice(i + marker.length) : url.replace(/^payment-proofs\//, "");
  p = p.split("?")[0];
  if (!p || p.includes("..") || /^https?:/.test(p)) return null;
  return decodeURIComponent(p);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Server-side scan of stored payments: reads each proof itself and saves the result,
// so the auto-verify trigger can run. Callers can only trigger scans, never set results.
async function scanStoredPayments(body: any) {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 50) : []);
  const paymentIds = ids(body.payment_ids);
  const invoiceIds = ids(body.invoice_ids);
  if (!paymentIds.length && !invoiceIds.length) return json({ error: "payment_ids or invoice_ids required" }, 400);

  let q = admin.from("payments")
    .select("id, amount, payment_method, proof_of_payment_url, verification_status, is_verified, proof_scan_status, invoice_id")
    .is("proof_scan_status", null)
    .eq("is_verified", false)
    .not("proof_of_payment_url", "is", null)
    .not("payment_method", "in", "(cash,credit)");
  q = paymentIds.length ? q.in("id", paymentIds) : q.in("invoice_id", invoiceIds);
  const { data: rows, error } = await q;
  if (error) return json({ error: error.message }, 400);

  // One screenshot can cover several invoices (Pay all): compare against the combined amount.
  const groups = new Map<string, any[]>();
  for (const r of rows || []) {
    if (r.verification_status === "rejected") continue;
    const k = r.proof_of_payment_url as string;
    groups.set(k, [...(groups.get(k) || []), r]);
  }

  const results: Record<string, ScanStatus> = {};
  for (const [url, group] of groups) {
    const total = Number(group.reduce((s, r) => s + Number(r.amount || 0), 0).toFixed(2));
    const { data: inv } = await admin.from("invoices").select("branch_id").eq("id", group[0].invoice_id).maybeSingle();
    const { data: br } = inv?.branch_id ? await admin.from("branches").select("country").eq("id", inv.branch_id).maybeSingle() : { data: null };
    const country = (br as any)?.country;
    const currency = String(country || "").toLowerCase().startsWith("aus") ? "AUD" : "SGD";
    let out: ScanOut;
    const path = proofPath(url);
    const { data: file } = path ? await admin.storage.from("payment-proofs").download(path) : { data: null };
    if (!file) out = unread("proof_not_found");
    else if (!file.type?.startsWith("image/")) out = unread("not_image");
    else if (file.size > MAX_IMAGE_BYTES) out = unread("image_too_large");
    else {
      const dataUrl = `data:${file.type};base64,${toBase64(new Uint8Array(await file.arrayBuffer()))}`;
      out = await scanImage(dataUrl, total, currency);
    }
    for (const r of group) {
      await admin.from("payments").update({
        proof_scan_status: out.status,
        proof_scan_amount: out.amount,
        proof_scan_details: { ...out.details, source: "server_scan", group_size: group.length },
      }).eq("id", r.id).is("proof_scan_status", null);
      results[r.id] = out.status;
    }
  }
  return json({ scanned: results });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => null);
    if (body && (body.payment_ids || body.invoice_ids)) return await scanStoredPayments(body);
    const imageDataUrl: string | undefined = body?.image_data_url;
    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return json({ error: "image_data_url (data:image/...) required" }, 400);
    }
    const currency: string = typeof body?.currency === "string" ? body.currency : "SGD";
    return json(await scanImage(imageDataUrl, Number(body?.expected_amount), currency));
  } catch (error) {
    console.error("[scan-payment-proof] error", error);
    return unreadable("exception");
  }
});
