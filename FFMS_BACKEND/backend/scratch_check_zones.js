const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const zones = await prisma.territory.findMany();
  console.log('--- TERRITORIES/ZONES IN DATABASE ---');
  console.log(JSON.stringify(zones, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
