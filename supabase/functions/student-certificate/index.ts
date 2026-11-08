// Upload, scan (Lovable AI) and view STF / Kukkiwon Poom-Dan certificates.
// Callers prove access with an /access staff password (branch-scoped, checked in
// the database) or a validated /hello student session. Images stay private.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const MAX_BYTES = 6 * 1024 * 1024;
const RANKS = ['1st Poom', '2nd Poom', '3rd Poom', '4th Poom', '1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan'];
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean);

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['readable', 'issuer', 'name', 'rank', 'issue_date', 'certificate_number'],
  properties: {
    readable: { type: 'boolean' },
    issuer: { type: ['string', 'null'], description: 'Issuing organisation exactly as printed' },
    name: { type: ['string', 'null'], description: 'Holder name as printed' },
    rank: { type: ['string', 'null'], enum: [...RANKS, null] },
    issue_date: { type: ['string', 'null'], description: 'Date of Issue as YYYY-MM-DD' },
    certificate_number: { type: ['string', 'null'] },
  },
};

async function scan(image: string, key: string) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra', reasoning: { effort: 'low' },
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Read this Taekwondo Poom/Dan certificate (Singapore Taekwondo Federation or Kukkiwon). Return the issuing organisation, holder name, rank (e.g. "1st Dan", "2nd Poom"), Date of Issue (YYYY-MM-DD) and certificate number. Use null for anything you cannot read.' },
        { type: 'input_image', image_url: image },
      ] }],
      text: { format: { type: 'json_schema', name: 'certificate', strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok) { console.warn('scan failed', res.status, (await res.text()).slice(0, 300)); return null; }
  const j = await res.json();
  const text = j.output_text ?? j.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === 'output_text')?.text;
  try { return JSON.parse(text); } catch { return null; }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anonKey = Deno.env.get('SUPABASE_ANON_KEY')!, serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) return reply({ error: 'Certificate service unavailable' }, 503);
    const body = await req.json();
    const { action, student_id, access_password, session_id } = body;
    if (!/^[0-9a-f-]{36}$/i.test(student_id || '')) return reply({ error: 'Invalid student' }, 400);
    const client = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') || `Bearer ${anonKey}` } } });
    let viaHello = false;
    if (session_id) {
      const { data } = await client.rpc('_validate_public_chat_session', { p_session_id: session_id, p_student_id: student_id, p_branch_id: null });
      if (data !== true) return reply({ error: 'Invalid student session' }, 403);
      viaHello = true;
    } else {
      const { data } = await client.rpc('access_can_manage_student', { p_password: access_password || null, p_student_id: student_id });
      if (data !== true) return reply({ error: 'Not allowed for this student' }, 403);
    }
    const admin = createClient(url, serviceKey);

    if (action === 'sign') {
      const path = String(body.path || '');
      if (!path.startsWith(`${student_id}/`)) return reply({ error: 'Invalid file' }, 400);
      const { data } = await admin.storage.from('student-photos').createSignedUrl(path, 600);
      return reply({ url: data?.signedUrl || null });
    }
    if (action !== 'upload') return reply({ error: 'Unknown action' }, 400);

    const series = body.series === 'kukkiwon' ? 'kukkiwon' : 'stf';
    const image = String(body.image_data_url || '');
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
    if (!m) return reply({ error: 'Use a JPEG, PNG or WebP image' }, 400);
    const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    if (!bytes.length || bytes.length > MAX_BYTES) return reply({ error: 'Image must be smaller than 6 MB' }, 400);

    const { data: s } = await admin.from('students').select('first_name,last_name,certificate_name').eq('id', student_id).single();
    if (!s) return reply({ error: 'Student not found' }, 404);

    const path = `${student_id}/certificate-${series}-${crypto.randomUUID()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    const { error: upErr } = await admin.storage.from('student-photos').upload(path, bytes, { contentType: `image/${m[1]}` });
    if (upErr) return reply({ error: 'Certificate could not be uploaded' }, 500);

    const key = Deno.env.get('LOVABLE_API_KEY');
    const parsed = key ? await scan(image, key) : null;
    const issuer = String(parsed?.issuer || '');
    const issuerOk = series === 'stf' ? /singapore\s+taekwondo\s+federation/i.test(issuer) : /kukkiwon/i.test(issuer);
    const want = new Set([...norm(s.certificate_name || ''), ...norm(`${s.first_name || ''} ${s.last_name || ''}`)]);
    const got = norm(String(parsed?.name || ''));
    const hits = got.filter(t => want.has(t)).length;
    const nameOk = got.length > 0 && hits >= Math.min(2, got.length);
    const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed?.issue_date || '') ? parsed.issue_date : null;
    const rank = RANKS.includes(parsed?.rank) ? parsed.rank : (body.rank || null);
    const problems = [
      !parsed?.readable && 'Certificate could not be read',
      parsed?.readable && !issuerOk && (series === 'stf' ? 'Issuer is not Singapore Taekwondo Federation' : 'Issuer is not Kukkiwon'),
      parsed?.readable && !nameOk && 'Name does not match the student',
      parsed?.readable && !issueDate && 'Date of Issue not found',
    ].filter(Boolean);
    const autoVerify = !viaHello && problems.length === 0;
    const scanInfo = { ...(parsed || {}), issuer_ok: issuerOk, name_ok: nameOk, problems };

    const row = { series, rank, image_path: path, scan: scanInfo, issue_date: issueDate, status: autoVerify ? 'verified' : 'pending', source: viaHello ? 'hello' : 'staff', reviewed_at: autoVerify ? new Date().toISOString() : null, reviewed_by: autoVerify ? 'scan' : null };
    let id = body.certificate_id as string | undefined;
    if (id) {
      const { data: existing } = await admin.from('student_certificates').select('id,student_id,source').eq('id', id).single();
      if (!existing || existing.student_id !== student_id) return reply({ error: 'Certificate not found' }, 404);
      const { error } = await admin.from('student_certificates').update({ ...row, source: existing.source }).eq('id', id);
      if (error) return reply({ error: error.message }, 500);
    } else {
      const { data, error } = await admin.from('student_certificates').insert({ student_id, ...row }).select('id').single();
      if (error) return reply({ error: error.message }, 500);
      id = data.id;
    }
    if (autoVerify) await admin.rpc('_cert_apply', { p_id: id });
    return reply({ id, status: row.status, scan: scanInfo, issue_date: issueDate, rank });
  } catch (e) {
    console.error('student-certificate', e);
    return reply({ error: 'Certificate could not be processed' }, 500);
  }
});
