require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const houseRoutes = require("./routes/houses");
const entryRoutes = require("./routes/entries");
const leaderboardRoutes = require("./routes/leaderboard");
const adminRoutes = require("./routes/admin");
const { assertEmailConfigured, isConfigured } = require("./services/emailService");

const app = express();

// Render/Vercel/Railway terminate TLS at a proxy. Without this Express sees the hop as plain
// HTTP and refuses to set `secure` cookies, which silently breaks login in production.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/houses", houseRoutes);
app.use("/entries", entryRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/admin", adminRoutes);

// Unmatched routes should read as 404 JSON, not fall through to Express's HTML default -
// the frontend's API client tries to parse every response as JSON.
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Backstop for Prisma errors that escape a route's own checks. Individual handlers still
// return their own specific 404s and 409s; this only stops the generic cases from being
// reported to the user as "Internal server error" when the request was simply invalid.
const PRISMA_ERROR_STATUS = {
  P2025: [404, "Not found"], // record required by the operation does not exist
  P2002: [409, "That value is already taken"], // unique constraint violation
  P2003: [409, "That record is still referenced by other data"], // FK constraint violation
};

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const mapped = err?.code && PRISMA_ERROR_STATUS[err.code];
  if (mapped) {
    const [status, message] = mapped;
    console.warn(`${err.code} on ${req.method} ${req.path}: ${message}`);
    return res.status(status).json({ error: message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Refuse to boot a production instance that can't actually deliver password reset emails,
// rather than discovering it the first time someone locks themselves out.
assertEmailConfigured();

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Changemakers API listening on port ${port}`);
  if (!isConfigured()) {
    console.log("SMTP not configured - password reset emails will be logged to this console.");
  }
});
