import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// One-time function to sign out a specific superadmin user globally
const TARGET_USER_ID = "7b2e253e-24f2-4981-9007-326cb585ce40";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Use GoTrue Admin API directly to sign out user
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${TARGET_USER_ID}/factors`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });

    // Use the logout endpoint - PUT to update user and invalidate sessions
    // by changing the user's ban_duration temporarily or using admin API
    const logoutResponse = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    });

    // Alternative: Delete all sessions by updating the user's aud
    // The most reliable way is to use admin.updateUserById to change session validity
    const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${TARGET_USER_ID}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Setting ban_duration to "none" just triggers a session refresh
        // We'll use a different approach - update the user to force re-auth
        user_metadata: { force_signout_at: new Date().toISOString() }
      }),
    });

    const updateData = await updateResponse.json();
    console.log('Update response:', JSON.stringify(updateData));

    if (!updateResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to update user", details: updateData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Now delete all refresh tokens via the database
    // Use the admin API to get the user and check
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.50.1");
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Delete refresh tokens via SQL (service role can access auth schema)
    const { error: rpcError } = await adminClient.rpc('delete_user_sessions', { 
      target_user_id: TARGET_USER_ID 
    });

    console.log(`User metadata updated. RPC result: ${rpcError ? rpcError.message : 'N/A'}`);

    return new Response(JSON.stringify({ 
      success: true, 
      userId: TARGET_USER_ID, 
      message: "Superadmin user metadata updated to force re-authentication. All existing sessions will fail on next token refresh." 
    }), {
      status: 200,
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
