// Device-facing: fetch queued outbound SMS and mark them as 'sending'.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const raw = auth.replace('Bearer ', '');
    const hash = await sha256Hex(raw);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: device } = await admin
      .from('sms_devices')
      .select('id, active, send_delay_ms, poll_interval_seconds')
      .eq('token_hash', hash)
      .maybeSingle();
    if (!device || !device.active) {
      return new Response(JSON.stringify({ error: 'Invalid device token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('sms_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100);

    // Fetch queued rows due to send
    const { data: rows, error } = await admin
      .from('sms_outbound')
      .select('id, phone, body, campaign_id')
      .eq('status', 'queued')
      .lte('send_at', new Date().toISOString())
      .order('send_at', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await admin
        .from('sms_outbound')
        .update({ status: 'sending', device_id: device.id })
        .in('id', ids);
    }

    return new Response(
      JSON.stringify({
        send_delay_ms: device.send_delay_ms,
        poll_interval_seconds: device.poll_interval_seconds,
        messages: rows ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
