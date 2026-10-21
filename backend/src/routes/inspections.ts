import { Router } from 'express';
import { pool } from '../db';
import { AppError, asyncHandler, notFound } from '../errors';
import {
  SortKey,
  createInspectionSchema,
  idParamSchema,
  listQuerySchema,
  resolveInspectionSchema,
} from '../validation';

const router = Router();

// Critical first when sorting by severity ascending.
const SEVERITY_RANK = `CASE severity WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 ELSE 3 END`;

// Whitelist: sort keys map to SQL fragments, user input never reaches the query text.
const SORT_SQL: Record<SortKey, string> = {
  inspection_date: 'inspection_date',
  created_at: 'created_at',
  severity: SEVERITY_RANK,
  status: 'status',
};

const parseId = (raw: string) => {
  const parsed = idParamSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(400, 'INVALID_ID', 'Inspection id must be a positive integer');
  return parsed.data;
};

// POST /api/inspections
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createInspectionSchema.parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO inspections (inspection_date, machine_id, defect_type, severity, remarks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.inspection_date, input.machine_id, input.defect_type, input.severity, input.remarks],
    );
    res.status(201).json({ data: rows[0] });
  }),
);

// GET /api/inspections?severity=&status=&from=&to=&sort=&order=&limit=&offset=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);

    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };
    if (q.severity) add('severity = ?', q.severity);
    if (q.status) add('status = ?', q.status);
    if (q.from) add('inspection_date >= ?', q.from);
    if (q.to) add('inspection_date <= ?', q.to);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const direction = q.order === 'asc' ? 'ASC' : 'DESC';

    const count = await pool.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM inspections ${whereSql}`,
      params,
    );
    const rows = await pool.query(
      `SELECT * FROM inspections ${whereSql}
       ORDER BY ${SORT_SQL[q.sort]} ${direction}, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, q.limit, q.offset],
    );

    res.json({
      data: rows.rows,
      meta: { total: count.rows[0].total, limit: q.limit, offset: q.offset },
    });
  }),
);

// GET /api/inspections/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM inspections WHERE id = $1', [
      parseId(req.params.id),
    ]);
    if (!rows[0]) throw notFound('Inspection');
    res.json({ data: rows[0] });
  }),
);

// POST /api/inspections/:id/resolve  { resolution_note }
router.post(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { resolution_note } = resolveInspectionSchema.parse(req.body);

    // Single atomic UPDATE: two supervisors resolving at once cannot both succeed.
    const updated = await pool.query(
      `UPDATE inspections
          SET status = 'Resolved', resolution_note = $2, resolved_at = now()
        WHERE id = $1 AND status = 'Open'
        RETURNING *`,
      [id, resolution_note],
    );
    if (updated.rows[0]) {
      res.json({ data: updated.rows[0] });
      return;
    }

    const exists = await pool.query('SELECT 1 FROM inspections WHERE id = $1', [id]);
    if (!exists.rowCount) throw notFound('Inspection');
    throw new AppError(409, 'ALREADY_RESOLVED', 'Inspection is already resolved');
  }),
);

export default router;
