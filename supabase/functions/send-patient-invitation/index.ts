import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PatientInvitationRequest {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientName, patientEmail, doctorName, doctorUserId }: PatientInvitationRequest = await req.json();

    console.log('Sending patient invitation email to:', patientEmail);

    const emailResponse = await resend.emails.send({
      from: "Doc+ <noreply@barve.me>",
      to: [patientEmail],
      subject: "You're invited to join Doc+ - Your Medical Assistant",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0;">Doc+</h1>
            <p style="color: #64748b; margin: 5px 0;">Your offline medical assistant</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin-top: 0;">You're invited to join Doc+, ${patientName}!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Dr. ${doctorName} has invited you to join the Doc+ platform where you can access your medical records and communicate with your healthcare provider.
            </p>
          </div>

          <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">How to get started:</h3>
            <ol style="color: #1e40af; line-height: 1.6;">
              <li>Click the "Join Doc+" button below</li>
              <li>Create your account with this email address</li>
              <li>Use the doctor code: <code style="background: #bfdbfe; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold;">${doctorUserId}</code></li>
              <li>Complete your patient profile</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SITE_URL") || "http://localhost:8080"}/patient-onboarding?doctorId=${doctorUserId}"
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Join Doc+
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              If you have any questions, please contact Dr. ${doctorName} or our support team.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
              This is an automated message from Doc+ Medical Platform.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Patient invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-patient-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
