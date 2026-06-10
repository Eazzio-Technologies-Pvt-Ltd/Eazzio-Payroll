const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Starting territory cleanup...');
  const territories = await prisma.territory.findMany();
  
  const grouped = {};
  for (const t of territories) {
    if (!grouped[t.name]) {
      grouped[t.name] = [];
    }
    grouped[t.name].push(t);
  }

  for (const name of Object.keys(grouped)) {
    const list = grouped[name];
    if (list.length > 1) {
      console.log(`Cleaning up duplicates for territory: "${name}"`);
      const master = list[0];
      const duplicates = list.slice(1);
      
      for (const dup of duplicates) {
        console.log(`- Merging duplicate ID: ${dup.id} into master ID: ${master.id}`);
        
        // Re-assign users
        await prisma.user.updateMany({
          where: { territoryId: dup.id },
          data: { territoryId: master.id }
        });

        // Re-assign tasks
        await prisma.task.updateMany({
          where: { territoryId: dup.id },
          data: { territoryId: master.id }
        });

        // Re-assign geofence alerts
        await prisma.geofenceAlert.updateMany({
          where: { territoryId: dup.id },
          data: { territoryId: master.id }
        });

        // Delete duplicate territory
        await prisma.territory.delete({
          where: { id: dup.id }
        });
      }
    }
  }

  console.log('Cleanup finished!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
