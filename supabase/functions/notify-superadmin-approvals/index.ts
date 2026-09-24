import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: state } = await supabase.from("superadmin_alert_state").select("token").eq("id", 1).single();
    const provided = req.headers.get("x-alert-token");
    if (!state?.token || provided !== state.token) return json({ error: "Forbidden" }, 403);

    let kind = "verification";
    try { kind = (await req.json())?.kind === "approval" ? "approval" : "verification"; } catch { /* ignore */ }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@gaonhae.com";
    if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys not configured" }, 500);

    const { data: counts, error: cErr } = await supabase.rpc("superadmin_pending_counts");
    if (cErr) return json({ error: cErr.message }, 500);
    const approvals = Number((counts as any)?.approvals ?? 0);
    const verifications = Number((counts as any)?.verifications ?? 0);

    const { data: admins } = await supabase.from("superadmin_users").select("employee_email").eq("is_active", true);
    const emails = (admins ?? []).map((a: any) => String(a.employee_email).toLowerCase());
    if (!emails.length) return json({ sent: 0 });

    const { data: emps } = await supabase.from("employees").select("id, email");
    const empIds = (emps ?? []).filter((e: any) => e.email && emails.includes(String(e.email).toLowerCase())).map((e: any) => e.id);
    if (!empIds.length) return json({ sent: 0 });

    const { data: subs } = await supabase.from("notification_subscriptions").select("*").in("employee_id", empIds);
    if (!subs?.length) return json({ sent: 0 });

    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
    const payload = JSON.stringify({
      title: kind === "approval" ? "New approval request" : "New payment to verify",
      body: `${plural(approvals, "approval")} and ${plural(verifications, "verification")} waiting`,
      icon: "/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png",
      badge: "/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png",
      url: "/",
      tag: "superadmin-approvals",
      renotify: true,
      data: { template_key: "superadmin_approvals" },
    });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++;
      } catch (e: any) {
        console.error("push failed", e?.statusCode, e?.message);
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("notification_subscriptions").delete().eq("id", s.id);
        }
      }
    }
    return json({ sent, approvals, verifications });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
