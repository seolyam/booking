import { Resend } from "resend";

// ============================================================================
// Client
// ============================================================================

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// ============================================================================
// Helpers
// ============================================================================

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Booking System <noreply@resend.dev>";
const APP_NAME = "Booking System";

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

// ============================================================================
// Generic send
// ============================================================================

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    // Silently skip if Resend is not configured
    console.log(`[email] Resend not configured — skipping email to ${Array.isArray(to) ? to.join(", ") : to}: ${subject}`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Template: New Request Notification (to admins)
// ============================================================================

export async function sendNewRequestNotification({
  adminEmails,
  requesterName,
  requestTitle,
  category,
  requestId,
}: {
  adminEmails: string[];
  requesterName: string;
  requestTitle: string;
  category: string;
  requestId: string;
}) {
  if (adminEmails.length === 0) return;

  const link = appUrl(`/dashboard/requests/${requestId}`);

  await sendEmail({
    to: adminEmails,
    subject: `[${APP_NAME}] New Request: ${requestTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Request Submitted</h2>
        <p style="color: #4a4a4a;">
          <strong>${requesterName}</strong> has submitted a new <strong>${category}</strong> request.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; width: 120px;">Title</td>
            <td style="padding: 8px 12px; background: #f5f5f5;">${requestTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600;">Category</td>
            <td style="padding: 8px 12px;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600;">Requester</td>
            <td style="padding: 8px 12px; background: #f5f5f5;">${requesterName}</td>
          </tr>
        </table>
        <a href="${link}" style="display: inline-block; background: #358334; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          View Request
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          You are receiving this because you are an admin on ${APP_NAME}.
        </p>
      </div>
    `,
  });
}

// ============================================================================
// Template: Status Change Notification (to requester)
// ============================================================================

export async function sendStatusChangeNotification({
  requesterEmail,
  requesterName,
  requestTitle,
  newStatus,
  comment,
  requestId,
}: {
  requesterEmail: string;
  requesterName: string;
  requestTitle: string;
  newStatus: string;
  comment?: string | null;
  requestId: string;
}) {
  const link = appUrl(`/dashboard/requests/${requestId}`);

  const statusColors: Record<string, string> = {
    open: "#3b82f6",
    pending: "#f59e0b",
    resolved: "#22c55e",
    cancelled: "#6b7280",
  };

  const statusColor = statusColors[newStatus] ?? "#6b7280";

  await sendEmail({
    to: requesterEmail,
    subject: `[${APP_NAME}] Request ${newStatus}: ${requestTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Request Status Updated</h2>
        <p style="color: #4a4a4a;">
          Hi ${requesterName},
        </p>
        <p style="color: #4a4a4a;">
          Your request <strong>"${requestTitle}"</strong> has been updated to:
        </p>
        <div style="display: inline-block; background: ${statusColor}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: capitalize; margin: 8px 0;">
          ${newStatus}
        </div>
        ${comment ? `
        <div style="margin: 16px 0; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid ${statusColor}; border-radius: 4px;">
          <p style="margin: 0; color: #4a4a4a; font-size: 14px;"><strong>Comment:</strong></p>
          <p style="margin: 4px 0 0; color: #4a4a4a; font-size: 14px;">${comment}</p>
        </div>
        ` : ""}
        <a href="${link}" style="display: inline-block; background: #358334; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          View Request
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          You are receiving this because you submitted this request on ${APP_NAME}.
        </p>
      </div>
    `,
  });
}

// ============================================================================
// Template: Rating Request (to requester after resolution)
// ============================================================================

export async function sendRatingRequestEmail({
  requesterEmail,
  requesterName,
  requestTitle,
  requestId,
}: {
  requesterEmail: string;
  requesterName: string;
  requestTitle: string;
  requestId: string;
}) {
  const ratingLink = appUrl(`/requests/${requestId}/rate`);

  await sendEmail({
    to: requesterEmail,
    subject: `[${APP_NAME}] How was your experience? Rate your request`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Your Request Has Been Resolved</h2>
        <p style="color: #4a4a4a;">
          Hi ${requesterName},
        </p>
        <p style="color: #4a4a4a;">
          Your request <strong>"${requestTitle}"</strong> has been resolved. We'd love to hear your feedback!
        </p>
        <p style="color: #4a4a4a;">
          Please take a moment to rate your experience:
        </p>
        <a href="${ratingLink}" style="display: inline-block; background: #358334; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0;">
          Rate Your Experience
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          You are receiving this because your request on ${APP_NAME} was resolved.
        </p>
      </div>
    `,
  });
}
