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

    console.log('Checking for outstanding fees...');

    // Get today's date in SGT for dedup
    const now = new Date();
    const sgtOffset = 8 * 60 * 60 * 1000;
    const sgtNow = new Date(now.getTime() + sgtOffset);
    const todayDate = sgtNow.toISOString().split('T')[0];

    // Get invoices with outstanding balance
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('student_id, balance_due, status')
      .gt('balance_due', 0)
      .in('status', ['sent', 'overdue']);

    if (invError) {
      console.error('Error fetching invoices:', invError);
      throw invError;
    }

    console.log(`Found ${invoices?.length || 0} outstanding invoices`);

    // Group by student_id and sum outstanding
    const studentOutstanding: Record<string, number> = {};
    for (const inv of invoices || []) {
      studentOutstanding[inv.student_id] = (studentOutstanding[inv.student_id] || 0) + inv.balance_due;
    }

    const notificationsSent: string[] = [];

    for (const [studentId, totalAmount] of Object.entries(studentOutstanding)) {
      // Check if student has a push subscription
      const { data: subscription } = await supabase
        .from('student_notification_subscriptions')
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (!subscription) {
        continue;
      }

      // Dedup: check notification_logs for today (use a custom check since student logs aren't in notification_logs)
      // We'll use a simple approach: check if we sent this template today by querying push-notification
      // Since student notifications aren't logged in notification_logs, we skip dedup for students
      // and rely on the weekly cron schedule for natural dedup

      // Format amount
      const formattedAmount = `$${totalAmount.toFixed(2)}`;

      // Send push notification
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          employee_id: '', // Not an employee notification
          student_id: studentId,
          template_key: 'outstanding_fees_reminder',
          variables: {
            amount: formattedAmount
          },
          url: '/'
        })
      });

      if (response.ok) {
        notificationsSent.push(studentId);
        console.log(`Sent outstanding fees reminder to student ${studentId}: ${formattedAmount}`);
      } else {
        console.error(`Failed to send to student ${studentId}:`, await response.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notificationsSent.length} outstanding fees reminders`,
        students: notificationsSent,
        date: todayDate
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-outstanding-fees:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
