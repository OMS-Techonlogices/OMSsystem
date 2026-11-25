
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const isProductionOrCloud = Boolean(
  process.env.VERCEL ||
  process.env.NODE_ENV === 'production' ||
  (databaseUrl && databaseUrl.includes('supabase')) ||
  (databaseUrl && databaseUrl.includes('pooler')) ||
  (databaseUrl && databaseUrl.includes('neon.tech'))
);

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isProductionOrCloud ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});
