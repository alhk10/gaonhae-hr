import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron secret guard
  const expectedSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for booking period reminders...');

    // Get today's date in SGT (UTC+8)
    const now = new Date();
    const sgtOffset = 8 * 60 * 60 * 1000;
    const sgtNow = new Date(now.getTime() + sgtOffset);
    const todayDate = sgtNow.toISOString().split('T')[0];
    const dayOfMonth = sgtNow.getDate();

    // Only run on the 14th or 28th of the month
    if (dayOfMonth !== 14 && dayOfMonth !== 28) {
      console.log(`Today is the ${dayOfMonth}th, not a booking reminder day`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Not a booking reminder day (today is the ${dayOfMonth}th)`,
          sent: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the booking period description
    const period = dayOfMonth === 14 ? '15th-28th' : '1st-14th of next month';

    // Get all active casual employees
    const { data: casualEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('type', 'Casual')
      .is('resign_date', null);

    if (empError) {
      console.error('Error fetching casual employees:', empError);
      throw empError;
    }

    console.log(`Found ${casualEmployees?.length || 0} casual employees`);

    const notificationsSent: string[] = [];

    for (const employee of casualEmployees || []) {
      // Check if we've already sent a booking reminder today
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('template_key', 'booking_reminder')
        .gte('sent_at', todayDate)
        .maybeSingle();

      if (existingLog) {
        console.log(`Already sent booking reminder to ${employee.id} today`);
        continue;
      }

      // Check if employee has push subscription
      const { data: subscription } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('employee_id', employee.id)
        .maybeSingle();

      if (!subscription) {
        console.log(`No subscription for employee ${employee.id}`);
        continue;
      }

      // Send push notification
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          employee_id: employee.id,
          template_key: 'booking_reminder',
          variables: {
            employee_name: employee.name,
            period: period
          },
          url: '/slot-booking'
        })
      });

      if (response.ok) {
        notificationsSent.push(employee.id);
        console.log(`Sent booking reminder to ${employee.name}`);
      } else {
        console.error(`Failed to send notification to ${employee.id}:`, await response.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notificationsSent.length} booking reminders for period: ${period}`,
        employees: notificationsSent,
        period: period
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-booking-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
