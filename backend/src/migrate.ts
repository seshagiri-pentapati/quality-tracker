import fs from 'fs';
import path from 'path';
import type { PoolClient } from 'pg';
import { pool } from './db';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The DB container may still be starting; retry for ~20s before giving up. */
async function connectWithRetry(attempts = 10): Promise<PoolClient> {
  for (let i = 1; ; i++) {
    try {
      return await pool.connect();
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`Database not ready (attempt ${i}/${attempts}), retrying...`);
      await sleep(2000);
    }
  }
}

export async function migrate(): Promise<void> {
  const client = await connectWithRetry();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied migration ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
