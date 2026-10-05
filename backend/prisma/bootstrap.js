// Production-safe first-run setup: creates the Settings row and the eight Houses, and nothing
// else. Unlike `seed.js` it creates no user accounts, so it is safe to run on a live database
// as part of every deploy. Idempotent - re-running it changes nothing.
//
//   node prisma/bootstrap.js      (or: pnpm bootstrap)

const { PrismaClient } = require("@prisma/client");
const { SETTINGS_DEFAULTS } = require("../src/services/settingsService");

const prisma = new PrismaClient();

const HOUSE_NAMES = [
  { name: "Team Finance", portfolioName: "Finance" },
  { name: "Team Events", portfolioName: "Events" },
  { name: "Team Internals", portfolioName: "Internals" },
  { name: "Team Charity", portfolioName: "Charity" },
  { name: "Team Marketing", portfolioName: "Marketing" },
  { name: "Team Advocacy", portfolioName: "Advocacy" },
  { name: "Team Externals", portfolioName: "Externals" },
  { name: "Team Presidents", portfolioName: "Presidents" },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: SETTINGS_DEFAULTS,
  });
  console.log("Settings ready.");

  // Only seed Houses into an empty table. VPs can rename both name and portfolioName, so
  // matching on either would re-create a renamed House as an empty duplicate on every deploy.
  const existingCount = await prisma.house.count();
  if (existingCount === 0) {
    await prisma.house.createMany({ data: HOUSE_NAMES });
    console.log(`Houses ready (${HOUSE_NAMES.length} created).`);
  } else {
    console.log(`Houses ready (${existingCount} already exist, left untouched).`);
  }
  console.log("Bootstrap complete. No user accounts were created.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
