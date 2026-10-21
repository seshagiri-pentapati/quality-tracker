export const DEFECT_TYPES = [
  'Weave Defect',
  'Shade Variation',
  'Hole/Tear',
  'Count Deviation',
  'Other',
] as const;
export const SEVERITIES = ['Critical', 'Major', 'Minor'] as const;
export const STATUSES = ['Open', 'Resolved'] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Status = (typeof STATUSES)[number];
export type SortKey = 'inspection_date' | 'created_at' | 'severity' | 'status';

export interface Inspection {
  id: number;
  inspection_date: string; // YYYY-MM-DD
  machine_id: string;
  defect_type: DefectType;
  severity: Severity;
  remarks: string | null;
  status: Status;
  resolution_note: string | null;
  resolved_at: string | null;
  source: 'manual' | 'sap';
  created_at: string;
}

export interface NewInspection {
  inspection_date: string;
  machine_id: string;
  defect_type: DefectType;
  severity: Severity;
  remarks?: string;
}

export interface Filters {
  severity: '' | Severity;
  status: '' | Status;
  from: string;
  to: string;
  sort: SortKey;
  order: 'asc' | 'desc';
}

export interface Counts {
  open: number;
  resolved: number;
}

export interface Summary {
  by_severity: Record<Severity, Counts>;
  totals: Counts;
}
