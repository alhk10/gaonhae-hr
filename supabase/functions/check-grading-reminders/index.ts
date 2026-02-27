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

    console.log('Checking for grading test reminders...');

    // Get dates in SGT
    const now = new Date();
    const sgtOffset = 8 * 60 * 60 * 1000;
    const sgtNow = new Date(now.getTime() + sgtOffset);
    const todayDate = sgtNow.toISOString().split('T')[0];
    
    // 3 days from now
    const threeDaysLater = new Date(sgtNow.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysDate = threeDaysLater.toISOString().split('T')[0];

    // Get grading registrations that are ready but not yet graded, with upcoming slots
    const { data: registrations, error: regError } = await supabase
      .from('grading_registrations')
      .select(`
        id,
        student_id,
        current_belt,
        target_belt,
        grading_slots!inner (
          grading_date,
          branch_id,
          title
        ),
        students!inner (
          name
        )
      `)
      .eq('ready_for_grading', true)
      .is('result', null)
      .gte('grading_slots.grading_date', todayDate)
      .lte('grading_slots.grading_date', threeDaysDate);

    if (regError) {
      console.error('Error fetching grading registrations:', regError);
      throw regError;
    }

    console.log(`Found ${registrations?.length || 0} upcoming grading registrations`);

    // Get branch names
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name');
    const branchMap: Record<string, string> = {};
    for (const b of branches || []) {
      branchMap[b.id] = b.name;
    }

    const notificationsSent: string[] = [];

    for (const reg of registrations || []) {
      const slot = reg.grading_slots as any;
      const student = reg.students as any;

      // Check if student has subscription
      const { data: subscription } = await supabase
        .from('student_notification_subscriptions')
        .select('id')
        .eq('student_id', reg.student_id)
        .maybeSingle();

      if (!subscription) {
        continue;
      }

      // Format date
      const gradingDate = new Date(slot.grading_date);
      const formattedDate = gradingDate.toLocaleDateString('en-SG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      const branchName = branchMap[slot.branch_id] || slot.branch_id;

      // Send push notification
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          employee_id: '',
          student_id: reg.student_id,
          template_key: 'grading_test_reminder',
          variables: {
            student_name: student.name,
            grading_date: formattedDate,
            branch: branchName,
            current_belt: reg.current_belt,
            target_belt: reg.target_belt
          },
          url: '/'
        })
      });

      if (response.ok) {
        notificationsSent.push(reg.student_id);
        console.log(`Sent grading reminder for ${student.name}`);
      } else {
        console.error(`Failed to send grading reminder for ${reg.student_id}:`, await response.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notificationsSent.length} grading test reminders`,
        students: notificationsSent,
        date: todayDate
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-grading-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
