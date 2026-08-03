const nodemailer = require("nodemailer");

// Provider-agnostic on purpose: any SMTP service works (Resend, SendGrid, Mailgun, Postmark,
// Gmail with an app password, or a self-hosted server) by setting SMTP_* in the environment.
//
// When SMTP_HOST is not configured the transport falls back to logging the message to stdout.
// That keeps local development and CI working with no credentials and no network calls - but
// it means a misconfigured production deploy would silently print reset links to its logs
// instead of emailing them, so `assertEmailConfigured()` is called at startup in production.
const SMTP_HOST = process.env.SMTP_HOST;
const FROM = process.env.MAIL_FROM || "WIRC Changemakers <no-reply@wirc.local>";

let transporter = null;

function isConfigured() {
  return Boolean(SMTP_HOST);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      // Port 465 is implicit TLS; 587 and 25 upgrade via STARTTLS.
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

// Fails fast at boot rather than at 2am when the first user forgets their password.
function assertEmailConfigured() {
  if (process.env.NODE_ENV === "production" && !isConfigured()) {
    throw new Error(
      "SMTP_HOST is not set. Password reset emails cannot be sent in production. " +
        "Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM, or unset NODE_ENV=production."
    );
  }
}

async function sendMail({ to, subject, text, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log("\n--- EMAIL (SMTP not configured, logging instead) ---");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("--- END EMAIL ---\n");
    return { delivered: false, logged: true };
  }

  await transport.sendMail({ from: FROM, to, subject, text, html });
  return { delivered: true, logged: false };
}

function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes }) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const subject = "Reset your WIRC Changemakers password";

  const text = [
    greeting,
    "",
    "We received a request to reset your WIRC Changemakers password.",
    "Open the link below to choose a new one:",
    "",
    resetUrl,
    "",
    `This link expires in ${expiresInMinutes} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email - your password won't change.",
  ].join("\n");

  const html = `
    <p>${greeting}</p>
    <p>We received a request to reset your WIRC Changemakers password.</p>
    <p><a href="${resetUrl}">Choose a new password</a></p>
    <p style="color:#555;font-size:13px">
      This link expires in ${expiresInMinutes} minutes and can only be used once.<br>
      If you didn't request this, you can safely ignore this email - your password won't change.
    </p>
    <p style="color:#888;font-size:12px">If the button doesn't work, paste this into your browser:<br>${resetUrl}</p>
  `;

  return sendMail({ to, subject, text, html });
}

// Sent once, right after signup. Doubles as proof to the member that the address they typed
// actually works - if this never arrives, their password reset won't either, and it's much
// better to find that out on day one than the day they're locked out.
function sendWelcomeEmail({ to, name, houseName, cause, dashboardUrl }) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const subject = "Welcome to WesternIRC Changemakers";

  const houseLine = houseName
    ? `You've been placed in ${houseName}. You'll climb the leaderboard together.`
    : "You'll be placed in a House shortly.";

  const causeLine = cause ? `You're fundraising for: ${cause}` : null;

  const text = [
    greeting,
    "",
    "Your Changemakers account is ready.",
    "",
    houseLine,
    causeLine,
    "",
    "How it works: Log a donation once a week, every week. The leaderboard ranks on",
    "consistency, your streak and your House's participation rate, not on totals.",
    "Showing up matters more than the amount. Your dollar amounts stay private either way.",
    "",
    `Go to your dashboard: ${dashboardUrl}`,
    "",
    "If you didn't create this account, you can ignore this email.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <p>${greeting}</p>
    <p>Your Changemakers account is ready.</p>
    <p><strong>${houseLine}</strong></p>
    ${causeLine ? `<p style="color:#555">${causeLine}</p>` : ""}
    <p>
      <a href="${dashboardUrl}"
         style="display:inline-block;background:#0a63ac;color:#fff;text-decoration:none;
                padding:10px 18px;border-radius:8px;font-weight:600">Go to your dashboard</a>
    </p>
    <p style="color:#555;font-size:13px">
      <strong>How it works:</strong> Log a donation once a week, every week. The leaderboard
      ranks on consistency, your streak and your House's participation rate, not on totals.
      Showing up matters more than the amount. Your dollar amounts stay private either way.
    </p>
    <p style="color:#888;font-size:12px">
      If you didn't create this account, you can ignore this email.<br>
      If the button doesn't work, paste this into your browser:<br>${dashboardUrl}
    </p>
  `;

  return sendMail({ to, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  isConfigured,
  assertEmailConfigured,
};
