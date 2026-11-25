
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from './prismaClient.js';

dotenv.config();

async function createMediaAdmin() {
  const email = 'media.admin@oms.com';
  const username = 'media_admin';
  const password = process.env.MEDIA_ADMIN_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error(
      'MEDIA_ADMIN_PASSWORD must be set and contain at least 12 characters.'
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: {
        username,
        name: 'Media Administrator',
        passwordHash,
        role: 'MEDIA_ADMIN',
        systemAccess: 'MEDIA',
        isActive: true,
      },
    });

    console.log('Existing Media Admin account updated.');
  } else {
    await prisma.user.create({
      data: {
        email,
        username,
        name: 'Media Administrator',
        passwordHash,
        role: 'MEDIA_ADMIN',
        systemAccess: 'MEDIA',
        isActive: true,
      },
    });

    console.log('Media Admin account created.');
  }
}

createMediaAdmin()
  .catch((error) => {
    console.error('Failed to create Media Admin:', error);
    process.exitCode = 1;
  });
