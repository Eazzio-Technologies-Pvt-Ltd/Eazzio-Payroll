const prisma = require('./src/config/prisma');

async function test() {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        resource: 'User',
        resourceId: '123',
        newValues: { email: 'admin@tctc.com' }
      }
    });
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
