const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { getWeekStart, addWeeks } = require("../src/utils/weeks");

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

const WEEKLY_MINIMUM = 10;
const PASSWORD = "password123";

// Six-week history patterns (oldest -> newest), each entry either an amount or null for "no submission".
const MEMBER_PATTERNS = [
  [12, 15, 10, 20, 10, 15], // consistent
  [null, null, null, 12, 18, 10], // recently started, on a streak
  [10, null, 10, null, 10, null], // inconsistent
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      weeklyMinimum: WEEKLY_MINIMUM,
      rankingMethod: "blended",
      blendedWeights: { participation: 0.6, streak: 0.4 },
    },
  });

  const overallAdmin = await prisma.user.upsert({
    where: { email: "overall.admin@wirc.test" },
    update: {},
    create: {
      name: "Overall Admin",
      email: "overall.admin@wirc.test",
      passwordHash,
      role: "overall_admin",
    },
  });
  console.log(`Overall admin: ${overallAdmin.email} / ${PASSWORD}`);

  const currentWeekStart = getWeekStart(new Date());

  for (const { name, portfolioName } of HOUSE_NAMES) {
    const house =
      (await prisma.house.findFirst({ where: { name } })) ??
      (await prisma.house.create({ data: { name, portfolioName } }));

    const slug = slugify(portfolioName);
    const vp = await prisma.user.upsert({
      where: { email: `vp.${slug}@wirc.test` },
      update: {},
      create: {
        name: `${portfolioName} VP`,
        email: `vp.${slug}@wirc.test`,
        passwordHash,
        role: "vp_admin",
        houseId: house.id,
      },
    });
    console.log(`VP admin: ${vp.email} / ${PASSWORD}`);

    for (let i = 0; i < MEMBER_PATTERNS.length; i++) {
      const email = `member${i + 1}.${slug}@wirc.test`;
      const member = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: `${portfolioName} Member ${i + 1}`,
          email,
          passwordHash,
          role: "member",
          houseId: house.id,
          year: "2nd Year",
          program: "General Studies",
          cause: "Emergency Relief Fund",
          fundraisingLink: "https://islamicrelief.ca/example-campaign",
          isAnonymous: i === 2,
        },
      });

      const pattern = MEMBER_PATTERNS[i];
      for (let w = 0; w < pattern.length; w++) {
        const amount = pattern[w];
        if (amount === null) continue;
        const weekStartDate = addWeeks(currentWeekStart, -(pattern.length - 1 - w));
        await prisma.weeklyEntry.upsert({
          where: { userId_weekStartDate: { userId: member.id, weekStartDate } },
          update: {},
          create: {
            userId: member.id,
            weekStartDate,
            amount,
            hitMinimum: amount >= WEEKLY_MINIMUM,
          },
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
