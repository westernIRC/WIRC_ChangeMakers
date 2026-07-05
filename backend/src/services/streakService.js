const prisma = require("../prismaClient");
const { getWeekStart, addWeeks } = require("../utils/weeks");

// Consecutive weeks (ending at the current calendar week) where the user hit the minimum.
// A week with no submitted entry counts as a miss and breaks the streak.
async function getCurrentStreak(userId) {
  const entries = await prisma.weeklyEntry.findMany({
    where: { userId },
    select: { weekStartDate: true, hitMinimum: true },
  });

  const hitWeeks = new Set(
    entries.filter((e) => e.hitMinimum).map((e) => e.weekStartDate.getTime())
  );

  let streak = 0;
  let cursor = getWeekStart(new Date());
  while (hitWeeks.has(cursor.getTime())) {
    streak += 1;
    cursor = addWeeks(cursor, -1);
  }
  return streak;
}

async function getStreaksForUsers(userIds) {
  const streaks = await Promise.all(userIds.map((id) => getCurrentStreak(id)));
  return Object.fromEntries(userIds.map((id, i) => [id, streaks[i]]));
}

module.exports = { getCurrentStreak, getStreaksForUsers };
