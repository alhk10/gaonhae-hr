// supabase/functions/auth-admin/index.ts
// Edge function to perform auth admin actions securely for superadmins only
// Actions supported:
// - check_user: { email }
// - update_email: { oldEmail, newEmail }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

type CheckUserBody = { action: "check_user"; email: string };
type UpdateEmailBody = { action: "update_email"; oldEmail: string; newEmail: string };

type Body = CheckUserBody | UpdateEmailBody;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Client with the caller's JWT to read user and check superadmin
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callerEmail = userData.user.email;
    const { data: isSuper, error: roleErr } = await userClient.rpc("is_superadmin", { user_email: callerEmail });
    if (roleErr) {
      return new Response(JSON.stringify({ error: "Role check failed", details: roleErr.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden: superadmin only" }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = (await req.json()) as Body;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (body.action === "check_user") {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // List users (first page, high perPage) and find by email
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const user = data.users.find((u: any) => (u.email || "").toLowerCase() === email);
      return new Response(
        JSON.stringify({
          exists: Boolean(user),
          userId: user?.id ?? null,
          confirmed: Boolean(user?.confirmed_at),
          createdAt: user?.created_at ?? null,
          lastSignInAt: user?.last_sign_in_at ?? null,
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        },
      );
    }

    if (body.action === "update_email") {
      const oldEmail = body.oldEmail?.trim().toLowerCase();
      const newEmail = body.newEmail?.trim().toLowerCase();
      if (!oldEmail || !newEmail) {
        return new Response(JSON.stringify({ error: "oldEmail and newEmail are required" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the user by old email
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const user = data.users.find((u: any) => (u.email || "").toLowerCase() === oldEmail);
      if (!user) {
        return new Response(JSON.stringify({ error: "Auth user not found for old email" }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updErr } = await adminClient.auth.admin.updateUserById(user.id, { email: newEmail });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, userId: user.id }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
