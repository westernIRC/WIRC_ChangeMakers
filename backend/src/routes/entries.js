const express = require("express");
const { z } = require("zod");
const { Prisma } = require("@prisma/client");

const prisma = require("../prismaClient");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getWeekStart } = require("../utils/weeks");
const { getCurrentStreak } = require("../services/streakService");
const { getSettings } = require("../services/settingsService");
const { amountSchema } = require("../utils/money");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const createEntrySchema = z.object({
  amount: amountSchema,
});

router.post(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const settings = await getSettings();
    const weekStartDate = getWeekStart(new Date());
    const hitMinimum = parsed.data.amount >= Number(settings.weeklyMinimum);

    let entry;
    try {
      entry = await prisma.weeklyEntry.create({
        data: {
          userId: req.user.id,
          weekStartDate,
          amount: parsed.data.amount,
          hitMinimum,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({ error: "You already submitted an entry for this week" });
      }
      throw err;
    }

    const streak = await getCurrentStreak(req.user.id);
    res.status(201).json({ entry, streak });
  })
);

router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const entries = await prisma.weeklyEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { weekStartDate: "desc" },
    });
    const streak = await getCurrentStreak(req.user.id);
    res.json({ entries, streak });
  })
);

module.exports = router;
