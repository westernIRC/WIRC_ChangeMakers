const prisma = require("../prismaClient");

// `prisma migrate deploy` creates the Settings table but no row in it. Every read path used to
// assume the seed had run, so a freshly deployed instance 500'd on the first entry submission
// and on every leaderboard load. Upserting the defaults here makes the app self-healing.
const DEFAULTS = {
  id: 1,
  weeklyMinimum: 10.0,
  rankingMethod: "blended",
  blendedWeights: { participation: 0.6, streak: 0.4 },
};

async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: DEFAULTS,
  });
}

module.exports = { getSettings, SETTINGS_DEFAULTS: DEFAULTS };
