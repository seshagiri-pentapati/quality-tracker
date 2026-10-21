import { Pool, types } from 'pg';
import { config } from './config';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates,
// which would otherwise shift by the server's timezone when serialised.
types.setTypeParser(1082, (value: string) => value);

export const pool = new Pool({ connectionString: config.databaseUrl });
