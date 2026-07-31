const prisma = require("../prismaClient");
const { getPeriodStart } = require("../utils/weeks");
const { getStreaksForUsers } = require("./streakService");
const { getSettings } = require("./settingsService");

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

// Pure scoring - takes already-computed inputs. Previously this refetched participation and
// streaks itself, which meant the leaderboard computed both twice for every House.
function scoreHouse(participationRate, avgStreak, settings) {
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

// Builds the whole leaderboard from a fixed number of queries (settings, houses, users,
// period entries, streak entries) and aggregates in memory. The previous implementation
// issued a query per member per House per metric - 112 round trips for 26 members.
async function getLeaderboard(period) {
  const periodStart = getPeriodStart(normalizePeriod(period));
  const settings = await getSettings();

  const [houses, users] = await Promise.all([
    prisma.house.findMany(),
    prisma.user.findMany({ select: { id: true, houseId: true, role: true } }),
  ]);

  const periodEntries = await prisma.weeklyEntry.findMany({
    where: periodStart ? { weekStartDate: { gte: periodStart } } : {},
    select: { userId: true, amount: true, hitMinimum: true },
  });

  const memberIds = users.filter((u) => u.role === "member").map((u) => u.id);
  const streaks = await getStreaksForUsers(memberIds);

  const userById = new Map(users.map((u) => [u.id, u]));

  // House totals count every user's entries (admins included), matching getHouseTotal.
  // Participation is members-only, so it is accumulated separately.
  const totalByHouse = new Map();
  const hitMembersByHouse = new Map();
  for (const entry of periodEntries) {
    const user = userById.get(entry.userId);
    if (!user?.houseId) continue;

    totalByHouse.set(user.houseId, (totalByHouse.get(user.houseId) ?? 0) + Number(entry.amount));

    if (entry.hitMinimum && user.role === "member") {
      if (!hitMembersByHouse.has(user.houseId)) hitMembersByHouse.set(user.houseId, new Set());
      hitMembersByHouse.get(user.houseId).add(entry.userId);
    }
  }

  const membersByHouse = new Map();
  for (const user of users) {
    if (user.role !== "member" || !user.houseId) continue;
    if (!membersByHouse.has(user.houseId)) membersByHouse.set(user.houseId, []);
    membersByHouse.get(user.houseId).push(user.id);
  }

  const rows = houses.map((house) => {
    const members = membersByHouse.get(house.id) ?? [];
    const total = totalByHouse.get(house.id) ?? 0;
    const participationRate = members.length
      ? (hitMembersByHouse.get(house.id)?.size ?? 0) / members.length
      : 0;
    const avgStreak = members.length
      ? members.reduce((sum, id) => sum + (streaks[id] ?? 0), 0) / members.length
      : 0;

    return {
      houseId: house.id,
      name: house.name,
      portfolioName: house.portfolioName,
      total,
      participationRate,
      avgStreak,
      score: scoreHouse(participationRate, avgStreak, settings),
    };
  });

  rows.sort((a, b) => b.score - a.score);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

module.exports = {
  getHouseTotal,
  scoreHouse,
  getLeaderboard,
  getIndividualLeaderboard,
  normalizePeriod,
  VALID_PERIODS,
};
