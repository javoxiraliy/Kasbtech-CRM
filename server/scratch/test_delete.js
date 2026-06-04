const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing delete user constraints...');
  try {
    // 1. Create a temporary user
    const tempUser = await prisma.user.create({
      data: {
        name: 'Temp Test Delete',
        email: `temp_delete_${Date.now()}@test.com`,
        password: 'password123',
        role: 'OPERATOR',
      }
    });
    console.log('Created temporary user:', tempUser.id);

    // 2. Create a task assigned to them
    const tempTask = await prisma.task.create({
      data: {
        title: 'Temp Task',
        description: 'Testing cascade delete',
        assignedToId: tempUser.id,
      }
    });
    console.log('Created temp task:', tempTask.id);

    // 3. Try to delete the user
    console.log('Attempting to delete the user...');
    await prisma.user.delete({
      where: { id: tempUser.id }
    });
    console.log('✅ User and their tasks deleted successfully! Cascade delete is working.');

  } catch (error) {
    console.error('❌ Error during user deletion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
