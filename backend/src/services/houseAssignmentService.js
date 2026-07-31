const prisma = require("../prismaClient");

// Distinguishes "the database has no Houses yet" (an expected state on a freshly migrated
// deploy, and the caller's problem to report) from a genuine failure.
class NoHousesError extends Error {
  constructor() {
    super("No Houses exist to assign a new member to");
    this.name = "NoHousesError";
  }
}

// Assigns a new member to the House with the fewest current members (ties broken randomly)
// to keep House sizes balanced without making assignment purely random.
async function assignHouseForNewMember() {
  const houses = await prisma.house.findMany({
    include: { _count: { select: { members: true } } },
  });
  if (houses.length === 0) {
    throw new NoHousesError();
  }

  const minCount = Math.min(...houses.map((h) => h._count.members));
  const candidates = houses.filter((h) => h._count.members === minCount);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen.id;
}

module.exports = { assignHouseForNewMember, NoHousesError };
