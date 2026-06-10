require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function run() {
  const user = await prisma.user.findFirst({where: {role: 'ADMIN'}});
  const token = jwt.sign({userId: user.id}, process.env.JWT_ACCESS_SECRET, {expiresIn: '1d'});
  
  const res = await fetch('http://[::1]:5000/api/v1/attendance/today', {
    headers: {'Authorization': 'Bearer ' + token}
  });
  
  const json = await res.json();
  require('fs').writeFileSync('test_out.json', JSON.stringify(json, null, 2));
  
  prisma.$disconnect();
}

run();
