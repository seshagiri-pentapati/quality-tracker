import { z } from 'zod';

export const DEFECT_TYPES = [
  'Weave Defect',
  'Shade Variation',
  'Hole/Tear',
  'Count Deviation',
  'Other',
] as const;
export const SEVERITIES = ['Critical', 'Major', 'Minor'] as const;
export const STATUSES = ['Open', 'Resolved'] as const;
export const SORT_KEYS = ['inspection_date', 'created_at', 'severity', 'status'] as const;

export type Severity = (typeof SEVERITIES)[number];
export type SortKey = (typeof SORT_KEYS)[number];

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a valid date');

const optionalText = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const createInspectionSchema = z.object({
  inspection_date: dateString,
  machine_id: z.string().trim().min(1, 'Machine / line ID is required').max(50),
  defect_type: z.enum(DEFECT_TYPES),
  severity: z.enum(SEVERITIES),
  remarks: optionalText,
});

export const resolveInspectionSchema = z.object({
  resolution_note: z.string().trim().min(3, 'Resolution note is required').max(1000),
});

export const listQuerySchema = z.object({
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(STATUSES).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  sort: z.enum(SORT_KEYS).default('inspection_date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Payload a SAP QM notification adapter would POST. See README for the documented shape. */
export const sapPayloadSchema = z.object({
  notification_id: z.string().trim().min(1).max(50),
  work_center: z.string().trim().min(1).max(50),
  defect_type: z.enum(DEFECT_TYPES).default('Other'),
  severity: z.enum(SEVERITIES),
  inspection_date: dateString.optional(),
  description: optionalText,
});

export const idParamSchema = z.coerce.number().int().positive();
