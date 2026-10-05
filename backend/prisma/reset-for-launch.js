// One-off pre-launch cleanup: removes every member account and every weekly entry (plus the
// edit logs that point at those entries). Keeps admin accounts (vp_admin / overall_admin),
// Houses (including any names the VPs changed) and Settings.
//
// Dry run by default - prints what would be deleted and changes nothing:
//   DATABASE_URL="<prod url>" node prisma/reset-for-launch.js
// Actually delete:
//   DATABASE_URL="<prod url>" node prisma/reset-for-launch.js --confirm

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const confirm = process.argv.includes("--confirm");

async function main() {
  const host = (process.env.DATABASE_URL || "").split("@")[1]?.split("/")[0] ?? "(unset)";
  console.log(`Database host: ${host}`);

  const [members, admins, entries, adminEntries, editLogs, houses] = await Promise.all([
    prisma.user.count({ where: { role: "member" } }),
    prisma.user.findMany({
      where: { role: { not: "member" } },
      select: { email: true, role: true },
      orderBy: { role: "asc" },
    }),
    prisma.weeklyEntry.aggregate({ _count: true, _sum: { amount: true } }),
    prisma.weeklyEntry.count({ where: { user: { role: { not: "member" } } } }),
    prisma.entryEditLog.count(),
    prisma.house.findMany({ select: { name: true, portfolioName: true }, orderBy: { portfolioName: "asc" } }),
  ]);

  console.log("\nWILL DELETE:");
  console.log(`  ${members} member accounts (and their password-reset tokens)`);
  console.log(`  ${entries._count} weekly entries totalling $${entries._sum.amount ?? 0}` +
    ` (${adminEntries} of them submitted by admin accounts)`);
  console.log(`  ${editLogs} entry edit logs`);
  console.log("\nWILL KEEP:");
  console.log(`  ${admins.length} admin accounts:`);
  for (const a of admins) console.log(`    ${a.role.padEnd(13)} ${a.email}`);
  console.log(`  ${houses.length} Houses:`);
  for (const h of houses) console.log(`    ${h.portfolioName.padEnd(12)} -> ${h.name}`);
  console.log("  Settings");

  if (!confirm) {
    console.log("\nDry run - nothing changed. Re-run with --confirm to delete.");
    return;
  }

  // Edit logs reference entries, and entries reference users, without cascades - so delete
  // children first, all in one transaction so a failure leaves the database untouched.
  const [logs, deletedEntries, deletedMembers] = await prisma.$transaction([
    prisma.entryEditLog.deleteMany({}),
    prisma.weeklyEntry.deleteMany({}),
    prisma.user.deleteMany({ where: { role: "member" } }),
  ]);
  console.log(`\nDeleted ${logs.count} edit logs, ${deletedEntries.count} entries, ` +
    `${deletedMembers.count} members.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
