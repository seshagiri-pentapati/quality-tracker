import { useCallback, useEffect, useState } from 'react';
import { ApiError, listInspections } from '../api';
import type { Filters, Inspection } from '../types';
import FilterBar from './FilterBar';
import ResolveSheet from './ResolveSheet';

const DEFAULT_FILTERS: Filters = {
  severity: '',
  status: 'Open', // supervisors mostly care about what still needs action
  from: '',
  to: '',
  sort: 'inspection_date',
  order: 'desc',
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function InspectionList({ onMessage }: { onMessage: (msg: string) => void }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Inspection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInspections(filters);
      setItems(res.data);
      setTotal(res.total ?? res.data.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = [filters.severity, filters.status, filters.from, filters.to].filter(Boolean).length;

  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} activeCount={activeCount} />

      <p className="muted count">
        {loading ? 'Loading…' : `${total} inspection${total === 1 ? '' : 's'}`}
        {activeCount > 0 && (
          <button className="link" onClick={() => setFilters({ ...DEFAULT_FILTERS, status: '' })}>
            Clear filters
          </button>
        )}
      </p>

      {error && (
        <div className="card error" role="alert">
          {error} <button className="link" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="card empty">No inspections match these filters.</div>
      )}

      <ul className="list">
        {items.map((it) => (
          <li key={it.id} className={`card item sev-border-${it.severity.toLowerCase()}`}>
            <div className="item-head">
              <strong>{it.machine_id}</strong>
              <span className={`badge sev-${it.severity.toLowerCase()}`}>{it.severity}</span>
            </div>
            <div className="item-meta">
              {it.defect_type} · {formatDate(it.inspection_date)} · #{it.id}
            </div>
            {it.remarks && <p className="item-text">{it.remarks}</p>}

            {it.status === 'Resolved' ? (
              <div className="resolved">
                <span className="badge status-resolved">Resolved</span>
                <p className="item-text">{it.resolution_note}</p>
              </div>
            ) : (
              <button className="btn" onClick={() => setResolving(it)}>
                Resolve
              </button>
            )}
          </li>
        ))}
      </ul>

      {resolving && (
        <ResolveSheet
          inspection={resolving}
          onClose={() => setResolving(null)}
          onResolved={(updated) => {
            setResolving(null);
            onMessage(`Resolved #${updated.id}`);
            load();
          }}
        />
      )}
    </>
  );
}
