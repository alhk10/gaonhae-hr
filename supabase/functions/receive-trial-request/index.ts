import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-site-secret, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Website slug -> branch id
const BRANCHES: Record<string, string> = {
  'balmoral': 'balmoral',
  'jurong-west': 'jurong-west',
  'kembangan-plaza': 'kembangan',
  'yishun': 'yishun',
  'bukit-merah': 'bukit-merah',
  'morley': 'BR1768967806476',
  'greenwood': 'greenwood',
  'floreat': 'floreat',
  'yokine': 'yokine',
};

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const Body = z.object({
  branch_slug: z.string().trim().toLowerCase().refine((s) => s in BRANCHES, 'Unknown branch'),
  contact_name: z.string().trim().min(1).max(120),
  contact_email: z.string().trim().toLowerCase().email().max(255),
  contact_phone: z.string().trim().min(6).max(30).regex(/^[+0-9 ()-]+$/, 'Invalid phone'),
  participant_name: z.string().trim().min(1).max(120),
  participant_dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((s) => {
    const d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d < new Date() && d.getUTCFullYear() > 1920;
  }, 'Invalid date'),
  remarks: opt(2000),
  source: opt(100),
});

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('WEBSITE_TRIAL_SECRET');
  const given = req.headers.get('x-site-secret') || '';
  if (!expected || !safeEqual(given, expected)) return json({ error: 'Unauthorized' }, 401);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const d = parsed.data;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.from('trial_requests').insert({
    branch_id: BRANCHES[d.branch_slug],
    contact_name: d.contact_name.toUpperCase(),
    contact_email: d.contact_email,
    contact_phone: d.contact_phone,
    participant_name: d.participant_name.toUpperCase(),
    participant_dob: d.participant_dob,
    remarks: d.remarks,
    source: d.source,
  }).select('id').single();
  if (error) { console.error('insert failed', error.message); return json({ error: 'Could not save request' }, 500); }
  return json({ ok: true, id: data.id });
});
