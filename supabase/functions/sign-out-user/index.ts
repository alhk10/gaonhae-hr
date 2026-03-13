import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_USER_ID = "7b2e253e-24f2-4981-9007-326cb585ce40";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Try the admin logout endpoint
    const logoutRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${TARGET_USER_ID}/logout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope: 'global' }),
      }
    );

    const logoutText = await logoutRes.text();
    console.log(`Logout: status=${logoutRes.status}, body=${logoutText}`);

    if (logoutRes.status >= 200 && logoutRes.status < 300) {
      return new Response(JSON.stringify({ 
        success: true, userId: TARGET_USER_ID, 
        message: "Signed out from all sessions",
        status: logoutRes.status
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fallback: ban briefly then unban
    console.log('Logout endpoint unavailable, using ban/unban approach...');
    
    const banRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${TARGET_USER_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ban_duration: '1s' }),
      }
    );
    const banText = await banRes.text();
    console.log(`Ban: status=${banRes.status}`);

    // Wait 2s then unban
    await new Promise(r => setTimeout(r, 2000));
    
    const unbanRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${TARGET_USER_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ban_duration: 'none' }),
      }
    );
    const unbanText = await unbanRes.text();
    console.log(`Unban: status=${unbanRes.status}`);

    return new Response(JSON.stringify({ 
      success: banRes.ok, 
      userId: TARGET_USER_ID, 
      message: "User banned briefly then unbanned to invalidate sessions",
      banStatus: banRes.status,
      unbanStatus: unbanRes.status,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
