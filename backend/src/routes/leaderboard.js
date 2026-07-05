const express = require("express");
const { getLeaderboard, getIndividualLeaderboard, normalizePeriod } = require("../services/rankingService");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const period = normalizePeriod(req.query.period);
    const leaderboard = await getLeaderboard(period);
    res.json({ leaderboard, period });
  })
);

router.get(
  "/individuals",
  asyncHandler(async (req, res) => {
    const leaderboard = await getIndividualLeaderboard();
    res.json({ leaderboard });
  })
);

module.exports = router;
