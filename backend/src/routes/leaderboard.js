const express = require("express");
const { getLeaderboard, getIndividualLeaderboard, normalizePeriod } = require("../services/rankingService");
const { authMiddleware } = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public: House-level aggregates only. No member is named or individually identifiable here,
// so this is safe to show on the logged-out landing page.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const period = normalizePeriod(req.query.period);
    const leaderboard = await getLeaderboard(period);
    res.json({ leaderboard, period });
  })
);

// Members only: this names every participant and their streak. Publishing a roster of
// students to the open internet isn't something they consented to at signup.
router.get(
  "/individuals",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const leaderboard = await getIndividualLeaderboard();
    res.json({ leaderboard });
  })
);

module.exports = router;
