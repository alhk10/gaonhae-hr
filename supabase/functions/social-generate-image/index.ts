// Social Media — AI Image Generation from Caricature reference (Lovable AI Gateway, Nano Banana)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Body {
  branch: string;
  caricature_id: string;
  prompt: string;
  aspect_ratio?: "1:1" | "4:5" | "9:16";
  post_id?: string | null;
}

const ASPECT_HINT: Record<string, string> = {
  "1:1": "Square 1:1 composition (Instagram feed).",
  "4:5": "Portrait 4:5 composition (Instagram feed portrait).",
  "9:16": "Vertical 9:16 composition (Reels / Stories / TikTok).",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured" });

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user?.email) return json(401, { error: "Unauthorized" });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isSuper } = await admin.rpc("is_superadmin", { user_email: userData.user.email });
    if (!isSuper) return json(403, { error: "Superadmin only" });

    const body = (await req.json()) as Body;
    if (!body.branch || !body.caricature_id || !body.prompt) {
      return json(400, { error: "branch, caricature_id and prompt are required" });
    }
    const aspect = body.aspect_ratio ?? "1:1";

    // Load caricature
    const { data: caricature, error: cErr } = await admin
      .from("sm_caricatures")
      .select("*")
      .eq("id", body.caricature_id)
      .maybeSingle();
    if (cErr || !caricature) return json(404, { error: "Caricature not found" });

    // Load brand voice
    const { data: brand } = await admin
      .from("sm_brand_settings")
      .select("*")
      .eq("branch_name", body.branch)
      .maybeSingle();

    const tone = brand?.tone_of_voice ?? "Encouraging, family-friendly, professional martial-arts coaching.";
    const audience = brand?.target_audience ?? "Parents and students of a Taekwondo school.";

    const composedPrompt = [
      `Use the provided reference image as the main character/style anchor — keep the same caricature/illustration style, character design, colours and proportions.`,
      caricature.description ? `Character/style brief: ${caricature.description}` : null,
      `Scene to depict: ${body.prompt}`,
      `Brand voice for visual tone: ${tone} Audience: ${audience}.`,
      `Hard rules: family-friendly, positive, taekwondo-appropriate. No violence, no aggressive expressions, no political or controversial content. No text or logos in the image.`,
      ASPECT_HINT[aspect],
    ].filter(Boolean).join("\n");

    // Call Lovable AI Gateway — Nano Banana edit-image
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: composedPrompt },
              { type: "image_url", image_url: { url: caricature.image_url } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (aiResp.status === 429) return json(429, { error: "Rate limited. Try again shortly." });
    if (aiResp.status === 402) return json(402, { error: "AI credits exhausted. Add credits in Workspace Settings." });
    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, text);
      return json(500, { error: `AI gateway error (${aiResp.status})` });
    }

    const aiJson = await aiResp.json();
    const dataUrl = aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      console.error("No image returned:", JSON.stringify(aiJson).slice(0, 500));
      return json(500, { error: "AI did not return an image" });
    }

    // Decode base64 -> Uint8Array
    const commaIdx = dataUrl.indexOf(",");
    const meta = dataUrl.slice(5, commaIdx); // e.g. "image/png;base64"
    const mime = meta.split(";")[0] || "image/png";
    const ext = mime.split("/")[1] || "png";
    const b64 = dataUrl.slice(commaIdx + 1);
    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Upload to social-media bucket
    const safeBranch = body.branch.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const path = `ai-generated/${safeBranch}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage.from("social-media").upload(path, binary, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      console.error("Upload error:", upErr);
      return json(500, { error: `Upload failed: ${upErr.message}` });
    }
    const { data: pub } = admin.storage.from("social-media").getPublicUrl(path);

    // Audit log
    await admin.from("sm_ai_generations").insert({
      post_id: body.post_id ?? null,
      branch_name: body.branch,
      mode: "image",
      prompt: { prompt: composedPrompt, caricature_id: body.caricature_id, aspect_ratio: aspect },
      response: { url: pub.publicUrl, path },
      model: "google/gemini-2.5-flash-image",
      tokens_used: aiJson?.usage?.total_tokens ?? null,
      created_by: userData.user.email,
    });

    return json(200, { url: pub.publicUrl, path, mime });
  } catch (e) {
    console.error("social-generate-image error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
