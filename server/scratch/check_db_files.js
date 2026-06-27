const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const homeworks = await prisma.homework.findMany({
      where: { fileUrl: { not: null } },
      take: 10
    });
    console.log("Homeworks with files:", homeworks);

    const reports = await prisma.report.findMany({
      take: 10
    });
    console.log("Reports:", reports);
  } catch (e) {
    console.error("Error querying DB:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
