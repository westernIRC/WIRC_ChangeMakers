const prisma = require("../prismaClient");
const { getPeriodStart } = require("../utils/weeks");
const { getStreaksForUsers } = require("./streakService");

const VALID_PERIODS = ["week", "month", "rolling3mo", "all"];

function normalizePeriod(period) {
  return VALID_PERIODS.includes(period) ? period : "all";
}

async function getHouseTotal(houseId, period) {
  const periodStart = getPeriodStart(normalizePeriod(period));
  const result = await prisma.weeklyEntry.aggregate({
    where: {
      user: { houseId },
      ...(periodStart ? { weekStartDate: { gte: periodStart } } : {}),
    },
    _sum: { amount: true },
  });
  return Number(result._sum.amount || 0);
}

async function getParticipationRate(houseId, period) {
  const periodStart = getPeriodStart(normalizePeriod(period));
  const members = await prisma.user.findMany({
    where: { houseId, role: "member" },
    select: { id: true },
  });
  if (members.length === 0) return 0;

  const memberIds = members.map((m) => m.id);
  const entries = await prisma.weeklyEntry.findMany({
    where: {
      userId: { in: memberIds },
      hitMinimum: true,
      ...(periodStart ? { weekStartDate: { gte: periodStart } } : {}),
    },
    select: { userId: true },
  });

  const hittingIds = new Set(entries.map((e) => e.userId));
  return hittingIds.size / members.length;
}

async function getAvgStreak(houseId) {
  const members = await prisma.user.findMany({
    where: { houseId, role: "member" },
    select: { id: true },
  });
  if (members.length === 0) return 0;

  const streaks = await getStreaksForUsers(members.map((m) => m.id));
  const values = Object.values(streaks);
  return values.reduce((sum, s) => sum + s, 0) / values.length;
}

async function getHouseScore(houseId, period, settings) {
  const participationRate = await getParticipationRate(houseId, period);
  const avgStreak = await getAvgStreak(houseId);

  switch (settings.rankingMethod) {
    case "participation_rate":
      return participationRate;
    case "streak_length":
      return avgStreak;
    case "blended":
    default: {
      const weights = settings.blendedWeights || { participation: 0.6, streak: 0.4 };
      // Normalize streak into a comparable 0-1-ish scale relative to a 12-week horizon
      // so it doesn't dominate/underweight the 0-1 participation rate arbitrarily.
      const normalizedStreak = Math.min(avgStreak / 12, 1);
      return weights.participation * participationRate + weights.streak * normalizedStreak;
    }
  }
}

// Ranks individual members by current streak, independent of how their House is doing overall.
// Never includes dollar amounts (those stay private) - streak is the public consistency signal.
async function getIndividualLeaderboard() {
  const members = await prisma.user.findMany({
    where: { role: "member" },
    include: { house: { select: { id: true, name: true } } },
  });

  const streaks = await getStreaksForUsers(members.map((m) => m.id));

  const rows = members.map((m) => ({
    userId: m.id,
    name: m.isAnonymous ? "Anonymous" : m.name,
    isAnonymous: m.isAnonymous,
    houseId: m.house?.id ?? null,
    houseName: m.house?.name ?? null,
    streak: streaks[m.id],
  }));

  rows.sort((a, b) => b.streak - a.streak);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

async function getLeaderboard(period) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const houses = await prisma.house.findMany();

  const rows = await Promise.all(
    houses.map(async (house) => {
      const [total, participationRate, avgStreak, score] = await Promise.all([
        getHouseTotal(house.id, period),
        getParticipationRate(house.id, period),
        getAvgStreak(house.id),
        getHouseScore(house.id, period, settings),
      ]);
      return {
        houseId: house.id,
        name: house.name,
        portfolioName: house.portfolioName,
        total,
        participationRate,
        avgStreak,
        score,
      };
    })
  );

  rows.sort((a, b) => b.score - a.score);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

module.exports = {
  getHouseTotal,
  getParticipationRate,
  getAvgStreak,
  getHouseScore,
  getLeaderboard,
  getIndividualLeaderboard,
  normalizePeriod,
  VALID_PERIODS,
};
