import { Router } from 'express';
import { pool } from '../db';
import { asyncHandler } from '../errors';
import { SEVERITIES } from '../validation';

const router = Router();

interface Counts {
  open: number;
  resolved: number;
}

// GET /api/summary  ->  { data: { by_severity: { Critical: {open, resolved}, ... }, totals: {open, resolved} } }
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query<{ severity: string; status: string; count: number }>(
      `SELECT severity, status, count(*)::int AS count
         FROM inspections
        GROUP BY severity, status`,
    );

    // Pre-fill zeroes so the client always gets every severity, even with no data.
    const bySeverity: Record<string, Counts> = {};
    for (const s of SEVERITIES) bySeverity[s] = { open: 0, resolved: 0 };
    const totals: Counts = { open: 0, resolved: 0 };

    for (const row of rows) {
      const key = row.status === 'Open' ? 'open' : 'resolved';
      bySeverity[row.severity][key] = row.count;
      totals[key] += row.count;
    }

    res.json({ data: { by_severity: bySeverity, totals } });
  }),
);

export default router;
