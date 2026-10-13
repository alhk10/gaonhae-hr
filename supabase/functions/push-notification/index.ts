import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  employee_id: string;
  student_id?: string;
  template_key: string;
  variables?: Record<string, string>;
  url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication - accepts both user JWTs and service role key (from cron functions)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // If not the service role key, validate as user JWT
    if (token !== serviceRoleKey) {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { error: claimsError } = await authClient.auth.getClaims(token);
      if (claimsError) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gaonhae.com';

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notification service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload: PushPayload = await req.json();

    console.log('Push notification request:', payload);

    // Get notification template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', payload.template_key)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return new Response(
        JSON.stringify({ error: 'Notification template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!template.enabled) {
      console.log('Template is disabled:', payload.template_key);
      return new Response(
        JSON.stringify({ message: 'Notification template is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isStudent = !!payload.student_id;
    const table = isStudent ? 'student_notification_subscriptions' : 'notification_subscriptions';
    const { data: subs, error: subscriptionError } = await supabase
      .from(table)
      .select('*')
      .eq(isStudent ? 'student_id' : 'employee_id', isStudent ? payload.student_id! : payload.employee_id);

    if (subscriptionError || !subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ message: `No push subscription for this ${isStudent ? 'student' : 'employee'}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format notification body with variables
    let formattedBody = template.body;
    if (payload.variables) {
      for (const [key, value] of Object.entries(payload.variables)) {
        formattedBody = formattedBody.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    // Create push notification payload
    const notificationPayload = JSON.stringify({
      title: template.title,
      body: formattedBody,
      icon: '/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png',
      badge: '/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png',
      url: payload.url || (isStudent ? '/hello' : '/'),
      tag: payload.template_key,
      data: {
        template_key: payload.template_key,
        employee_id: payload.employee_id,
        student_id: payload.student_id
      }
    });

    let sent = 0;
    for (const sub of subs) {
      const r = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, vapidPublicKey, vapidPrivateKey, vapidSubject, notificationPayload);
      if (r.success) sent++;
      else if (r.status === 410 || r.status === 404) await supabase.from(table).delete().eq('id', sub.id);
      else console.error('Push failed:', r);
    }
    if (sent > 0 && payload.employee_id && !isStudent) {
      await supabase.from('notification_logs').insert({
        employee_id: payload.employee_id, template_key: payload.template_key, metadata: { variables: payload.variables },
      });
    }
    return new Response(
      JSON.stringify({ success: sent > 0, sent, total: subs.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
  payload: string
): Promise<{ success: boolean; status?: number; message?: string }> {
  try {
    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
    
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushSubscription = {
      endpoint,
      keys: {
        p256dh,
        auth
      }
    };

    await webpush.sendNotification(pushSubscription, payload);
    return { success: true };
  } catch (error: any) {
    console.error('Web push error:', error);
    return {
      success: false,
      status: error.statusCode,
      message: error.message
    };
  }
}
