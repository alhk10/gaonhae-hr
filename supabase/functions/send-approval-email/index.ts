import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendApprovalEmailRequest {
  recipientEmail: string;
  recipientName: string;
  type: 'approved' | 'rejected';
  requestType: 'student_update' | 'invoice_deletion' | 'payment_deletion';
  reviewerName?: string;
  reviewNotes?: string;
  changesDescription?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      recipientName,
      type,
      requestType,
      reviewerName,
      reviewNotes,
      changesDescription
    }: SendApprovalEmailRequest = await req.json();

    if (!recipientEmail || !recipientName || !type || !requestType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build email content based on type
    const isApproved = type === 'approved';
    const statusColor = isApproved ? '#16a34a' : '#dc2626';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    
    const requestTypeLabels: Record<string, string> = {
      student_update: 'Profile Update Request',
      invoice_deletion: 'Invoice Deletion Request',
      payment_deletion: 'Payment Deletion Request',
    };
    
    const requestLabel = requestTypeLabels[requestType] || 'Request';

    const emailResponse = await resend.emails.send({
      from: "Gaonhae Taekwondo <noreply@resend.dev>",
      to: [recipientEmail],
      subject: `Your ${requestLabel} has been ${statusText}`,
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
            <p style="color: #666; margin: 0; font-size: 14px;">Request Status Update</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p>Dear ${recipientName},</p>
            
            <p>Your <strong>${requestLabel}</strong> has been reviewed.</p>
            
            <div style="background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${statusColor};">
                ${statusText}
              </p>
              ${reviewerName ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Reviewed by: ${reviewerName}</p>` : ''}
            </div>
            
            ${changesDescription ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Request Details:</p>
              <p style="margin: 0; color: #666;">${changesDescription}</p>
            </div>
            ` : ''}
            
            ${reviewNotes ? `
            <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Reviewer Notes:</p>
              <p style="margin: 0; color: #666;">${reviewNotes}</p>
            </div>
            ` : ''}
            
            ${isApproved ? `
            <p>Your requested changes have been applied to your profile.</p>
            ` : `
            <p>If you have any questions about this decision, please contact the academy.</p>
            `}
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>Gaonhae Taekwondo Team</strong>
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-approval-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
