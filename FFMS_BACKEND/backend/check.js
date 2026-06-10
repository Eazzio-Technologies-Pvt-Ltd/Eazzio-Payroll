
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  const tasks = await prisma.task.findMany({
    include: {
      assignments: { include: { user: true } }
    }
  });
  console.log('--- TASKS ---');
  console.log(JSON.stringify(tasks, null, 2));

  const users = await prisma.user.findMany({
    where: { role: 'FIELD_STAFF' },
    select: { id: true, name: true, email: true }
  });
  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));
}

checkTasks().catch(console.error).finally(() => prisma.$disconnect());

