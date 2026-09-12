import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string fallback for build/demo
const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/omnivore";

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
  onnotice: () => {}, // suppress notice spam
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

