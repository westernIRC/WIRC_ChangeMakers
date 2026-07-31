const prisma = require("../prismaClient");
const { getWeekStart, addWeeks } = require("../utils/weeks");

// Consecutive weeks where the user hit the minimum, counting back from the most recent
// *completed* week.
//
// The current week is treated as still in progress rather than as a miss: a member with a
// 12-week streak who simply hasn't submitted yet on a Monday morning keeps their 12. Missing
// the week *before* this one still breaks the streak, so the mechanic keeps its teeth.
function computeStreak(hitWeekTimes) {
  const hitWeeks = hitWeekTimes instanceof Set ? hitWeekTimes : new Set(hitWeekTimes);

  let cursor = getWeekStart(new Date());
  if (!hitWeeks.has(cursor.getTime())) {
    cursor = addWeeks(cursor, -1);
  }

  let streak = 0;
  while (hitWeeks.has(cursor.getTime())) {
    streak += 1;
    cursor = addWeeks(cursor, -1);
  }
  return streak;
}

// Batched: one query for every user, streaks computed in memory. Previously this ran a
// separate query per user, which made the leaderboard scale linearly with membership.
async function getStreaksForUsers(userIds) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return {};

  const entries = await prisma.weeklyEntry.findMany({
    where: { userId: { in: ids }, hitMinimum: true },
    select: { userId: true, weekStartDate: true },
  });

  const byUser = new Map(ids.map((id) => [id, new Set()]));
  for (const entry of entries) {
    byUser.get(entry.userId)?.add(entry.weekStartDate.getTime());
  }

  return Object.fromEntries(ids.map((id) => [id, computeStreak(byUser.get(id))]));
}

async function getCurrentStreak(userId) {
  const streaks = await getStreaksForUsers([userId]);
  return streaks[userId] ?? 0;
}

module.exports = { getCurrentStreak, getStreaksForUsers, computeStreak };
