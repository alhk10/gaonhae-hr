import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// One-time function to sign out a specific superadmin user
// This function should be deleted after use
const TARGET_USER_ID = "7b2e253e-24f2-4981-9007-326cb585ce40";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await adminClient.auth.admin.signOut(TARGET_USER_ID, 'global');
    
    if (error) {
      console.error('Sign out error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully signed out user ${TARGET_USER_ID} from all sessions`);
    return new Response(JSON.stringify({ 
      success: true, 
      userId: TARGET_USER_ID, 
      message: "Superadmin signed out from all sessions globally" 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
