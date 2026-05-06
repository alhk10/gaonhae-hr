// supabase/functions/auth-admin/index.ts
// Edge function to perform auth admin actions securely for superadmins only
// Actions supported:
// - check_user: { email }
// - check_user_exists: { email }
// - create_user: { email, name, employeeId, redirectTo? }
// - update_email: { oldEmail, newEmail }
// - updateUserEmail: { userId, email }
// - reset_password: { email, newPassword }
// - sign_out_user: { userId }
// - get_user_meta: { email }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    let isAuthorized = false;

    if (token === SERVICE_ROLE_KEY) {
      isAuthorized = true;
    } else {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      
      if (claimsErr || !claimsData?.claims?.email) {
        console.error('JWT validation failed:', claimsErr?.message || 'No email in claims');
        return new Response(JSON.stringify({ error: "Unauthorized", details: claimsErr?.message }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const callerEmail = claimsData.claims.email as string;
      const { data: isSuper, error: roleErr } = await userClient.rpc("is_superadmin", { user_email: callerEmail });
      if (roleErr) {
        return new Response(JSON.stringify({ error: "Role check failed", details: roleErr.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (!isSuper) {
        return new Response(JSON.stringify({ error: "Forbidden: superadmin only" }), { 
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // === check_user ===
    if (body.action === "check_user") {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const user = data.users.find((u: any) => (u.email || "").toLowerCase() === email);
      return new Response(JSON.stringify({
        exists: Boolean(user),
        userId: user?.id ?? null,
        confirmed: Boolean(user?.confirmed_at),
        createdAt: user?.created_at ?? null,
        lastSignInAt: user?.last_sign_in_at ?? null,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === update_email ===
    if (body.action === "update_email") {
      const oldEmail = body.oldEmail?.trim().toLowerCase();
      const newEmail = body.newEmail?.trim().toLowerCase();
      if (!oldEmail || !newEmail) {
        return new Response(JSON.stringify({ error: "oldEmail and newEmail are required" }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const user = data.users.find((u: any) => (u.email || "").toLowerCase() === oldEmail);
      if (!user) {
        return new Response(JSON.stringify({ error: "Auth user not found for old email" }), { 
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updErr } = await adminClient.auth.admin.updateUserById(user.id, { email: newEmail });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, userId: user.id }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === updateUserEmail ===
    if (body.action === "updateUserEmail") {
      const userId = body.userId?.trim();
      const newEmail = body.email?.trim().toLowerCase();
      
      if (!userId || !newEmail) {
        return new Response(JSON.stringify({ error: "userId and email are required" }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, { email: newEmail });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, userId }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === reset_password ===
    if (body.action === "reset_password") {
      const email = body.email?.trim().toLowerCase();
      const newPassword = body.newPassword;

      if (!email || !newPassword) {
        return new Response(JSON.stringify({ error: "email and newPassword are required" }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find user by email
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const targetUser = listData.users.find((u: any) => (u.email || "").toLowerCase() === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: `No auth user found for email: ${email}` }), { 
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update the actual Supabase Auth password
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUser.id, { 
        password: newPassword 
      });
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sign out user from all sessions so they must log in with new password
      try {
        await adminClient.auth.admin.signOut(targetUser.id, 'global');
      } catch (signOutErr) {
        console.error('Failed to sign out user after password reset (non-fatal):', signOutErr);
      }

      console.log(`Password reset successful for ${email} (user ${targetUser.id})`);

      return new Response(JSON.stringify({ 
        success: true, 
        userId: targetUser.id,
        message: "Password updated and user signed out from all sessions" 
      }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === sign_out_user ===
    if (body.action === "sign_out_user") {
      const userId = body.userId?.trim();
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: signOutErr } = await adminClient.auth.admin.signOut(userId, 'global');
      if (signOutErr) {
        return new Response(JSON.stringify({ error: signOutErr.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, userId, message: "User signed out from all sessions" }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === check_user_exists ===
    if (body.action === "check_user_exists") {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const user = data.users.find((u: any) => (u.email || "").toLowerCase() === email);
      return new Response(JSON.stringify({ exists: Boolean(user), userId: user?.id ?? null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === create_user ===
    // Creates a new auth user using the admin API. This does NOT alter the
    // caller's browser session (unlike client-side supabase.auth.signUp()).
    if (body.action === "create_user") {
      const email = body.email?.trim().toLowerCase();
      const name = body.name?.trim() || "";
      const employeeId = body.employeeId?.trim() || "";

      if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ error: "Valid email is required" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user already exists
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const existing = listData.users.find((u: any) => (u.email || "").toLowerCase() === email);
      if (existing) {
        return new Response(JSON.stringify({ success: true, alreadyExisted: true, userId: existing.id }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate a secure temporary password (user will reset via email)
      const tempPassword = crypto.randomUUID() + "Aa1!";

      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, employee_id: employeeId },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Send a password reset / set-password email so the new employee can sign in.
      // Use the user-scoped client (anon, with caller JWT) so it does NOT touch the caller's session.
      try {
        const userClientForReset = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const redirectTo = body.redirectTo || `${req.headers.get("origin") || ""}/auth/reset-password`;
        const { error: resetErr } = await userClientForReset.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetErr) console.error("Reset email failed (non-fatal):", resetErr.message);
      } catch (e) {
        console.error("Reset email exception (non-fatal):", e);
      }

      return new Response(JSON.stringify({ success: true, alreadyExisted: false, userId: createData.user?.id ?? null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e) }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
