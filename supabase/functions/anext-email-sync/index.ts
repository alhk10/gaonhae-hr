// Pulls ANEXT PayNow/FAST alerts from Gmail and reconciles them against pending SG payments.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseAnextAlert } from "./parse.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const SENDER = "noreply@cs.anext.com.sg";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    // Allowed callers: the scheduler (cron secret) or staff with the all-branch password.
    const given = req.headers.get("x-sync-token") || "";
    const { data: tok } = given ? await admin.from("bank_sync_state").select("sync_token").eq("source", "anext_email").maybeSingle() : { data: null };
    const isCron = !!tok?.sync_token && given.length > 20 && given === tok.sync_token;
    if (!isCron) {
      const pw = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
      const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { error } = await anon.rpc("access_bank_check", { p_password: pw });
      if (error) return json({ error: "All-branch password required" }, 403);
    }
    const lovable = Deno.env.get("LOVABLE_API_KEY"), gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!lovable || !gmailKey) return json({ error: "Gmail is not connected" }, 500);
    const headers = { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": gmailKey };

    const { data: state } = await admin.from("bank_sync_state").select("last_synced_at").eq("source", "anext_email").maybeSingle();
    const since = state?.last_synced_at ? new Date(state.last_synced_at).getTime() - 2 * 86400_000 : Date.now() - 14 * 86400_000;
    const q = `from:${SENDER} "You have received" after:${Math.floor(since / 1000)}`;

    const ids: string[] = [];
    let pageToken = "";
    for (let page = 0; page < 5; page++) {
      const r = await fetch(`${GATEWAY}/users/me/messages?maxResults=100&q=${encodeURIComponent(q)}${pageToken ? `&pageToken=${pageToken}` : ""}`, { headers });
      if (!r.ok) { const t = await r.text(); throw new Error(`Gmail list failed [${r.status}]: ${t.slice(0, 300)}`); }
      const d = await r.json();
      for (const m of d.messages ?? []) ids.push(m.id);
      if (!d.nextPageToken) break;
      pageToken = d.nextPageToken;
    }

    const { data: known } = ids.length ? await admin.from("bank_transactions").select("gmail_message_id").in("gmail_message_id", ids) : { data: [] };
    const seen = new Set((known ?? []).map((k: any) => k.gmail_message_id));
    const fresh = ids.filter((id) => !seen.has(id)).slice(0, 60);

    const results: Record<string, string> = {};
    for (const id of fresh) {
      const r = await fetch(`${GATEWAY}/users/me/messages/${id}?format=metadata&metadataHeaders=From&fields=id,snippet,payload/headers`, { headers });
      if (!r.ok) { console.error("gmail get", id, r.status, (await r.text()).slice(0, 200)); continue; }
      const m = await r.json();
      const from = (m.payload?.headers ?? []).find((h: any) => h.name === "From")?.value ?? "";
      if (!from.toLowerCase().includes(SENDER)) continue;
      const t = parseAnextAlert(m.snippet ?? "");
      if (!t) { results[id] = "unparsed"; continue; }
      const { data: row, error } = await admin.from("bank_transactions").upsert({
        gmail_message_id: id, txn_ref: t.txn_ref, amount: t.amount, currency: t.currency, received_at: t.received_at,
        payer_name: t.payer_name, account_last4: t.account_last4, method: t.method, raw_snippet: String(m.snippet).slice(0, 500),
      }, { onConflict: "txn_ref", ignoreDuplicates: true }).select("id").maybeSingle();
      if (error) { console.error("insert", error.message); continue; }
      if (!row) { results[id] = "duplicate"; continue; }
      const { data: status } = await admin.rpc("reconcile_bank_transaction", { p_txn_id: row.id });
      results[id] = String(status);
    }

    // Retry earlier unmatched/review rows: proofs uploaded after the bank email can now match.
    const { data: open } = await admin.from("bank_transactions").select("id").in("status", ["unmatched", "review"])
      .gte("received_at", new Date(Date.now() - 14 * 86400_000).toISOString()).limit(200);
    let rematched = 0;
    for (const o of open ?? []) {
      const { data: s } = await admin.rpc("reconcile_bank_transaction", { p_txn_id: o.id });
      if (s === "matched") rematched++;
    }

    await admin.from("bank_sync_state").upsert({ source: "anext_email", last_synced_at: new Date().toISOString(), last_error: null, last_count: fresh.length });
    return json({ scanned: ids.length, new: fresh.length, rematched, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[anext-email-sync]", msg);
    await admin.from("bank_sync_state").upsert({ source: "anext_email", last_error: msg.slice(0, 500) });
    return json({ error: msg }, 500);
  }
});
