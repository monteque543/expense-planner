import "dotenv/config";
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

if (!process.env.DATABASE_URL && projectRef) {
  console.error('\n⚠️  DATABASE_URL not configured!');
  console.error('To fix this, you need to get your database password from Supabase:');
  console.error(`1. Go to: https://supabase.com/dashboard/project/${projectRef}/settings/database`);
  console.error('2. Copy your database password');
  console.error('3. Update .env file with:');
  console.error(`   DATABASE_URL=postgresql://postgres.${projectRef}:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres\n`);
}

export const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
}) : null as any;

export const db = pool ? drizzle(pool, { schema }) : null as any;