// Social Media — AI Caption Generator (Lovable AI Gateway)
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
  content_type: string;
  event_name?: string;
  student_name?: string;
  instructor_name?: string;
  notes_for_ai?: string;
  tags?: string[];
  mode?: string;
  current_caption?: string;
  post_id?: string;
}

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
    if (!body.branch || !body.content_type) return json(400, { error: "branch and content_type required" });

    // Load brand settings
    const { data: brand } = await admin
      .from("sm_brand_settings")
      .select("*")
      .eq("branch_name", body.branch)
      .maybeSingle();

    const tone = brand?.tone_of_voice ?? "Encouraging, family-friendly, professional martial-arts coaching tone.";
    const audience = brand?.target_audience ?? "Parents and students of a Taekwondo school.";
    const banned = (brand?.banned_words ?? []).join(", ") || "none";
    const keywords = (brand?.brand_keywords ?? []).join(", ") || "none";
    const defaultTags = (brand?.default_hashtags ?? []) as string[];
    const emojiStyle = brand?.emoji_style ?? "moderate";
    const length = brand?.preferred_caption_length ?? "medium";
    const cta = brand?.cta_style ?? "Encourage a free trial booking via DM.";

    const modeInstruction =
      body.mode === "shorter" ? "Rewrite the previous caption to be noticeably SHORTER while keeping the message."
      : body.mode === "professional" ? "Rewrite to sound MORE PROFESSIONAL and refined."
      : body.mode === "exciting" ? "Rewrite to sound MORE EXCITING and energetic, while staying tasteful."
      : body.mode === "family-friendly" ? "Rewrite to sound MORE FAMILY-FRIENDLY, warm, and welcoming."
      : body.mode === "tone-test" ? "Generate a brand-voice example caption from the notes provided."
      : "Generate a fresh caption from scratch.";

    const system = [
      `You are a social media manager for a Taekwondo school in ${body.branch}.`,
      `Brand tone: ${tone}`,
      `Audience: ${audience}`,
      `Brand keywords to weave in when natural: ${keywords}`,
      `Banned words / phrases (NEVER use): ${banned}`,
      `Emoji usage: ${emojiStyle}. Caption length target: ${length}.`,
      `Default CTA style: ${cta}`,
      `Hard rules: family-friendly, positive reinforcement, professional martial-arts tone, NO aggressive or spammy language, NO political or controversial content, reinforce discipline and confidence.`,
      modeInstruction,
    ].join("\n");

    const userPrompt = [
      `Content type: ${body.content_type}`,
      body.event_name && `Event: ${body.event_name}`,
      body.student_name && `Student: ${body.student_name}`,
      body.instructor_name && `Instructor: ${body.instructor_name}`,
      body.tags?.length && `Tags: ${body.tags.join(", ")}`,
      body.notes_for_ai && `Notes from staff: ${body.notes_for_ai}`,
      body.current_caption && body.mode && body.mode !== "initial" && body.mode !== "tone-test"
        ? `Previous caption to rewrite:\n${body.current_caption}` : null,
      `Default hashtags to consider including: ${defaultTags.join(", ") || "(none preset)"}.`,
      `Return 10-15 hashtags total in the hashtags array (no '#' prefix).`,
    ].filter(Boolean).join("\n");

    const tools = [{
      type: "function",
      function: {
        name: "emit_caption",
        description: "Return the structured Instagram caption package.",
        parameters: {
          type: "object",
          properties: {
            caption: { type: "string", description: "Main Instagram caption body." },
            cta: { type: "string", description: "Single-sentence call-to-action." },
            hashtags: { type: "array", items: { type: "string" }, description: "10-15 hashtags, no '#' prefix." },
            overlay_text: { type: "string", description: "Short overlay text for reels/videos. May be empty." },
            reel_title: { type: "string", description: "Short title for reels. May be empty." },
          },
          required: ["caption", "cta", "hashtags", "overlay_text", "reel_title"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "emit_caption" } },
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
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = null;
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
    }
    if (!parsed) {
      const text = aiJson?.choices?.[0]?.message?.content;
      if (text) try { parsed = JSON.parse(text); } catch { /* ignore */ }
    }
    if (!parsed) return json(500, { error: "AI did not return structured data" });

    parsed.hashtags = (parsed.hashtags ?? []).map((h: string) => String(h).replace(/^#/, "").trim()).filter(Boolean);
    parsed.caption = parsed.caption ?? "";
    parsed.cta = parsed.cta ?? "";
    parsed.overlay_text = parsed.overlay_text ?? "";
    parsed.reel_title = parsed.reel_title ?? "";

    // Audit log
    await admin.from("sm_ai_generations").insert({
      post_id: body.post_id ?? null,
      branch_name: body.branch,
      mode: body.mode ?? "initial",
      prompt: { system, user: userPrompt },
      response: parsed,
      model: "google/gemini-3-flash-preview",
      tokens_used: aiJson?.usage?.total_tokens ?? null,
      created_by: userData.user.email,
    });

    return json(200, parsed);
  } catch (e) {
    console.error("social-generate-caption error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
