const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({select: {name: true, role: true, status: true, organizationId: true}});
  console.log(JSON.stringify(users, null, 2));
  prisma.$disconnect();
}
run();
