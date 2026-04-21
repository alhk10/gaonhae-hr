// CCTV Stream Token edge function
// Verifies caller has access to the requested camera's branch and returns a
// short-lived signed playback URL pointing at the self-hosted MediaMTX server.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { create, getNumericDate } from 'https://deno.land/x/[email protected]/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TokenRequest {
  camera_id: string;
  protocol?: 'hls' | 'webrtc';
  playback_start?: string; // ISO timestamp for VOD
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MEDIAMTX_BASE_URL = Deno.env.get('MEDIAMTX_BASE_URL') ?? '';
const MEDIAMTX_JWT_SECRET = Deno.env.get('MEDIAMTX_JWT_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    // Auth-bound client to identify caller
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResult, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userResult.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body: TokenRequest = await req.json();
    if (!body.camera_id) {
      return json({ error: 'camera_id required' }, 400);
    }

    // Service-role client for camera lookup (bypasses RLS but we still enforce branch access manually)
    const supabaseSrv = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: camera, error: camErr } = await supabaseSrv
      .from('cctv_cameras')
      .select('id, branch_id, mediamtx_path, supports_playback, is_active')
      .eq('id', body.camera_id)
      .maybeSingle();

    if (camErr || !camera) {
      return json({ error: 'Camera not found' }, 404);
    }
    if (!camera.is_active) {
      return json({ error: 'Camera disabled' }, 403);
    }

    // Enforce access: superadmin OR has_branch_access
    const { data: hasAccess, error: accessErr } = await supabaseAuth.rpc('has_branch_access', {
      p_branch_id: camera.branch_id,
    });
    if (accessErr || !hasAccess) {
      return json({ error: 'Access denied to this branch' }, 403);
    }

    if (!MEDIAMTX_BASE_URL || !MEDIAMTX_JWT_SECRET) {
      return json(
        {
          error: 'CCTV server not configured',
          message:
            'MEDIAMTX_BASE_URL and MEDIAMTX_JWT_SECRET secrets must be set before streams will play.',
        },
        503,
      );
    }

    // Build short-lived JWT (HS256) — MediaMTX validates it on the segment requests
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(MEDIAMTX_JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );

    const protocol = body.protocol ?? 'hls';
    const ttlSeconds = 5 * 60; // 5 min
    const claims = {
      sub: userResult.user.id,
      path: camera.mediamtx_path,
      action: protocol === 'webrtc' ? 'read' : 'read',
      exp: getNumericDate(ttlSeconds),
    };
    const token = await create({ alg: 'HS256', typ: 'JWT' }, claims, key);

    const base = MEDIAMTX_BASE_URL.replace(/\/$/, '');
    let url: string;
    if (protocol === 'webrtc') {
      url = `${base}/${camera.mediamtx_path}/whep?jwt=${token}`;
    } else if (body.playback_start && camera.supports_playback) {
      url = `${base}/playback/${camera.mediamtx_path}/index.m3u8?start=${encodeURIComponent(
        body.playback_start,
      )}&jwt=${token}`;
    } else {
      url = `${base}/${camera.mediamtx_path}/index.m3u8?jwt=${token}`;
    }

    return json({
      url,
      protocol,
      expires_in: ttlSeconds,
      camera_id: camera.id,
    });
  } catch (err) {
    console.error('cctv-stream-token error:', err);
    return json({ error: (err as Error).message ?? 'Unknown error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
