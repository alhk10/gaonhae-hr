import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface PayslipEmailRequest {
  employeeEmail: string;
  employeeName: string;
  month: string;
  payrollData: {
    baseSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    grossSalary: number;
    employeeCPF: number;
    employerCPF: number;
    totalCPF: number;
    approvedClaims: number;
    netSalary: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY to secrets." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const { employeeEmail, employeeName, month, payrollData }: PayslipEmailRequest = await req.json();

    console.log(`Sending payslip email to ${employeeEmail} for ${month}`);

    const safeName = escapeHtml(employeeName || '');
    const safeMonth = escapeHtml(month || '');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
          .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .summary-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .summary-table td:first-child { font-weight: 500; color: #6b7280; }
          .summary-table td:last-child { text-align: right; font-weight: 600; }
          .net-pay { background: #dcfce7; font-size: 18px; }
          .net-pay td { color: #166534 !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Payslip for ${safeMonth}</h1>
          </div>
          <div class="content">
            <p>Dear ${safeName},</p>
            <p>Please find below your payslip summary for <strong>${safeMonth}</strong>:</p>
            
            <table class="summary-table">
              <tr>
                <td>Base Salary</td>
                <td>S$${payrollData.baseSalary?.toLocaleString() || '0'}</td>
              </tr>
              <tr>
                <td>Total Allowances</td>
                <td>S$${payrollData.totalAllowances?.toLocaleString() || '0'}</td>
              </tr>
              <tr>
                <td>Approved Claims</td>
                <td>S$${payrollData.approvedClaims?.toLocaleString() || '0'}</td>
              </tr>
              <tr>
                <td>Gross Salary</td>
                <td>S$${payrollData.grossSalary?.toLocaleString() || '0'}</td>
              </tr>
              <tr>
                <td>Employee CPF</td>
                <td>-S$${payrollData.employeeCPF?.toLocaleString() || '0'}</td>
              </tr>
              <tr>
                <td>Total Deductions</td>
                <td>-S$${payrollData.totalDeductions?.toLocaleString() || '0'}</td>
              </tr>
              <tr class="net-pay">
                <td>Net Pay</td>
                <td>S$${payrollData.netSalary?.toLocaleString() || '0'}</td>
              </tr>
            </table>
            
            <p style="color: #6b7280; font-size: 14px;">
              For a detailed breakdown, please download your full payslip from the employee portal.
            </p>
            
            <p>If you have any questions, please contact HR.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Payroll <onboarding@resend.dev>",
      to: [employeeEmail],
      subject: `Your Payslip for ${safeMonth}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payslip-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
