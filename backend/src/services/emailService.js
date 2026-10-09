// Two HTTPS providers, never raw SMTP: Render (and many free PaaS hosts) silently drop outbound
// connections on SMTP ports like 587, so a request just hangs and emails vanish with no error.
//
// Gmail API (preferred): sends as a real Gmail account, so no domain is needed. Set
// GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN (get the token with
// `node scripts/gmail-auth.js`).
// Resend (fallback): its shared onboarding@resend.dev sender only delivers to the Resend
// account owner, so it needs a verified domain before it can email members.
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || "WIRC Changemakers <no-reply@wirc.local>";

function gmailConfigured() {
  return Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);
}

function isConfigured() {
  return gmailConfigured() || Boolean(RESEND_API_KEY);
}

function providerName() {
  if (gmailConfigured()) return "Gmail API";
  if (RESEND_API_KEY) return "Resend";
  return null;
}

// Fails fast at boot rather than at 2am when the first user forgets their password.
function assertEmailConfigured() {
  if (process.env.NODE_ENV === "production" && !isConfigured()) {
    throw new Error(
      "No email provider is configured. Password reset emails cannot be sent in production. " +
        "Set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN or RESEND_API_KEY, " +
        "or unset NODE_ENV=production."
    );
  }
}

// Access tokens last an hour; reuse one until shortly before it expires.
let gmailAccessToken = null;
let gmailAccessTokenExpiresAt = 0;

async function getGmailAccessToken() {
  if (gmailAccessToken && Date.now() < gmailAccessTokenExpiresAt - 60 * 1000) {
    return gmailAccessToken;
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gmail token refresh error ${response.status}: ${body}`);
  }
  const data = await response.json();
  gmailAccessToken = data.access_token;
  gmailAccessTokenExpiresAt = Date.now() + data.expires_in * 1000;
  return gmailAccessToken;
}

// RFC 2047 so names/subjects with non-ASCII characters (e.g. emoji) survive the header.
function encodeHeader(value) {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildMimeMessage({ to, subject, text, html }) {
  const boundary = `----=_changemakers_${Date.now().toString(36)}`;
  const part = (type, body) =>
    [
      `--${boundary}`,
      `Content-Type: ${type}; charset="UTF-8"`,
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(body, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");

  return [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    part("text/plain", text),
    part("text/html", html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function sendViaGmail(message) {
  const accessToken = await getGmailAccessToken();
  const raw = Buffer.from(buildMimeMessage(message), "utf8").toString("base64url");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gmail API error ${response.status}: ${body}`);
  }
}

async function sendViaResend({ to, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, text, html }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.log("\n--- EMAIL (no email provider configured, logging instead) ---");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("--- END EMAIL ---\n");
    return { delivered: false, logged: true };
  }

  if (gmailConfigured()) {
    await sendViaGmail({ to, subject, text, html });
  } else {
    await sendViaResend({ to, subject, text, html });
  }
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
  providerName,
  assertEmailConfigured,
};
