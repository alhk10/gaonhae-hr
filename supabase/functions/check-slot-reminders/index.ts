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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for tomorrow slot reminders...');

    // Get tomorrow's date in SGT (UTC+8)
    const now = new Date();
    const sgtOffset = 8 * 60 * 60 * 1000;
    const sgtNow = new Date(now.getTime() + sgtOffset);
    const tomorrow = new Date(sgtNow.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const todayDate = sgtNow.toISOString().split('T')[0];

    console.log(`Checking for slots on: ${tomorrowDate}`);

    // Find approved slot bookings for tomorrow for casual employees
    const { data: tomorrowSlots, error: slotsError } = await supabase
      .from('slot_bookings_new')
      .select(`
        id,
        employee_id,
        employee_name,
        branch_id,
        branch_name,
        date,
        employees!inner(id, type)
      `)
      .eq('date', tomorrowDate)
      .eq('status', 'approved');

    if (slotsError) {
      console.error('Error fetching tomorrow slots:', slotsError);
      throw slotsError;
    }

    console.log(`Found ${tomorrowSlots?.length || 0} slots for tomorrow`);

    const notificationsSent: string[] = [];

    for (const slot of tomorrowSlots || []) {
      const employee = slot.employees as any;
      
      // Only process casual employees
      if (employee.type !== 'Casual') {
        continue;
      }

      // Check if we've already sent a reminder today for tomorrow's slot
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('employee_id', slot.employee_id)
        .eq('template_key', 'tomorrow_slot_reminder')
        .gte('sent_at', todayDate)
        .maybeSingle();

      if (existingLog) {
        console.log(`Already sent tomorrow slot reminder to ${slot.employee_id} today`);
        continue;
      }

      // Check if employee has push subscription
      const { data: subscription } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('employee_id', slot.employee_id)
        .maybeSingle();

      if (!subscription) {
        console.log(`No subscription for employee ${slot.employee_id}`);
        continue;
      }

      // Format the date nicely (DD/MM/YYYY)
      const dateObj = new Date(slot.date);
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Send push notification
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          employee_id: slot.employee_id,
          template_key: 'tomorrow_slot_reminder',
          variables: {
            branch: slot.branch_name,
            date: formattedDate,
            employee_name: slot.employee_name
          },
          url: '/slot-booking'
        })
      });

      if (response.ok) {
        notificationsSent.push(slot.employee_id);
        console.log(`Sent tomorrow slot reminder to ${slot.employee_name}`);
      } else {
        console.error(`Failed to send notification to ${slot.employee_id}:`, await response.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notificationsSent.length} tomorrow slot reminders`,
        employees: notificationsSent,
        date_checked: tomorrowDate
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-slot-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
