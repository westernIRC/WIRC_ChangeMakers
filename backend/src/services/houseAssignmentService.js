const prisma = require("../prismaClient");

// Assigns a new member to the House with the fewest current members (ties broken randomly)
// to keep House sizes balanced without making assignment purely random.
async function assignHouseForNewMember() {
  const houses = await prisma.house.findMany({
    include: { _count: { select: { members: true } } },
  });
  if (houses.length === 0) {
    throw new Error("No Houses exist to assign a new member to");
  }

  const minCount = Math.min(...houses.map((h) => h._count.members));
  const candidates = houses.filter((h) => h._count.members === minCount);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen.id;
}

module.exports = { assignHouseForNewMember };
