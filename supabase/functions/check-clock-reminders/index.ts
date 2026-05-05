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

    console.log('Checking for clock-out reminders...');

    // Get today's date in SGT (UTC+8)
    const now = new Date();
    const sgtOffset = 8 * 60 * 60 * 1000;
    const sgtNow = new Date(now.getTime() + sgtOffset);
    const todayDate = sgtNow.toISOString().split('T')[0];

    // Find casual employees who are clocked in for 5+ hours
    const { data: clockedInEmployees, error: clockError } = await supabase
      .from('clock_status')
      .select(`
        employee_id,
        clock_in_time,
        status,
        employees!inner(id, name, type)
      `)
      .eq('date', todayDate)
      .eq('status', 'clocked_in')
      .not('clock_in_time', 'is', null);

    if (clockError) {
      console.error('Error fetching clocked-in employees:', clockError);
      throw clockError;
    }

    console.log(`Found ${clockedInEmployees?.length || 0} clocked-in employees`);

    const notificationsSent: string[] = [];
    const fiveHoursMs = 5 * 60 * 60 * 1000;

    for (const record of clockedInEmployees || []) {
      // Only process casual employees
      const employee = record.employees as any;
      if (employee.type !== 'Casual') {
        continue;
      }

      // Calculate hours clocked in
      const clockInTime = new Date(record.clock_in_time);
      const hoursClocked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      if (hoursClocked < 5) {
        continue;
      }

      // Check if we've already sent a reminder today
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('employee_id', record.employee_id)
        .eq('template_key', 'clock_out_reminder')
        .gte('sent_at', todayDate)
        .maybeSingle();

      if (existingLog) {
        console.log(`Already sent clock-out reminder to ${record.employee_id} today`);
        continue;
      }

      // Check if employee has push subscription
      const { data: subscription } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('employee_id', record.employee_id)
        .maybeSingle();

      if (!subscription) {
        console.log(`No subscription for employee ${record.employee_id}`);
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
          employee_id: record.employee_id,
          template_key: 'clock_out_reminder',
          variables: {
            hours: Math.floor(hoursClocked).toString(),
            employee_name: employee.name
          },
          url: '/my-attendance'
        })
      });

      if (response.ok) {
        notificationsSent.push(record.employee_id);
        console.log(`Sent clock-out reminder to ${employee.name}`);
      } else {
        console.error(`Failed to send notification to ${record.employee_id}:`, await response.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notificationsSent.length} clock-out reminders`,
        employees: notificationsSent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-clock-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
