import { Router } from 'express';
import { config } from '../config';
import { pool } from '../db';
import { AppError, asyncHandler } from '../errors';
import { sapPayloadSchema } from '../validation';

const router = Router();

// POST /api/sap-webhook
// Mock of a SAP QM quality-notification push. Idempotent on notification_id:
// SAP retries delivery, so the same notification must never create two inspections.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (config.sapApiKey && req.header('x-api-key') !== config.sapApiKey) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid x-api-key header');
    }

    const p = sapPayloadSchema.parse(req.body);
    const date = p.inspection_date ?? new Date().toISOString().slice(0, 10);

    const inserted = await pool.query(
      `INSERT INTO inspections
         (inspection_date, machine_id, defect_type, severity, remarks, source, external_ref)
       VALUES ($1, $2, $3, $4, $5, 'sap', $6)
       ON CONFLICT (external_ref) DO NOTHING
       RETURNING *`,
      [date, p.work_center, p.defect_type, p.severity, p.description, p.notification_id],
    );
    if (inserted.rows[0]) {
      res.status(201).json({ data: inserted.rows[0], meta: { duplicate: false } });
      return;
    }

    const existing = await pool.query('SELECT * FROM inspections WHERE external_ref = $1', [
      p.notification_id,
    ]);
    res.status(200).json({ data: existing.rows[0], meta: { duplicate: true } });
  }),
);

export default router;
