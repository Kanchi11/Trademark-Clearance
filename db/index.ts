// db/index.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const connectionString = process.env.DATABASE_URL;

// Configure connection pool to avoid overwhelming Supabase
// Supabase free tier has limited connections, so we keep pool small
const queryClient = postgres(connectionString, {
  max: 3, // Maximum 3 concurrent connections (reduced to avoid pool exhaustion)
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout 10 seconds
  max_lifetime: 60 * 30, // Maximum connection lifetime 30 minutes
  prepare: false, // Disable prepared statements for pgbouncer compatibility
});
export const db = drizzle(queryClient, { schema });
export const rawClient = queryClient; // Export raw client for complex queries