const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing database...");
  await prisma.attendance.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log("Seeding data...");

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Eazzio Technologies Pvt Ltd",
      email: "info@eazzio.com",
      slug: "eazzio-tech",
    }
  });

  // 2. Create Shift
  const shift = await prisma.shift.create({
    data: {
      organizationId: org.id,
      name: "Day Shift",
      startTime: "09:00",
      endTime: "18:00",
    }
  });

  // 3. Create Admin User
  const adminHash = await bcrypt.hash("Password@123", 12);
  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "System Admin",
      email: "admin@eazzio.com",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
      isSalarySlipEnabled: true,
      employeeId: "EMP-001",
    }
  });

  // 4. Create Employee User
  const employeeHash = await bcrypt.hash("Password@123", 12);
  const employee = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "John Doe",
      email: "employee@eazzio.com",
      passwordHash: employeeHash,
      role: "FIELD_STAFF",
      status: "ACTIVE",
      shiftId: shift.id,
      baseSalary: 30000,
      isSalarySlipEnabled: true,
      employeeId: "EMP-002",
    }
  });

  // 5. Create some Attendances for July 2026
  const attendancePromises = [];
  for (let i = 1; i <= 8; i++) {
    const dateStr = `2026-07-0${i}`;
    attendancePromises.push(
      prisma.attendance.create({
        data: {
          userId: employee.id,
          date: new Date(dateStr),
          status: "PRESENT",
          checkInTime: new Date(`${dateStr}T09:00:00Z`),
          checkOutTime: new Date(`${dateStr}T18:00:00Z`),
          workingMinutes: 540,
        }
      })
    );
  }
  await Promise.all(attendancePromises);

  console.log("Database seeded successfully!");
  console.log("Admin login: admin@eazzio.com / Password@123");
  console.log("Employee login: employee@eazzio.com / Password@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
