const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { Prisma } = require("@prisma/client");

const prisma = require("../prismaClient");
const {
  assignHouseForNewMember,
  NoHousesError,
} = require("../services/houseAssignmentService");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminUser } = require("../utils/serialize");
const { getCurrentStreak } = require("../services/streakService");
const { sendPasswordResetEmail } = require("../services/emailService");
const { rateLimit, ipKey, emailKey } = require("../middleware/rateLimit");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// In production the frontend (e.g. Vercel) and backend (e.g. Render) are different sites, so
// the session cookie has to be SameSite=None or the browser drops it on every cross-site XHR.
// SameSite=None is only honoured alongside Secure, so the two flags move together.
const isProd = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const req = (message) => ({ required_error: message, invalid_type_error: message });

const signupSchema = z.object({
  name: z.string(req("Please enter your name")).min(1, "Please enter your name"),
  // Normalised before validation so "  Omar@WIRC.ca " and "omar@wirc.ca" are the same account.
  // Postgres unique indexes are case-sensitive, so without this the DB happily stores both.
  email: z
    .string(req("Please enter your email"))
    .trim()
    .toLowerCase()
    .min(1, "Please enter your email")
    .email("Please enter a valid email"),
  password: z
    .string(req("Please enter a password"))
    .min(8, "Password must be at least 8 characters"),
  year: z.string().optional(),
  program: z.string().optional(),
  cause: z
    .string(req("Please tell us what cause you're fundraising for"))
    .min(1, "Please tell us what cause you're fundraising for"),
  fundraisingLink: z
    .string(req("Please enter your fundraising link"))
    .min(1, "Please enter your fundraising link")
    .url("Please enter a valid link (e.g. https://islamicrelief.ca/...)"),
  isAnonymous: z.boolean().optional(),
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, houseId: user.houseId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/signup", asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue.message, field: issue.path[0] });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return res
      .status(409)
      .json({ error: "An account with that email already exists", field: "email" });
  }

  let houseId;
  try {
    houseId = await assignHouseForNewMember();
  } catch (err) {
    if (err instanceof NoHousesError) {
      return res.status(503).json({
        error: "Signups aren't open yet - no Houses have been set up. Please contact an admin.",
      });
    }
    throw err;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        year: data.year,
        program: data.program,
        cause: data.cause,
        fundraisingLink: data.fundraisingLink || null,
        isAnonymous: Boolean(data.isAnonymous),
        houseId,
        role: "member",
      },
    });
  } catch (err) {
    // The findUnique above is a check-then-act race: two simultaneous signups with the same
    // email both pass it. The unique index is the real guard, so translate its violation too.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "An account with that email already exists", field: "email" });
    }
    throw err;
  }

  const token = signToken(user);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(201).json({ user: adminUser(user, 0) });
}));

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: emailKey,
    message: "Too many failed login attempts. Please try again in a few minutes.",
  }),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 50, keyFn: ipKey }),
  asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.cookie("token", token, COOKIE_OPTIONS);
  const streak = await getCurrentStreak(user.id);
  res.json({ user: adminUser(user, streak) });
  })
);

router.post("/logout", (req, res) => {
  const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
  res.clearCookie("token", clearOptions);
  res.json({ ok: true });
});

router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const streak = await getCurrentStreak(user.id);
  res.json({ user: adminUser(user, streak) });
}));

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

const RESET_TOKEN_TTL_MINUTES = 60;

// The raw token goes in the emailed link; only its hash is persisted. Comparing hashes means
// a leaked database can't be used to reset anyone's password.
function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

router.post(
  "/forgot-password",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyFn: emailKey,
    message: "Too many reset requests for that email. Please try again later.",
  }),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyFn: ipKey }),
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    // Always answer identically whether or not the address is registered - a differing
    // response would turn this endpoint into an account-enumeration oracle.
    const genericResponse = {
      ok: true,
      message: "If an account exists for that email, a reset link is on its way.",
    };
    if (!parsed.success) return res.json(genericResponse);

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    // Supersede any outstanding tokens so only the newest link works.
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: { tokenHash: hashResetToken(rawToken), userId: user.id, expiresAt },
      }),
    ]);

    const appUrl = process.env.APP_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    const resetUrl = `${appUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (err) {
      // Don't leak delivery failures to the caller (still no enumeration), but do surface
      // them in the logs - a silently broken mailer is worse than a noisy one.
      console.error("Failed to send password reset email:", err);
    }

    res.json(genericResponse);
  })
);

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is missing"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post(
  "/reset-password",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyFn: ipKey }),
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue.message, field: issue.path[0] });
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(parsed.data.token) },
      include: { user: true },
    });

    const invalid = { error: "This reset link is invalid or has expired. Please request a new one." };
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json(invalid);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      // Burn this token and any other outstanding ones for the account.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    // Force a fresh login rather than silently keeping any existing session alive.
    const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
    res.clearCookie("token", clearOptions);

    res.json({ ok: true, message: "Your password has been reset. You can now log in." });
  })
);

module.exports = router;
