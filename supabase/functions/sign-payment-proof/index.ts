// Signs private payment-proof paths for the public /access lists.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ALLOWED = /^(public-hello|public-fees|public-grading|public-competition|public-guards|competition)\/[\w\-./]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { paths } = await req.json();
    if (!Array.isArray(paths) || paths.length > 200) throw new Error("Invalid paths");
    const clean = [...new Set(paths.filter((p) => typeof p === "string" && ALLOWED.test(p) && !p.includes("..")))];
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const urls: Record<string, string> = {};
    if (clean.length) {
      const { data, error } = await admin.storage.from("payment-proofs").createSignedUrls(clean, 3600);
      if (error) throw error;
      for (const d of data || []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
    }
    return new Response(JSON.stringify({ urls }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
