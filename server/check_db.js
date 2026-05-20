const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users);
  } catch (e) {
    console.error("Error querying DB:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
