// Device-facing: report per-message send status back to the server.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(p: string): string {
  return p.replace(/[^\d+]/g, '');
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
    const hash = await sha256Hex(auth.replace('Bearer ', ''));

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: device } = await admin
      .from('sms_devices')
      .select('id, active')
      .eq('token_hash', hash)
      .maybeSingle();
    if (!device || !device.active) {
      return new Response(JSON.stringify({ error: 'Invalid device token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const outboundId = body.outbound_id as string;
    const status = body.status as string; // 'sent' | 'failed' | 'delivered'
    const errorMsg = body.error as string | undefined;
    const deviceMessageId = body.device_message_id as string | undefined;

    if (!outboundId || !['sent', 'failed', 'delivered'].includes(status)) {
      return new Response(JSON.stringify({ error: 'invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: outbound } = await admin
      .from('sms_outbound')
      .select('id, phone, body, campaign_id, sent_at')
      .eq('id', outboundId)
      .maybeSingle();
    if (!outbound) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();
    await admin
      .from('sms_outbound')
      .update({
        status,
        error: errorMsg ?? null,
        device_message_id: deviceMessageId ?? null,
        sent_at: status === 'sent' || status === 'delivered' ? nowIso : outbound.sent_at,
      })
      .eq('id', outboundId);

    // Increment campaign counters
    if (outbound.campaign_id) {
      const field = status === 'failed' ? 'failed_count' : 'sent_count';
      const { data: c } = await admin
        .from('sms_campaigns')
        .select(`id, sent_count, failed_count, total_count`)
        .eq('id', outbound.campaign_id)
        .maybeSingle();
      if (c) {
        const nextSent = field === 'sent_count' ? c.sent_count + 1 : c.sent_count;
        const nextFailed = field === 'failed_count' ? c.failed_count + 1 : c.failed_count;
        const completed = nextSent + nextFailed >= c.total_count;
        await admin
          .from('sms_campaigns')
          .update({
            sent_count: nextSent,
            failed_count: nextFailed,
            status: completed ? 'completed' : 'sending',
          })
          .eq('id', c.id);
      }
    }

    // Insert into unified messages log (outbound direction) when sent
    if (status === 'sent' || status === 'delivered') {
      const phone = normalizePhone(outbound.phone);
      // upsert thread
      const { data: existingThread } = await admin
        .from('sms_threads')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      let threadId = existingThread?.id;
      if (!threadId) {
        const { data: created } = await admin
          .from('sms_threads')
          .insert({
            phone,
            last_message_at: nowIso,
            last_direction: 'out',
            last_snippet: outbound.body.slice(0, 100),
          })
          .select('id')
          .single();
        threadId = created?.id;
      } else {
        await admin
          .from('sms_threads')
          .update({
            last_message_at: nowIso,
            last_direction: 'out',
            last_snippet: outbound.body.slice(0, 100),
          })
          .eq('id', threadId);
      }

      if (threadId) {
        await admin.from('sms_messages').insert({
          thread_id: threadId,
          direction: 'out',
          phone,
          body: outbound.body,
          sent_at: nowIso,
          outbound_id: outbound.id,
          status,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
