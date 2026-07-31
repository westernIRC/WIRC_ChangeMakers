const express = require("express");
const { z } = require("zod");

const prisma = require("../prismaClient");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireRole, requireHouseScope } = require("../middleware/roleMiddleware");
const { getLeaderboard, normalizePeriod, getHouseTotal } = require("../services/rankingService");
const { getStreaksForUsers } = require("../services/streakService");
const { publicUser } = require("../utils/serialize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public: House-level aggregates, no member data.
router.get("/", asyncHandler(async (req, res) => {
  const period = normalizePeriod(req.query.period);
  const leaderboard = await getLeaderboard(period);
  res.json({ houses: leaderboard, period });
}));

// Members only: the response embeds the House's full member roster.
router.get("/:id", authMiddleware, asyncHandler(async (req, res) => {
  const house = await prisma.house.findUnique({
    where: { id: req.params.id },
    include: { members: { where: { role: "member" } } },
  });
  if (!house) return res.status(404).json({ error: "House not found" });

  const period = normalizePeriod(req.query.period);
  const [total, streaks, leaderboard] = await Promise.all([
    getHouseTotal(house.id, period),
    getStreaksForUsers(house.members.map((m) => m.id)),
    getLeaderboard(period),
  ]);

  const rankEntry = leaderboard.find((h) => h.houseId === house.id);

  res.json({
    house: {
      id: house.id,
      name: house.name,
      portfolioName: house.portfolioName,
      total,
      rank: rankEntry?.rank ?? null,
      participationRate: rankEntry?.participationRate ?? null,
      avgStreak: rankEntry?.avgStreak ?? null,
      members: house.members.map((m) => publicUser(m, streaks[m.id])),
    },
    period,
  });
}));

const renameSchema = z.object({
  name: z.string().min(1).optional(),
  portfolioName: z.string().min(1).optional(),
});

router.patch(
  "/:id",
  authMiddleware,
  requireHouseScope((req) => req.params.id),
  asyncHandler(async (req, res) => {
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const house = await prisma.house.findUnique({ where: { id: req.params.id } });
    if (!house) return res.status(404).json({ error: "House not found" });

    const updated = await prisma.house.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({ house: updated });
  })
);

const createHouseSchema = z.object({
  name: z.string().min(1),
  portfolioName: z.string().min(1),
});

router.post(
  "/",
  authMiddleware,
  requireRole("overall_admin"),
  asyncHandler(async (req, res) => {
    const parsed = createHouseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const house = await prisma.house.create({ data: parsed.data });
    res.status(201).json({ house });
  })
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("overall_admin"),
  asyncHandler(async (req, res) => {
    // Check existence explicitly: a nonexistent House also has zero members, so without this
    // the delete below would throw P2025 and surface as a 500 instead of a 404.
    const house = await prisma.house.findUnique({ where: { id: req.params.id } });
    if (!house) return res.status(404).json({ error: "House not found" });

    const memberCount = await prisma.user.count({ where: { houseId: req.params.id } });
    if (memberCount > 0) {
      return res.status(409).json({
        error: "Cannot delete a House that still has members. Reassign its members first.",
      });
    }
    await prisma.house.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

module.exports = router;
