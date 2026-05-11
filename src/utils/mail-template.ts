import { APP_USER } from "@/config/env.js";
import { transporter } from "@/config/nodemailer";

type Severity = "critical" | "warning" | "notice" | "info";

interface SharedMember {
  name: string;
  email?: string;
  hasPaid: boolean;
}

interface SendReminderEmailOptions {
  to: string;
  userName: string;
  subscriptionName: string;
  amount: number;
  currency: string;
  nextPaymentDate: Date;
  daysLeft: number;
  isShared?: boolean;
  sharedWith?: SharedMember[];
}

function getSeverity(daysLeft: number): Severity {
  if (daysLeft <= 1) return "critical"; // red
  if (daysLeft <= 3) return "warning"; // yellow
  if (daysLeft <= 5) return "notice"; // blue
  return "info"; // green
}

const SEVERITY_CONFIG = {
  critical: {
    color: "#DC2626",
    lightColor: "#FEF2F2",
    borderColor: "#FECACA",
    label: "Action Required",
    emoji: "🚨",
  },
  warning: {
    color: "#D97706",
    lightColor: "#FFFBEB",
    borderColor: "#FDE68A",
    label: "Reminder",
    emoji: "⚠️",
  },
  notice: {
    color: "#2563EB",
    lightColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    label: "Heads Up",
    emoji: "📅",
  },
  info: {
    color: "#059669",
    lightColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    label: "Upcoming Payment",
    emoji: "✅",
  },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function buildSharedSection(
  sharedWith: SharedMember[],
  totalAmount: number,
  currency: string,
  config: (typeof SEVERITY_CONFIG)[Severity],
): string {
  if (!sharedWith || sharedWith.length === 0) return "";

  const individualShare = totalAmount / (sharedWith.length + 1);
  const unpaidMembers = sharedWith.filter((m) => !m.hasPaid);
  const paidMembers = sharedWith.filter((m) => m.hasPaid);

  const memberRows = sharedWith
    .map(
      (member) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
        <tr>
          <td style="font-size: 14px; color: #374151;">
            ${member.hasPaid ? "✅" : "⏳"} ${member.name}
          </td>
          <td align="right" style="font-size: 14px; font-weight: 600; color: ${member.hasPaid ? "#059669" : config.color};">
            ${member.hasPaid ? "Paid" : `Owes ${formatCurrency(individualShare, currency)}`}
          </td>
        </tr>
      </table>
    `,
    )
    .join(
      '<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 8px 0;" />',
    );

  const unpaidNote =
    unpaidMembers.length > 0
      ? `
      <p style="
        margin: 16px 0 0 0;
        padding: 12px 16px;
        background-color: ${config.lightColor};
        border-left: 3px solid ${config.color};
        border-radius: 0 8px 8px 0;
        color: #374151;
        font-size: 13px;
        line-height: 1.6;
      ">
        💡 <strong>${unpaidMembers.map((m) => m.name).join(", ")}</strong>
        ${unpaidMembers.length === 1 ? "has" : "have"} not paid their share yet.
        Don't forget to collect <strong>${formatCurrency(individualShare * unpaidMembers.length, currency)}</strong> from ${unpaidMembers.length === 1 ? "them" : "them"} before the due date.
      </p>
    `
      : `
      <p style="
        margin: 16px 0 0 0;
        padding: 12px 16px;
        background-color: #ECFDF5;
        border-left: 3px solid #059669;
        border-radius: 0 8px 8px 0;
        color: #374151;
        font-size: 13px;
      ">
        🎉 All members have paid their share!
      </p>
    `;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="
      background-color: #F9FAFB;
      border: 1.5px solid #E5E7EB;
      border-radius: 12px;
      margin-bottom: 32px;
    ">
      <tr>
        <td style="padding: 28px 32px;">
          <p style="
            margin: 0 0 16px 0;
            color: #6B7280;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
          ">
            👥 Shared Plan · Your share: ${formatCurrency(individualShare, currency)}
          </p>
          ${memberRows}
          ${unpaidNote}
        </td>
      </tr>
    </table>
  `;
}

function buildEmailHtml(
  options: SendReminderEmailOptions,
  severity: Severity,
): string {
  const config = SEVERITY_CONFIG[severity];
  const {
    userName,
    subscriptionName,
    amount,
    currency,
    nextPaymentDate,
    daysLeft,
    isShared,
    sharedWith,
  } = options;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(nextPaymentDate);

  const formattedAmount = formatCurrency(amount, currency);
  const daysText = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  const individualShare =
    isShared && sharedWith && sharedWith.length > 0
      ? formatCurrency(amount / (sharedWith.length + 1), currency)
      : null;

  const sharedSection =
    isShared && sharedWith && sharedWith.length > 0
      ? buildSharedSection(sharedWith, amount, currency, config)
      : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Subscription Reminder</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    ">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="
              max-width: 600px;
              width: 100%;
              background-color: #FFFFFF;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            ">

              <!-- HEADER -->
              <tr>
                <td style="background-color: ${config.color}; padding: 40px 48px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="
                          margin: 0 0 8px 0;
                          color: rgba(255,255,255,0.85);
                          font-size: 13px;
                          font-weight: 600;
                          letter-spacing: 1.5px;
                          text-transform: uppercase;
                        ">
                          ${config.emoji} ${config.label}
                        </p>
                        <h1 style="
                          margin: 0;
                          color: #FFFFFF;
                          font-size: 28px;
                          font-weight: 700;
                          line-height: 1.2;
                        ">
                          Payment Due ${daysLeft === 1 ? "Tomorrow" : `in ${daysLeft} Days`}
                        </h1>
                        ${
                          individualShare
                            ? `
                        <p style="
                          margin: 10px 0 0 0;
                          color: rgba(255,255,255,0.9);
                          font-size: 14px;
                        ">
                          Your share: <strong>${individualShare}</strong>
                        </p>`
                            : ""
                        }
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding: 40px 48px;">

                  <!-- GREETING -->
                  <p style="
                    margin: 0 0 24px 0;
                    color: #374151;
                    font-size: 16px;
                    line-height: 1.6;
                  ">
                    Hi <strong>${userName}</strong>,
                  </p>
                  <p style="
                    margin: 0 0 32px 0;
                    color: #6B7280;
                    font-size: 15px;
                    line-height: 1.7;
                  ">
                    This is a reminder that your <strong style="color: #111827;">${subscriptionName}</strong> 
                    subscription payment is due <strong style="color: ${config.color};">${daysText}</strong>.
                    ${
                      individualShare
                        ? `Your share of this plan is <strong style="color: ${config.color};">${individualShare}</strong> — please make sure it's ready before the due date.`
                        : `Please make sure your payment method is up to date to avoid any interruptions.`
                    }
                  </p>

                  <!-- SUBSCRIPTION CARD -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="
                    background-color: ${config.lightColor};
                    border: 1.5px solid ${config.borderColor};
                    border-radius: 12px;
                    margin-bottom: 32px;
                  ">
                    <tr>
                      <td style="padding: 28px 32px;">
                        <p style="
                          margin: 0 0 16px 0;
                          color: #6B7280;
                          font-size: 12px;
                          font-weight: 600;
                          letter-spacing: 1px;
                          text-transform: uppercase;
                        ">
                          Subscription Details
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                          <tr>
                            <td style="color: #6B7280; font-size: 14px;">Service</td>
                            <td align="right" style="color: #111827; font-size: 14px; font-weight: 600;">${subscriptionName}</td>
                          </tr>
                        </table>

                        <hr style="border: none; border-top: 1px solid ${config.borderColor}; margin: 12px 0;" />

                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                          <tr>
                            <td style="color: #6B7280; font-size: 14px;">Total Amount</td>
                            <td align="right" style="color: ${config.color}; font-size: 20px; font-weight: 700;">${formattedAmount}</td>
                          </tr>
                        </table>

                        ${
                          individualShare
                            ? `
                        <hr style="border: none; border-top: 1px solid ${config.borderColor}; margin: 12px 0;" />
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                          <tr>
                            <td style="color: #6B7280; font-size: 14px;">Your Share</td>
                            <td align="right" style="color: ${config.color}; font-size: 18px; font-weight: 700;">${individualShare}</td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        <hr style="border: none; border-top: 1px solid ${config.borderColor}; margin: 12px 0;" />

                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="color: #6B7280; font-size: 14px;">Due Date</td>
                            <td align="right" style="color: #111827; font-size: 14px; font-weight: 600;">${formattedDate}</td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- SHARED MEMBERS SECTION -->
                  ${sharedSection}

                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td align="center">
                        <a href="#" style="
                          display: inline-block;
                          background-color: ${config.color};
                          color: #FFFFFF;
                          font-size: 15px;
                          font-weight: 600;
                          text-decoration: none;
                          padding: 14px 40px;
                          border-radius: 8px;
                          letter-spacing: 0.3px;
                        ">
                          View Subscription
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- NOTE -->
                  <p style="
                    margin: 0;
                    color: #9CA3AF;
                    font-size: 13px;
                    line-height: 1.6;
                    text-align: center;
                  ">
                    If you have already managed this subscription, please ignore this email.
                    You can update your notification preferences in your account settings.
                  </p>

                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="
                  background-color: #F9FAFB;
                  border-top: 1px solid #E5E7EB;
                  padding: 24px 48px;
                  text-align: center;
                ">
                  <p style="
                    margin: 0 0 4px 0;
                    color: #6B7280;
                    font-size: 13px;
                    font-weight: 600;
                  ">
                    SubTracker
                  </p>
                  <p style="
                    margin: 0;
                    color: #9CA3AF;
                    font-size: 12px;
                  ">
                    You're receiving this because you enabled email reminders.
                    <br />
                    © ${new Date().getFullYear()} SubTracker. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendReminderEmail(
  options: SendReminderEmailOptions,
): Promise<void> {
  const severity = getSeverity(options.daysLeft);
  const html = buildEmailHtml(options, severity);

  await transporter.sendMail({
    from: `"SubTracker" <${APP_USER}>`,
    to: options.to,
    subject: `${SEVERITY_CONFIG[severity].emoji} ${options.subscriptionName} payment due ${options.daysLeft === 1 ? "tomorrow" : `in ${options.daysLeft} days`}`,
    html,
  });
}
