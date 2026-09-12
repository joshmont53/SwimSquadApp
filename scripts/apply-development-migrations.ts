import { readFile } from 'node:fs/promises';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to apply development migrations');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const migrationFiles = [
    '../migrations/0009_add_squad_average_50m_seconds.sql',
    '../migrations/0010_deduplicate_active_attendance.sql',
  ];

  for (const migrationFile of migrationFiles) {
    const migration = await readFile(new URL(migrationFile, import.meta.url), 'utf8');
    await pool.query(migration);
  }
  console.log('Development database migrations applied');
} finally {
  await pool.end();
}