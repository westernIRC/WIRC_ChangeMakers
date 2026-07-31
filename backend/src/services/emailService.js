const nodemailer = require("nodemailer");

// Provider-agnostic on purpose: any SMTP service works (Resend, SendGrid, Mailgun, Postmark,
// Gmail with an app password, or a self-hosted server) by setting SMTP_* in the environment.
//
// When SMTP_HOST is not configured the transport falls back to logging the message to stdout.
// That keeps local development and CI working with no credentials and no network calls - but
// it means a misconfigured production deploy would silently print reset links to its logs
// instead of emailing them, so `assertEmailConfigured()` is called at startup in production.
const SMTP_HOST = process.env.SMTP_HOST;
const FROM = process.env.MAIL_FROM || "WIRC Change Makers <no-reply@wirc.local>";

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
  const subject = "Reset your WIRC Change Makers password";

  const text = [
    greeting,
    "",
    "We received a request to reset your WIRC Change Makers password.",
    "Open the link below to choose a new one:",
    "",
    resetUrl,
    "",
    `This link expires in ${expiresInMinutes} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email - your password won't change.",
  ].join("\n");

  const html = `
    <p>${greeting}</p>
    <p>We received a request to reset your WIRC Change Makers password.</p>
    <p><a href="${resetUrl}">Choose a new password</a></p>
    <p style="color:#555;font-size:13px">
      This link expires in ${expiresInMinutes} minutes and can only be used once.<br>
      If you didn't request this, you can safely ignore this email - your password won't change.
    </p>
    <p style="color:#888;font-size:12px">If the button doesn't work, paste this into your browser:<br>${resetUrl}</p>
  `;

  return sendMail({ to, subject, text, html });
}

module.exports = { sendMail, sendPasswordResetEmail, isConfigured, assertEmailConfigured };
