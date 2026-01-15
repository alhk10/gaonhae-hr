import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  employee_id: string;
  template_key: string;
  variables?: Record<string, string>;
  url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

    // Get employee subscription
    const { data: subscription, error: subError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('employee_id', payload.employee_id)
      .maybeSingle();

    if (subError || !subscription) {
      console.log('No subscription found for employee:', payload.employee_id);
      return new Response(
        JSON.stringify({ message: 'No push subscription for this employee' }),
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
      url: payload.url || '/',
      tag: payload.template_key,
      data: {
        template_key: payload.template_key,
        employee_id: payload.employee_id
      }
    });

    // Send push notification using Web Push protocol
    const pushResult = await sendWebPush(
      subscription.endpoint,
      subscription.p256dh,
      subscription.auth,
      vapidPublicKey,
      vapidPrivateKey,
      vapidSubject,
      notificationPayload
    );

    if (pushResult.success) {
      // Log successful notification
      await supabase.from('notification_logs').insert({
        employee_id: payload.employee_id,
        template_key: payload.template_key,
        metadata: { variables: payload.variables }
      });

      console.log('Push notification sent successfully');
      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Handle subscription expiry
      if (pushResult.status === 410 || pushResult.status === 404) {
        console.log('Subscription expired, removing from database');
        await supabase
          .from('notification_subscriptions')
          .delete()
          .eq('id', subscription.id);
      }

      console.error('Push notification failed:', pushResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: pushResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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
    // Import web-push compatible functionality for Deno
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
