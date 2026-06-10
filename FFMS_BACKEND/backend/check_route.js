const prisma = require('c:/Users/rahulkumar/Desktop/FFMS_TEMP/FFMS_NANDINI/backend/src/config/prisma');

async function main() {
  const logsGrouped = await prisma.locationLog.groupBy({
    by: ['userId'],
    _count: {
      id: true
    }
  });
  console.log("--- Logs Grouped by User ---");
  for (const group of logsGrouped) {
    const user = await prisma.user.findUnique({
      where: { id: group.userId },
      select: { name: true }
    });
    console.log(`${user ? user.name : 'Unknown User'} (${group.userId}): ${group._count.id} logs`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
