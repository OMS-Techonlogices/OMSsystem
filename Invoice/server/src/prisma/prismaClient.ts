import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (url && url.includes(':6543') && !url.includes('pgbouncer=true')) {
    url += url.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
  }
  return url;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const dbUrl = getDatabaseUrl();

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// في بيئة التطوير المحلية، احتفظ بنفس الـ instance لتفادي تعدد الاتصالات
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
export { prisma };
