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

  let created = 0;
  for (const { name, portfolioName } of HOUSE_NAMES) {
    const existing = await prisma.house.findFirst({ where: { name } });
    if (!existing) {
      await prisma.house.create({ data: { name, portfolioName } });
      created += 1;
    }
  }
  console.log(`Houses ready (${created} created, ${HOUSE_NAMES.length - created} already existed).`);
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
