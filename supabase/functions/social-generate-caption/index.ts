// Social Media — Multi-platform AI Caption Generator (Lovable AI Gateway)
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

type Platform = "instagram" | "facebook" | "tiktok";

interface Body {
  branch: string;
  content_type: string;
  platforms: Platform[];
  event_name?: string;
  student_name?: string;
  instructor_name?: string;
  notes_for_ai?: string;
  tags?: string[];
  mode?: string;
  refine_platform?: Platform;
  current_caption?: string;
  post_id?: string;
}

const PLATFORM_RULES: Record<Platform, string> = {
  instagram:
    "Instagram feed/reel: caption up to 2200 chars but punchy hook in first line; 15-25 hashtags (no '#' prefix in array); friendly emoji per brand style; CTA can include 'link in bio' or 'DM us'.",
  facebook:
    "Facebook: longer-form storytelling allowed (up to 5000 chars), conversational tone, 3-5 broad hashtags only, links are welcome in CTA, fewer emojis than Instagram.",
  tiktok:
    "TikTok: VERY short hook-first caption max 150 chars, 4-6 trending hashtags (no '#' prefix), no external links, energetic playful tone, overlay_text should be a punchy on-screen line.",
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
    if (!body.branch || !body.content_type) return json(400, { error: "branch and content_type required" });
    let platforms: Platform[] = Array.isArray(body.platforms) && body.platforms.length
      ? body.platforms
      : ["instagram"];
    // If we're refining, only regenerate that one platform
    if (body.refine_platform && body.mode && body.mode !== "initial" && body.mode !== "tone-test") {
      platforms = [body.refine_platform];
    }

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
    const cta = brand?.cta_style ?? "Encourage a free trial booking via DM.";

    const modeInstruction =
      body.mode === "shorter" ? "Rewrite the previous caption to be noticeably SHORTER while keeping the message."
      : body.mode === "professional" ? "Rewrite to sound MORE PROFESSIONAL and refined."
      : body.mode === "exciting" ? "Rewrite to sound MORE EXCITING and energetic, while staying tasteful."
      : body.mode === "family-friendly" ? "Rewrite to sound MORE FAMILY-FRIENDLY, warm, and welcoming."
      : body.mode === "tone-test" ? "Generate a brand-voice example caption from the notes provided."
      : "Generate a fresh caption from scratch.";

    const platformInstructions = platforms
      .map((p) => `- ${p.toUpperCase()}: ${PLATFORM_RULES[p]}`)
      .join("\n");

    const system = [
      `You are a social media manager for a Taekwondo school in ${body.branch}.`,
      `Brand tone: ${tone}`,
      `Audience: ${audience}`,
      `Brand keywords to weave in when natural: ${keywords}`,
      `Banned words / phrases (NEVER use): ${banned}`,
      `Emoji usage: ${emojiStyle}.`,
      `Default CTA style: ${cta}`,
      `Hard rules: family-friendly, positive reinforcement, professional martial-arts tone, NO aggressive or spammy language, NO political or controversial content, reinforce discipline and confidence.`,
      `You are writing for these platforms — produce a TAILORED variant for each, following each platform's rules:`,
      platformInstructions,
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
        ? `Previous caption (for ${body.refine_platform ?? "the post"}) to rewrite:\n${body.current_caption}` : null,
      `Default hashtags to consider: ${defaultTags.join(", ") || "(none preset)"}.`,
    ].filter(Boolean).join("\n");

    // Build a tool schema dynamically with one property per platform
    const platformSchema = {
      type: "object",
      properties: {
        caption: { type: "string" },
        cta: { type: "string" },
        hashtags: { type: "array", items: { type: "string" }, description: "No '#' prefix." },
        overlay_text: { type: "string" },
        reel_title: { type: "string" },
      },
      required: ["caption", "cta", "hashtags", "overlay_text", "reel_title"],
      additionalProperties: false,
    };

    const properties: Record<string, unknown> = {};
    for (const p of platforms) properties[p] = platformSchema;

    const tools = [{
      type: "function",
      function: {
        name: "emit_captions",
        description: "Return a tailored caption package per requested platform.",
        parameters: {
          type: "object",
          properties,
          required: platforms,
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
        tool_choice: { type: "function", function: { name: "emit_captions" } },
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

    // Normalize each platform payload
    for (const p of platforms) {
      const v = parsed[p] ?? {};
      v.hashtags = (v.hashtags ?? []).map((h: string) => String(h).replace(/^#/, "").trim()).filter(Boolean);
      v.caption = v.caption ?? "";
      v.cta = v.cta ?? "";
      v.overlay_text = v.overlay_text ?? "";
      v.reel_title = v.reel_title ?? "";
      parsed[p] = v;
    }

    // Audit log
    await admin.from("sm_ai_generations").insert({
      post_id: body.post_id ?? null,
      branch_name: body.branch,
      mode: body.mode ?? "initial",
      prompt: { system, user: userPrompt, platforms },
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
