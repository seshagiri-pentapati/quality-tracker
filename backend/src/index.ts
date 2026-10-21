import { createApp } from './app';
import { config } from './config';
import { pool } from './db';
import { migrate } from './migrate';

async function main() {
  await migrate();
  const server = createApp().listen(config.port, () => {
    console.log(`API listening on :${config.port}`);
  });

  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
