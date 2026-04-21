import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

function envFor(branchId: string, suffix: 'TOKEN' | 'ACCOUNT_ID') {
  const sanitized = branchId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const key = suffix === 'TOKEN' ? `IG_PAGE_TOKEN_${sanitized}` : `IG_ACCOUNT_ID_${sanitized}`;
  return Deno.env.get(key);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let postId: string | null = null;

  try {
    const body = await req.json();
    postId = body.post_id;
    if (!postId) {
      return new Response(JSON.stringify({ error: 'post_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: post, error: pErr } = await admin
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();
    if (pErr || !post) throw new Error('Post not found');

    if (!post.media_url) throw new Error('Post has no media');
    if (!['approved', 'scheduled', 'publishing'].includes(post.status)) {
      throw new Error(`Post status ${post.status} cannot be published`);
    }

    // Mark publishing
    await admin
      .from('social_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    const token = envFor(post.branch_id, 'TOKEN');
    const igUserId = envFor(post.branch_id, 'ACCOUNT_ID');

    if (!token || !igUserId) {
      const reason = `Instagram credentials not configured for branch ${post.branch_id}. Add IG_PAGE_TOKEN_${post.branch_id.toUpperCase()} and IG_ACCOUNT_ID_${post.branch_id.toUpperCase()} as Supabase secrets.`;
      await admin
        .from('social_posts')
        .update({ status: 'failed', failure_reason: reason })
        .eq('id', postId);
      return new Response(JSON.stringify({ success: false, message: reason }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullCaption = [post.caption, post.cta, (post.hashtags || []).join(' ')]
      .filter(Boolean)
      .join('\n\n');

    // Step 1 — create container
    const containerParams = new URLSearchParams({
      caption: fullCaption,
      access_token: token,
    });
    if (post.media_type === 'video') {
      containerParams.set('media_type', 'VIDEO');
      containerParams.set('video_url', post.media_url);
    } else {
      containerParams.set('image_url', post.media_url);
    }

    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
      method: 'POST',
      body: containerParams,
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      throw new Error(`Container creation failed: ${JSON.stringify(containerData)}`);
    }

    // Step 2 — publish
    const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: 'POST',
      body: new URLSearchParams({
        creation_id: containerData.id,
        access_token: token,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      throw new Error(`Publish failed: ${JSON.stringify(publishData)}`);
    }

    // Step 3 — fetch permalink
    const permaRes = await fetch(
      `${GRAPH_BASE}/${publishData.id}?fields=permalink&access_token=${token}`,
    );
    const permaData = await permaRes.json();

    await admin
      .from('social_posts')
      .update({
        status: 'published',
        instagram_media_id: publishData.id,
        instagram_permalink: permaData?.permalink || null,
        published_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq('id', postId);

    return new Response(
      JSON.stringify({ success: true, instagram_media_id: publishData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('publish error', e);
    const reason = e instanceof Error ? e.message : 'Unknown error';
    if (postId) {
      await admin
        .from('social_posts')
        .update({ status: 'failed', failure_reason: reason })
        .eq('id', postId);
    }
    return new Response(JSON.stringify({ success: false, error: reason }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
