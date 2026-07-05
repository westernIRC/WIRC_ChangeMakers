const express = require("express");
const { z } = require("zod");

const prisma = require("../prismaClient");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getCurrentStreak } = require("../services/streakService");
const { publicUser, adminUser } = require("../utils/serialize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const updateSelfSchema = z.object({
  isAnonymous: z.boolean(),
});

// Self-service: a member can toggle their own anonymity at any time.
router.patch(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = updateSelfSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: parsed.data,
    });
    const streak = await getCurrentStreak(user.id);
    res.json({ user: adminUser(user, streak) });
  })
);

// Public profile - never exposes dollar amounts or email.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const streak = await getCurrentStreak(user.id);
    res.json({ user: publicUser(user, streak) });
  })
);

module.exports = router;
