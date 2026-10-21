import type { Filters, Inspection, NewInspection, Summary } from './types';

// Empty in dev/docker (same-origin /api via proxy). Set VITE_API_URL when the API is on another host.
const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; total?: number }> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error?.details,
    );
  }
  return { data: body.data as T, total: body.meta?.total };
}

export const createInspection = (input: NewInspection) =>
  request<Inspection>('/api/inspections', { method: 'POST', body: JSON.stringify(input) }).then(
    (r) => r.data,
  );

export const listInspections = (filters: Filters) => {
  const params = new URLSearchParams({ sort: filters.sort, order: filters.order });
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return request<Inspection[]>(`/api/inspections?${params}`);
};

export const resolveInspection = (id: number, resolution_note: string) =>
  request<Inspection>(`/api/inspections/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution_note }),
  }).then((r) => r.data);

export const getSummary = () => request<Summary>('/api/summary').then((r) => r.data);
