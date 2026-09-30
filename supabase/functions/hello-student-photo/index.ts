import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const MAX_BYTES = 5 * 1024 * 1024;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return reply({ error: 'Photo service unavailable' }, 503);
    // Never trust the supplied student ID or a bearer token as proof of student identity.
    // The existing chat RPC checks the matched student of this session in the database.
    const { session_id, student_id, image_data_url, kind = 'photo' } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(session_id || '') || !/^[0-9a-f-]{36}$/i.test(student_id || '')) return reply({ error: 'Invalid student session' }, 400);
    if (kind !== 'photo' && kind !== 'certificate') return reply({ error: 'Invalid file type' }, 400);
    const column = kind === 'photo' ? 'passport_photo_url' : 'poom_dan_certificate_url';
    const client = createClient(url, anonKey);
    const { data: authorized, error: authError } = await client.rpc('_validate_public_chat_session', {
      p_session_id: session_id, p_student_id: student_id, p_branch_id: null,
    });
    if (authError || authorized !== true) return reply({ error: 'Invalid student session' }, 403);
    const admin = createClient(url, serviceKey);
    if (image_data_url !== undefined) {
      if (typeof image_data_url !== 'string' || image_data_url.length > MAX_BYTES * 1.4 + 256) return reply({ error: 'Photo must be smaller than 5 MB' }, 400);
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image_data_url);
      if (!match) return reply({ error: 'Use a JPEG, PNG or WebP image' }, 400);
      const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!bytes.length || bytes.length > MAX_BYTES || !(match[1] === 'jpeg' && jpeg || match[1] === 'png' && png || match[1] === 'webp' && webp)) return reply({ error: 'Invalid photo image' }, 400);
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const path = `${student_id}/${kind === 'photo' ? 'passport-photo' : 'poom-dan-certificate'}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await admin.storage.from('student-photos').upload(path, bytes, { contentType: `image/${match[1]}`, upsert: false });
      if (uploadError) return reply({ error: 'Photo could not be uploaded' }, 500);
      const { data: old, error: oldError } = await admin.from('students').select(column).eq('id', student_id).single();
      if (oldError) { await admin.storage.from('student-photos').remove([path]); return reply({ error: 'Student not found' }, 404); }
      // Recheck the session immediately before writing, to avoid a session reassignment race.
      const { data: stillAuthorized } = await client.rpc('_validate_public_chat_session', { p_session_id: session_id, p_student_id: student_id, p_branch_id: null });
      if (stillAuthorized !== true) { await admin.storage.from('student-photos').remove([path]); return reply({ error: 'Invalid student session' }, 403); }
      const { error: updateError } = await admin.from('students').update({ [column]: path, updated_at: new Date().toISOString() }).eq('id', student_id);
      if (updateError) { await admin.storage.from('student-photos').remove([path]); return reply({ error: 'Photo could not be saved' }, 500); }
      // Only remove an old image if it is an owned object in this bucket.
      const oldPath = String(old?.[column] || '').split('?')[0].split('/student-photos/').pop();
      if (oldPath?.startsWith(`${student_id}/`) && oldPath !== path) await admin.storage.from('student-photos').remove([oldPath]).catch(() => {});
    }
    const { data: student, error } = await admin.from('students').select(column).eq('id', student_id).single();
    if (error) return reply({ error: 'Student not found' }, 404);
    const stored = String(student?.[column] || '').split('?')[0];
    const path = stored.includes('/student-photos/') ? stored.split('/student-photos/').pop() : stored;
    if (!path?.startsWith(`${student_id}/`)) return reply({ photo_url: null });
    const { data: signed, error: signError } = await admin.storage.from('student-photos').createSignedUrl(path, 600);
    if (signError) return reply({ error: 'Photo could not be opened' }, 500);
    return reply({ photo_url: signed?.signedUrl || null });
  } catch (error) {
    console.error('hello-student-photo:', error);
    return reply({ error: 'Photo could not be processed' }, 500);
  }
});
