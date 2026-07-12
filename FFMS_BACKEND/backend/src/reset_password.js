const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hash = "$2a$12$6X2yYp0aPo0skeGlHjyhkuhwdpq/AhxjEly9bSsPuop5PDFlRY4lS"; // Password@123
  
  const emails = ['nandinikumarik729@gmail.com', 'kumarrahuljsr84@gmail.com', 'kumarrahulraj468@gmail.com', 'test@gmail.com'];
  
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
  console.log(`Successfully reset passwords for ${result.count} users to "Password@123".`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
