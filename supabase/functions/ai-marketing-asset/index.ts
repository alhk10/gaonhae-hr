// AI marketing asset generator for /access AI Document tab (Lovable AI Gateway).
// Public function guarded by the same admin passwords used by the /access page.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_PASSWORDS = ["Hp84311884", "Hp97533488"];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface RefImage {
  dataUrl?: string;
  note?: string;
}

interface Body {
  password?: string;
  mode?: "copy" | "image";
  format?: "poster" | "square" | "reel";
  prompt?: string;
  model?: string;
  baseImage?: string;
  references?: RefImage[];
  details?: Record<string, string | undefined>;
}

const SIZE_BY_FORMAT: Record<string, string> = {
  poster: "1024x1536",
  square: "1024x1024",
  reel: "1024x1536",
};

const ALLOWED_IMAGE_MODELS = [
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
  "google/gemini-3.1-flash-image",
  "google/gemini-3-pro-image",
];

// Model used when image input (base image / references) is supplied.
const EDIT_MODEL = "google/gemini-3.1-flash-image";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY is not configured" });

    const body = (await req.json()) as Body;
    if (!body.password || !ADMIN_PASSWORDS.includes(body.password)) {
      return json(401, { error: "Unauthorized" });
    }
    const mode = body.mode ?? "copy";

    if (mode === "copy") {
      const d = body.details ?? {};
      const facts = Object.entries(d)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            {
              role: "system",
              content:
                "You write marketing copy for Gaonhae Taekwondo, a premium but warm family-friendly Taekwondo school. " +
                "Tone: energetic, clear, encouraging, never cheesy. Keep the headline under 8 words. " +
                "Return ONLY valid JSON with keys: headline (string), subheadline (string), body (string, max 60 words), " +
                "caption (string, Instagram caption max 80 words), hashtags (array of 6-10 strings without the # symbol).",
            },
            {
              role: "user",
              content: `Create copy for this ${body.format ?? "poster"}.\n${facts}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return json(res.status, { error: text || "AI copy generation failed" });
      }
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "{}";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { headline: "", subheadline: "", body: raw, caption: raw, hashtags: [] };
      }
      return json(200, parsed);
    }

    // mode === "image" — stream the SSE body straight to the browser.
    if (!body.prompt) return json(400, { error: "prompt is required" });
    const size = SIZE_BY_FORMAT[body.format ?? "poster"] ?? "1024x1536";

    const references = (body.references ?? []).filter((r) => r?.dataUrl).slice(0, 3);
    const hasImageInput = Boolean(body.baseImage) || references.length > 0;

    let model = body.model && ALLOWED_IMAGE_MODELS.includes(body.model)
      ? body.model
      : "openai/gpt-image-2";
    // Image input is handled through the Gemini chat-shape image models.
    if (hasImageInput && model.startsWith("openai/")) model = EDIT_MODEL;

    let requestBody: Record<string, unknown>;

    if (model.startsWith("openai/")) {
      requestBody = {
        model,
        prompt: body.prompt,
        size,
        quality: "low",
        n: 1,
        stream: true,
        partial_images: 1,
      };
    } else {
      const content: Record<string, unknown>[] = [{ type: "text", text: body.prompt }];
      if (body.baseImage) {
        content.push({
          type: "text",
          text: "The following image is the existing artwork. Modify only what the instruction asks for and keep everything else identical.",
        });
        content.push({ type: "image_url", image_url: { url: body.baseImage } });
      }
      references.forEach((r, i) => {
        content.push({
          type: "text",
          text: `Reference image ${i + 1}${r.note ? ` — ${r.note}` : ""}. Use it as visual guidance only; keep the Gaonhae house style.`,
        });
        content.push({ type: "image_url", image_url: { url: r.dataUrl } });
      });
      requestBody = {
        model,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
        stream: true,
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      return json(res.status || 500, { error: text || "AI image generation failed" });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || "Unexpected error" });
  }
});
