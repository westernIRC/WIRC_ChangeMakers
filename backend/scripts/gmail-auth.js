// One-time helper: signs in to the sending Gmail account and prints the GMAIL_REFRESH_TOKEN
// for emailService.js. Needs an OAuth client of type "Desktop app" from Google Cloud.
//
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-auth.js
//
// Open the printed link, sign in as the account emails should come from, and approve.

const http = require("http");

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code) {
    res.end(`Sign-in failed: ${error || "no code returned"}. Check the terminal.`);
    console.error(`Sign-in failed: ${error || "no code returned"}`);
    server.close();
    return;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();

  if (!response.ok || !data.refresh_token) {
    res.end("Could not get a refresh token. Check the terminal.");
    console.error("Token exchange failed:", data);
    server.close();
    return;
  }

  res.end("Done - you can close this tab and go back to the terminal.");
  console.log("\nAdd this to the backend's environment (Render > Environment):\n");
  console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}\n`);
  server.close();
});

function redirectUri() {
  return `http://127.0.0.1:${server.address().port}`;
}

server.listen(0, "127.0.0.1", () => {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  console.log("Open this link, sign in as the sending Gmail account, and approve:\n");
  console.log(`${authUrl}\n`);
  console.log("Waiting for Google to redirect back...");
});
