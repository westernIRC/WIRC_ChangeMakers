const express = require("express");
const { z } = require("zod");

const prisma = require("../prismaClient");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRole, requireHouseScope } = require("../middleware/roleMiddleware");
const { getCurrentStreak, getStreaksForUsers } = require("../services/streakService");
const { adminUser } = require("../utils/serialize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authMiddleware, requireRole("vp_admin", "overall_admin"));

// Members of a House with $ amounts visible (vp_admin: own House only; overall_admin: any).
router.get(
  "/houses/:id/members",
  requireHouseScope((req) => req.params.id),
  asyncHandler(async (req, res) => {
    const members = await prisma.user.findMany({
      where: { houseId: req.params.id },
      include: { weeklyEntries: { orderBy: { weekStartDate: "desc" } } },
    });
    const streaks = await getStreaksForUsers(members.map((m) => m.id));
    res.json({
      members: members.map((m) => ({
        ...adminUser(m, streaks[m.id]),
        weeklyEntries: m.weeklyEntries,
      })),
    });
  })
);

const editEntrySchema = z.object({
  amount: z.number().positive(),
});

router.patch(
  "/entries/:id",
  requireHouseScope(async (req) => {
    const entry = await prisma.weeklyEntry.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    return entry?.user.houseId ?? null;
  }),
  asyncHandler(async (req, res) => {
    const parsed = editEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const entry = await prisma.weeklyEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const newAmount = parsed.data.amount;

    const [updatedEntry] = await prisma.$transaction([
      prisma.weeklyEntry.update({
        where: { id: entry.id },
        data: { amount: newAmount, hitMinimum: newAmount >= Number(settings.weeklyMinimum) },
      }),
      prisma.entryEditLog.create({
        data: {
          weeklyEntryId: entry.id,
          editedByUserId: req.user.id,
          previousAmount: entry.amount,
          newAmount,
        },
      }),
    ]);

    const streak = await getCurrentStreak(entry.userId);
    res.json({ entry: updatedEntry, streak });
  })
);

// Audit log: overall_admin sees everything; vp_admin is filtered to their own House's entries.
router.get(
  "/audit-log",
  asyncHandler(async (req, res) => {
    const where =
      req.user.role === "overall_admin"
        ? {}
        : { weeklyEntry: { user: { houseId: req.user.houseId } } };

    const logs = await prisma.entryEditLog.findMany({
      where,
      include: {
        weeklyEntry: { include: { user: { select: { id: true, name: true, houseId: true } } } },
        editedBy: { select: { id: true, name: true } },
      },
      orderBy: { editedAt: "desc" },
    });
    res.json({ logs });
  })
);

router.get(
  "/settings",
  requireRole("overall_admin"),
  asyncHandler(async (req, res) => {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({ settings });
  })
);

const settingsSchema = z.object({
  weeklyMinimum: z.number().positive().optional(),
  rankingMethod: z.enum(["participation_rate", "streak_length", "blended"]).optional(),
  blendedWeights: z
    .object({ participation: z.number().min(0).max(1), streak: z.number().min(0).max(1) })
    .optional(),
});

router.put(
  "/settings",
  requireRole("overall_admin"),
  asyncHandler(async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const settings = await prisma.settings.update({ where: { id: 1 }, data: parsed.data });
    res.json({ settings });
  })
);

const reassignSchema = z.object({ houseId: z.string().uuid() });

router.patch(
  "/users/:id/house",
  requireRole("overall_admin"),
  asyncHandler(async (req, res) => {
    const parsed = reassignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const house = await prisma.house.findUnique({ where: { id: parsed.data.houseId } });
    if (!house) return res.status(404).json({ error: "Target House not found" });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { houseId: parsed.data.houseId },
    });
    res.json({ user: adminUser(user) });
  })
);

module.exports = router;
