const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Password@123", 12);
  console.log("Generated hash:", hash);

  const emails = ['kumarrahulraj468@gmail.com', 'kumarrahuljsr84@gmail.com', 'nandinikumarik729@gmail.com', 'test@gmail.com'];

  const result = await prisma.user.updateMany({
    where: {
      email: {
        in: emails
      }
    },
    data: {
      passwordHash: hash
    }
  });
  console.log(`Successfully reset passwords for ${result.count} users.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
