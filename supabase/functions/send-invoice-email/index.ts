import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface SendInvoiceEmailRequest {
  recipientEmail: string;
  invoiceNumber: string;
  studentName: string;
  totalAmount: number;
  balanceDue: number;
  pdfBase64: string;
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
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { 
      recipientEmail, 
      invoiceNumber, 
      studentName, 
      totalAmount, 
      balanceDue,
      pdfBase64 
    }: SendInvoiceEmailRequest = await req.json();

    if (!recipientEmail || !invoiceNumber || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipientEmail, invoiceNumber, and pdfBase64 are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const safeStudentName = escapeHtml(studentName || 'Valued Customer');
    const safeInvoiceNumber = escapeHtml(invoiceNumber);
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const emailResponse = await resend.emails.send({
      from: "Gaonhae Taekwondo <noreply@resend.dev>",
      to: [recipientEmail],
      subject: `Invoice ${safeInvoiceNumber} from Gaonhae Taekwondo`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 24px;">Gaonhae Taekwondo</h1>
            <p style="color: #666; margin: 0; font-size: 14px;">Invoice Notification</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p>Dear ${safeStudentName},</p>
            
            <p>Please find attached your invoice <strong>${safeInvoiceNumber}</strong>.</p>
            
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${safeInvoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Total Amount:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(totalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Balance Due:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${balanceDue > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(balanceDue)}</td>
                </tr>
              </table>
            </div>
            
            <p>If you have any questions regarding this invoice, please don't hesitate to contact us.</p>
            
            <p style="margin-top: 30px;">
              Thank you for your business!<br>
              <strong>Gaonhae Taekwondo Team</strong>
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Invoice_${invoiceNumber}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
