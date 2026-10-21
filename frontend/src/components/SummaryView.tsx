import { useEffect, useState } from 'react';
import { ApiError, getSummary } from '../api';
import { SEVERITIES, type Summary } from '../types';

export default function SummaryView() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load summary'));
  }, []);

  if (error) return <div className="card error" role="alert">{error}</div>;
  if (!summary) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="totals">
        <div className="card total">
          <span className="total-num">{summary.totals.open}</span>
          <span className="muted">Open</span>
        </div>
        <div className="card total">
          <span className="total-num">{summary.totals.resolved}</span>
          <span className="muted">Resolved</span>
        </div>
      </div>

      <div className="card">
        <table className="summary">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Open</th>
              <th>Resolved</th>
            </tr>
          </thead>
          <tbody>
            {SEVERITIES.map((s) => (
              <tr key={s}>
                <td>
                  <span className={`badge sev-${s.toLowerCase()}`}>{s}</span>
                </td>
                <td>{summary.by_severity[s].open}</td>
                <td>{summary.by_severity[s].resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
