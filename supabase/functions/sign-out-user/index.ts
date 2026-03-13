import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// One-time function to sign out superadmin from all sessions
const TARGET_USER_ID = "7b2e253e-24f2-4981-9007-326cb585ce40";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Use GoTrue Admin API to sign out user from all sessions
    // POST /auth/v1/admin/users/{user_id}/logout with scope=global
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

    const logoutStatus = logoutRes.status;
    let logoutBody: any = null;
    try { logoutBody = await logoutRes.json(); } catch { logoutBody = await logoutRes.text(); }

    console.log(`Logout API response: status=${logoutStatus}, body=${JSON.stringify(logoutBody)}`);

    if (logoutStatus >= 200 && logoutStatus < 300) {
      return new Response(JSON.stringify({ 
        success: true, 
        userId: TARGET_USER_ID, 
        message: "Superadmin signed out from all sessions globally",
        apiStatus: logoutStatus
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If the logout endpoint doesn't exist, try alternative approach
    // Delete all refresh tokens by updating user to force re-auth
    console.log('Logout endpoint failed, trying user update approach...');
    
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${TARGET_USER_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Ban briefly then unban to invalidate all sessions
          ban_duration: '1s',
        }),
      }
    );

    const updateStatus = updateRes.status;
    const updateBody = await updateRes.json();
    console.log(`Ban response: status=${updateStatus}`);

    // Immediately unban
    if (updateStatus >= 200 && updateStatus < 300) {
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
          body: JSON.stringify({
            ban_duration: 'none',
          }),
        }
      );
      
      const unbanStatus = unbanRes.status;
      console.log(`Unban response: status=${unbanStatus}`);

      return new Response(JSON.stringify({ 
        success: true, 
        userId: TARGET_USER_ID, 
        message: "Superadmin banned briefly and unbanned to invalidate all sessions",
        banStatus: updateStatus,
        unbanStatus: unbanStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: "All approaches failed",
      logoutStatus,
      logoutBody,
      updateStatus,
      updateBody,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
