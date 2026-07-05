const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const prisma = require("../prismaClient");
const { assignHouseForNewMember } = require("../services/houseAssignmentService");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminUser } = require("../utils/serialize");
const { getCurrentStreak } = require("../services/streakService");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const req = (message) => ({ required_error: message, invalid_type_error: message });

const signupSchema = z.object({
  name: z.string(req("Please enter your name")).min(1, "Please enter your name"),
  email: z
    .string(req("Please enter your email"))
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

  const houseId = await assignHouseForNewMember();
  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
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

  const token = signToken(user);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(201).json({ user: adminUser(user, 0) });
}));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", asyncHandler(async (req, res) => {
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
}));

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

module.exports = router;
