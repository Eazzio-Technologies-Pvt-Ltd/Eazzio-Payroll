const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Scanning Database for Incorrect Attendance Status Records ---');
  
  // Find all attendance records that have check-out time and workingMinutes populated
  const records = await prisma.attendance.findMany({
    where: {
      checkOutTime: { not: null },
      workingMinutes: { not: null }
    },
    include: {
      user: {
        select: { name: true }
      }
    }
  });

  console.log(`Found ${records.length} completed attendance records. Analyzing...`);

  let incorrectCount = 0;

  for (const record of records) {
    const mins = record.workingMinutes || 0;
    const currentStatus = record.status;
    let expectedStatus = currentStatus;

    if (mins < 240) {
      expectedStatus = 'ABSENT';
    } else if (mins < 420) {
      expectedStatus = 'HALF_DAY';
    } else {
      // For >= 7 hours, it must be either PRESENT or LATE (keep current if it's LATE or PRESENT, otherwise fix to PRESENT)
      if (currentStatus !== 'LATE' && currentStatus !== 'PRESENT') {
        expectedStatus = record.isLate ? 'LATE' : 'PRESENT';
      }
    }

    if (currentStatus !== expectedStatus) {
      incorrectCount++;
      console.log(`[Mismatch] User: ${record.user?.name || 'Unknown'}, Date: ${record.date.toISOString().substring(0, 10)}, Hours: ${(mins / 60).toFixed(2)}h, Current Status: ${currentStatus}, Expected Status: ${expectedStatus}`);
      
      // Update record in database to expectedStatus
      await prisma.attendance.update({
        where: { id: record.id },
        data: { status: expectedStatus }
      });
      console.log(` -> Fixed status to ${expectedStatus}`);
    }
  }

  console.log(`Analysis complete. Fixed ${incorrectCount} incorrect records.`);
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
