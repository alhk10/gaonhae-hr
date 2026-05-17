import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import * as React from "npm:react@18.3.1";
import { render } from "npm:@react-email/render@0.0.17";
import { TEMPLATES } from "../_shared/transactional-email-templates/registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_ADDRESS = "Gaonhae Taekwondo <noreply@resend.dev>";

interface SendRequest {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, any>;
  idempotencyKey?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const body = (await req.json()) as SendRequest;
    const { templateName, recipientEmail, templateData = {} } = body;

    if (!templateName || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateName and recipientEmail are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const entry = TEMPLATES[templateName];
    if (!entry) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${templateName}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const subject = typeof entry.subject === "function"
      ? entry.subject(templateData)
      : entry.subject;

    const html = await render(
      React.createElement(entry.component as any, templateData),
    );

    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [recipientEmail],
      subject,
      html,
    });

    if ((result as any).error) {
      console.error("Resend error:", (result as any).error);
      return new Response(
        JSON.stringify({ error: (result as any).error }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log("Sent transactional email", {
      templateName,
      recipientEmail,
      id: (result as any).data?.id,
    });

    return new Response(
      JSON.stringify({ success: true, id: (result as any).data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err: any) {
    console.error("send-transactional-email failed:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
