import { SEVERITIES, STATUSES, type Filters, type SortKey } from '../types';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'inspection_date', label: 'Inspection date' },
  { value: 'created_at', label: 'Logged time' },
  { value: 'severity', label: 'Severity' },
  { value: 'status', label: 'Status' },
];

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  activeCount: number;
}

export default function FilterBar({ filters, onChange, activeCount }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <details className="card filters">
      <summary>
        Filter &amp; sort{activeCount > 0 && <span className="pill">{activeCount}</span>}
      </summary>

      <div className="chips" role="group" aria-label="Severity">
        <button className={!filters.severity ? 'chip on' : 'chip'} onClick={() => set('severity', '')}>
          All severities
        </button>
        {SEVERITIES.map((s) => (
          <button
            key={s}
            className={filters.severity === s ? 'chip on' : 'chip'}
            onClick={() => set('severity', s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="chips" role="group" aria-label="Status">
        <button className={!filters.status ? 'chip on' : 'chip'} onClick={() => set('status', '')}>
          Any status
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={filters.status === s ? 'chip on' : 'chip'}
            onClick={() => set('status', s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="row">
        <label className="field">
          <span>From</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} />
        </label>
      </div>

      <div className="row">
        <label className="field">
          <span>Sort by</span>
          <select value={filters.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Order</span>
          <select value={filters.order} onChange={(e) => set('order', e.target.value as 'asc' | 'desc')}>
            <option value="desc">{filters.sort === 'severity' ? 'Minor first' : 'Newest first'}</option>
            <option value="asc">{filters.sort === 'severity' ? 'Critical first' : 'Oldest first'}</option>
          </select>
        </label>
      </div>
    </details>
  );
}
