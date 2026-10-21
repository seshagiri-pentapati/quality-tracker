import cors from 'cors';
import express from 'express';
import { config } from './config';
import { pool } from './db';
import { AppError, asyncHandler, errorHandler } from './errors';
import inspections from './routes/inspections';
import sapWebhook from './routes/sapWebhook';
import summary from './routes/summary';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      await pool.query('SELECT 1');
      res.json({ data: { status: 'ok' } });
    }),
  );

  app.use('/api/inspections', inspections);
  app.use('/api/summary', summary);
  app.use('/api/sap-webhook', sapWebhook);

  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));
  app.use(errorHandler);

  return app;
}
