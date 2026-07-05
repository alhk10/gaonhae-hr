// Device-facing: log incoming SMS, threaded by phone.
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

function last8(p: string): string {
  const digits = p.replace(/\D/g, '');
  return digits.slice(-8);
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
    const phone = normalizePhone(String(body.phone ?? ''));
    const text = String(body.body ?? '');
    const receivedAt = body.received_at ? new Date(body.received_at).toISOString() : new Date().toISOString();
    if (!phone || !text) {
      return new Response(JSON.stringify({ error: 'phone and body required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort student match by last-8 digits
    let studentId: string | null = null;
    const tail = last8(phone);
    if (tail) {
      const { data: match } = await admin
        .from('students')
        .select('id, phone')
        .filter('phone', 'ilike', `%${tail}`)
        .limit(1)
        .maybeSingle();
      studentId = match?.id ?? null;
    }

    // Upsert thread
    const { data: existing } = await admin
      .from('sms_threads')
      .select('id, unread_count, student_id')
      .eq('phone', phone)
      .maybeSingle();

    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      const { data: created } = await admin
        .from('sms_threads')
        .insert({
          phone,
          student_id: studentId,
          last_message_at: receivedAt,
          last_direction: 'in',
          last_snippet: text.slice(0, 100),
          unread_count: 1,
        })
        .select('id')
        .single();
      threadId = created?.id;
    } else {
      await admin
        .from('sms_threads')
        .update({
          student_id: existing.student_id ?? studentId,
          last_message_at: receivedAt,
          last_direction: 'in',
          last_snippet: text.slice(0, 100),
          unread_count: (existing.unread_count ?? 0) + 1,
        })
        .eq('id', threadId);
    }

    if (threadId) {
      await admin.from('sms_messages').insert({
        thread_id: threadId,
        direction: 'in',
        phone,
        body: text,
        sent_at: receivedAt,
      });
    }

    await admin.from('sms_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);

    return new Response(JSON.stringify({ ok: true, thread_id: threadId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
