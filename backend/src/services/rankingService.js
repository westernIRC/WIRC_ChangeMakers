const prisma = require("../prismaClient");
const { getPeriodStart, getWeekStart } = require("../utils/weeks");
const { getStreaksForUsers } = require("./streakService");
const { getSettings } = require("./settingsService");

const VALID_PERIODS = ["week", "month", "rolling3mo", "all"];

// Who competes: members plus each House's VP ("team captain"). Every House has exactly one VP,
// so counting them is even across Houses. The overall admin belongs to no House and never
// competes.
const COMPETING_ROLES = ["member", "vp_admin"];
const isCompeting = (user) => COMPETING_ROLES.includes(user.role);

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

// Scores are floats, so two Houses that are genuinely level can differ in the last bit or two.
// Anything under this counts as a tie rather than a rank.
const SCORE_EPSILON = 1e-9;

// Consistency first, then money. With eight Houses and small rosters, ties on the consistency
// score are common - any week where every member of two Houses logs a donation gives both a
// 100% rate and the same average streak. Those ties used to land in whatever order Postgres
// returned the Houses, so a House could gain or lose a rank without anything about it changing.
//
// Amount raised breaks the tie. It stays strictly secondary: a House never out-ranks a more
// consistent one by raising more, and the total is already public on the leaderboard, so this
// exposes nothing new. Totals are compared in whole cents, which is the precision they're
// stored and displayed at - summing floats makes a raw comparison unreliable below that.
//
// Under the blended method a score tie means the participation/streak combination is level.
// Under participation_rate or streak_length the admin has chosen a single metric, so a tie on
// that metric is the tie - the other metric is deliberately not consulted.
function compareHouses(a, b) {
  if (Math.abs(a.score - b.score) > SCORE_EPSILON) return b.score - a.score;

  const cents = Math.round(b.total * 100) - Math.round(a.total * 100);
  if (cents !== 0) return cents;

  // Dead level on both. Order by name so the standings don't reshuffle between requests.
  return a.name.localeCompare(b.name);
}

// Ranks every competitor (members and captains) by current streak, independent of how their
// House is doing overall. Never includes dollar amounts (those stay private) - streak is the
// public consistency signal, so it alone decides rank.
//
// Equal streaks share a rank (1, 1, 1, 4, ...): nobody in a tie did better than anyone else.
// Within a tie, whoever submitted earliest this week is listed first, then people who haven't
// submitted yet. Display name and id settle the rest so the order is stable between requests.
async function getIndividualLeaderboard() {
  const members = await prisma.user.findMany({
    where: { role: { in: COMPETING_ROLES } },
    include: { house: { select: { id: true, name: true } } },
  });

  const ids = members.map((m) => m.id);
  const [streaks, thisWeekEntries] = await Promise.all([
    getStreaksForUsers(ids),
    prisma.weeklyEntry.findMany({
      where: { userId: { in: ids }, weekStartDate: getWeekStart() },
      select: { userId: true, submittedAt: true },
    }),
  ]);
  const submittedAtByUser = new Map(
    thisWeekEntries.map((e) => [e.userId, e.submittedAt.getTime()])
  );

  const rows = members.map((m) => ({
    userId: m.id,
    name: m.isAnonymous ? "Anonymous" : m.name,
    isAnonymous: m.isAnonymous,
    isCaptain: !m.isAnonymous && m.role === "vp_admin",
    houseId: m.house?.id ?? null,
    houseName: m.house?.name ?? null,
    streak: streaks[m.id],
  }));

  const submittedAt = (row) => submittedAtByUser.get(row.userId) ?? Infinity;
  rows.sort(
    (a, b) =>
      b.streak - a.streak ||
      submittedAt(a) - submittedAt(b) ||
      a.name.localeCompare(b.name) ||
      a.userId.localeCompare(b.userId)
  );

  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.streak !== rows[i - 1].streak) rank = i + 1;
    return { ...row, rank };
  });
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

  const memberIds = users.filter(isCompeting).map((u) => u.id);
  const streaks = await getStreaksForUsers(memberIds);

  const userById = new Map(users.map((u) => [u.id, u]));

  // House totals count every user's entries (admins included), matching getHouseTotal.
  // Participation counts competitors only (members and captains), so it is accumulated separately.
  const totalByHouse = new Map();
  const hitMembersByHouse = new Map();
  for (const entry of periodEntries) {
    const user = userById.get(entry.userId);
    if (!user?.houseId) continue;

    totalByHouse.set(user.houseId, (totalByHouse.get(user.houseId) ?? 0) + Number(entry.amount));

    if (entry.hitMinimum && isCompeting(user)) {
      if (!hitMembersByHouse.has(user.houseId)) hitMembersByHouse.set(user.houseId, new Set());
      hitMembersByHouse.get(user.houseId).add(entry.userId);
    }
  }

  const membersByHouse = new Map();
  for (const user of users) {
    if (!isCompeting(user) || !user.houseId) continue;
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

  rows.sort(compareHouses);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

module.exports = {
  getHouseTotal,
  scoreHouse,
  compareHouses,
  getLeaderboard,
  getIndividualLeaderboard,
  normalizePeriod,
  VALID_PERIODS,
  COMPETING_ROLES,
};
