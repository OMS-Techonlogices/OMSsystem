
import prisma from './prismaClient.js';
import bcrypt from 'bcryptjs';

const UserRole = {
  ADMIN: 'ADMIN',
  MEDIA_ADMIN: 'MEDIA_ADMIN',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  SALES: 'SALES',
} as const;

export async function runSeed() {
  console.log('--- Starting OMS Invoice Seed ---');

  // Hash for default system accounts
  const passwordHash = await bcrypt.hash('Oms@123456', 10);

  // 1. Main System Admin
  await prisma.user.upsert({
    where: { email: 'admin@oms.com' },
    update: {},
    create: {
      email: 'admin@oms.com',
      name: 'مدير النظام (Admin)',
      passwordHash,
      role: UserRole.ADMIN,
      systemAccess: 'ALL',
      phone: '+201000000001',
    },
  });

  // 2. Media Admin - Media System Only
  const mediaAdminPassword = process.env.MEDIA_ADMIN_PASSWORD;

  if (!mediaAdminPassword) {
    throw new Error(
      'MEDIA_ADMIN_PASSWORD environment variable is required to create the Media Admin account.'
    );
  }

  const mediaAdminPasswordHash = await bcrypt.hash(
    mediaAdminPassword,
    10
  );

  await prisma.user.upsert({
    where: { email: 'media.admin@oms.com' },
    update: {
      role: UserRole.MEDIA_ADMIN,
      systemAccess: 'MEDIA',
      isActive: true,
    },
    create: {
      email: 'media.admin@oms.com',
      username: 'media_admin',
      name: 'Media Administrator',
      passwordHash: mediaAdminPasswordHash,
      role: UserRole.MEDIA_ADMIN,
      systemAccess: 'MEDIA',
      isActive: true,
    },
  });

  // 3. Finance Manager
  await prisma.user.upsert({
    where: { email: 'finance@oms.com' },
    update: {},
    create: {
      email: 'finance@oms.com',
      name: 'أحمد سعيد (Finance Manager)',
      passwordHash,
      role: UserRole.FINANCE_MANAGER,
      phone: '+201000000002',
    },
  });

  // 4. Accountant
  await prisma.user.upsert({
    where: { email: 'accountant@oms.com' },
    update: {},
    create: {
      email: 'accountant@oms.com',
      name: 'محمود فهمي (Accountant)',
      passwordHash,
      role: UserRole.ACCOUNTANT,
      phone: '+201000000003',
    },
  });

  // 5. Sales Representative
  await prisma.user.upsert({
    where: { email: 'sales@oms.com' },
    update: {},
    create: {
      email: 'sales@oms.com',
      name: 'سارة خالد (Sales Representative)',
      passwordHash,
      role: UserRole.SALES,
      phone: '+201000000004',
    },
  });

  // 6. Reset Approval Rules
  await prisma.approvalRule.deleteMany({});

  const rules = [
    {
      levelOrder: 1,
      minAmount: 0,
      maxAmount: 15000,
      requiredRole: UserRole.ACCOUNTANT,
      description: 'الفواتير العادية والصغيرة (حتى 15,000 ج.م)',
    },
    {
      levelOrder: 2,
      minAmount: 15000.01,
      maxAmount: 60000,
      requiredRole: UserRole.FINANCE_MANAGER,
      description: 'الفواتير المتوسطة وحملات التسويق (15,001 إلى 60,000 ج.م)',
    },
    {
      levelOrder: 3,
      minAmount: 60000.01,
      maxAmount: 10000000,
      requiredRole: UserRole.ADMIN,
      description: 'الفواتير الكبرى ومشاريع البرمجيات الاستثنائية (أكثر من 60,000 ج.م)',
    },
  ];

  for (const rule of rules) {
    await prisma.approvalRule.create({
      data: rule,
    });
  }

  console.log('Media Admin account configured successfully.');
  console.log('OMS Invoice Seed finished successfully.');
}
