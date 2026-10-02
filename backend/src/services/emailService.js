// Sends over Resend's HTTPS API rather than raw SMTP. Render (and many free PaaS hosts)
// silently drop outbound connections on SMTP ports like 587 - a request just hangs until
// nodemailer's connection timeout fires, so emails never arrive even though nothing ever
// reports an error. HTTPS on 443 doesn't have that problem.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || "WIRC Changemakers <no-reply@wirc.local>";

function isConfigured() {
  return Boolean(RESEND_API_KEY);
}

// Fails fast at boot rather than at 2am when the first user forgets their password.
function assertEmailConfigured() {
  if (process.env.NODE_ENV === "production" && !isConfigured()) {
    throw new Error(
      "RESEND_API_KEY is not set. Password reset emails cannot be sent in production. " +
        "Set RESEND_API_KEY/MAIL_FROM, or unset NODE_ENV=production."
    );
  }
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.log("\n--- EMAIL (RESEND_API_KEY not configured, logging instead) ---");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("--- END EMAIL ---\n");
    return { delivered: false, logged: true };
  }

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
