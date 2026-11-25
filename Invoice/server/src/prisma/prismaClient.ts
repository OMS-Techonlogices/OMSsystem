import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// في بيئة التطوير المحلية، احتفظ بنفس الـ instance لتفادي تعدد الاتصالات
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
export { prisma };
