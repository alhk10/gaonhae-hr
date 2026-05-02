import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedData {
  name?: string;
  id_number?: string;
  date_of_birth?: string;
  expiry_date?: string;
  document_kind?: string;
  level?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: doc, error: docErr } = await admin
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) throw new Error(docErr?.message || "Document not found");

    // Download the file as a signed URL we can fetch from the AI gateway
    const { data: signed, error: signErr } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 600);
    if (signErr) throw signErr;

    let extracted: ExtractedData = {};

    if (lovableKey) {
      try {
        // Fetch the file and convert to base64 data URL for image input
        const fileResp = await fetch(signed.signedUrl);
        const buf = new Uint8Array(await fileResp.arrayBuffer());
        const mime = doc.file_mime || fileResp.headers.get("content-type") || "image/jpeg";
        const isImage = mime.startsWith("image/");

        if (isImage) {
          const base64 = btoa(String.fromCharCode(...buf));
          const dataUrl = `data:${mime};base64,${base64}`;

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "Extract identity / certificate data from the provided document image. Use the extract_document_data tool. If a field is not visible, omit it.",
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Extract the data from this document." },
                    { type: "image_url", image_url: { url: dataUrl } },
                  ],
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_document_data",
                    description: "Return structured fields extracted from a document.",
                    parameters: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Full legal name on the document" },
                        id_number: { type: "string", description: "NRIC/FIN/passport/certificate number" },
                        date_of_birth: { type: "string", description: "DOB in YYYY-MM-DD if visible" },
                        expiry_date: { type: "string", description: "Expiry in YYYY-MM-DD if visible" },
                        document_kind: { type: "string", description: "What kind of document this is" },
                        level: { type: "string", description: "Dan/Poom/rank/level if applicable" },
                      },
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_document_data" } },
            }),
          });

          if (aiResp.ok) {
            const json = await aiResp.json();
            const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
            if (args) {
              try {
                extracted = JSON.parse(args);
              } catch (_) {}
            }
          } else {
            console.warn("AI extraction failed:", aiResp.status, await aiResp.text());
          }
        }
      } catch (e) {
        console.warn("AI vision step skipped:", e);
      }
    }

    // Match against students then employees
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    let suggestion: any = null;
    let confidence = 0;

    const idNumNorm = extracted.id_number ? norm(extracted.id_number) : "";
    const nameNorm = extracted.name ? norm(extracted.name) : "";
    const dob = extracted.date_of_birth || null;

    // Try exact ID match on students
    if (idNumNorm) {
      const { data: students } = await admin
        .from("students")
        .select("id, first_name, last_name, nric, date_of_birth, branch_id")
        .limit(2000);
      const hit = (students || []).find((s: any) => s.nric && norm(s.nric) === idNumNorm);
      if (hit) {
        suggestion = {
          type: "student",
          id: hit.id,
          name: `${hit.first_name ?? ""} ${hit.last_name ?? ""}`.trim(),
          branch_id: hit.branch_id,
        };
        confidence = 0.98;
      }
    }

    // Try exact ID match on employees
    if (!suggestion && idNumNorm) {
      const { data: employees } = await admin
        .from("employees")
        .select("id, name, display_name, nric, date_of_birth")
        .limit(2000);
      const hit = (employees || []).find((e: any) => e.nric && norm(e.nric) === idNumNorm);
      if (hit) {
        suggestion = {
          type: "employee",
          id: hit.id,
          name: hit.display_name || hit.name,
          branch_id: null,
        };
        confidence = 0.98;
      }
    }

    // Fuzzy name + DOB on students
    if (!suggestion && nameNorm) {
      const { data: students } = await admin
        .from("students")
        .select("id, first_name, last_name, date_of_birth, branch_id")
        .limit(2000);
      let best: any = null;
      let bestScore = 0;
      for (const s of students || []) {
        const full = norm(`${s.first_name ?? ""}${s.last_name ?? ""}`);
        if (!full) continue;
        let score = 0;
        if (full === nameNorm) score = 0.85;
        else if (full.includes(nameNorm) || nameNorm.includes(full)) score = 0.7;
        if (dob && s.date_of_birth === dob) score += 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = s;
        }
      }
      if (best && bestScore >= 0.7) {
        suggestion = {
          type: "student",
          id: best.id,
          name: `${best.first_name ?? ""} ${best.last_name ?? ""}`.trim(),
          branch_id: best.branch_id,
        };
        confidence = bestScore;
      }
    }

    // Fuzzy name on employees
    if (!suggestion && nameNorm) {
      const { data: employees } = await admin
        .from("employees")
        .select("id, name, display_name");
      let best: any = null;
      let bestScore = 0;
      for (const e of employees || []) {
        const full = norm(e.display_name || e.name || "");
        if (!full) continue;
        let score = 0;
        if (full === nameNorm) score = 0.85;
        else if (full.includes(nameNorm) || nameNorm.includes(full)) score = 0.7;
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
      if (best && bestScore >= 0.7) {
        suggestion = {
          type: "employee",
          id: best.id,
          name: best.display_name || best.name,
          branch_id: null,
        };
        confidence = bestScore;
      }
    }

    await admin
      .from("documents")
      .update({
        extracted_data: extracted,
        ai_suggestion: suggestion,
        match_confidence: confidence || null,
        match_status: suggestion ? "pending" : "unmatched",
      })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ extracted, suggestion, confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("documents-ai-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
