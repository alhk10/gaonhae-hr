import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // This function only works with service role key
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace('Bearer ', '') || '';
    
    // Also accept the apikey header (which Supabase client sends)
    const apiKey = req.headers.get("apikey") || '';
    
    // For service-role access, check if the apikey is the service role key
    if (token !== SERVICE_ROLE_KEY && apiKey !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden: service role key required" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await adminClient.auth.admin.signOut(userId, 'global');
    
    if (error) {
      console.error('Sign out error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully signed out user ${userId} from all sessions`);
    return new Response(JSON.stringify({ success: true, userId, message: "User signed out from all sessions" }), {
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
