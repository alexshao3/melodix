import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Melodix...');

  // Demo user (password: melodix123)
  const hash = await bcrypt.hash('melodix123', 10);
  await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      email: 'demo@melodix.app',
      username: 'demo',
      password: hash,
      displayName: 'Demo Listener',
    },
  });

  console.log('Done. Login: demo@melodix.app / melodix123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
