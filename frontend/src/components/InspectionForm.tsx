import { FormEvent, useState } from 'react';
import { ApiError, createInspection } from '../api';
import { DEFECT_TYPES, SEVERITIES, type DefectType, type Severity } from '../types';

/** Today in the supervisor's local timezone as YYYY-MM-DD (toISOString would use UTC). */
const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function InspectionForm({ onLogged }: { onLogged: (msg: string) => void }) {
  const [date, setDate] = useState(today);
  const [machine, setMachine] = useState('');
  const [defect, setDefect] = useState<DefectType | ''>('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = date && machine.trim() && defect && severity && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!defect || !severity) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await createInspection({
        inspection_date: date,
        machine_id: machine.trim(),
        defect_type: defect,
        severity,
        remarks: remarks.trim() || undefined,
      });
      onLogged(`Logged #${saved.id} on ${saved.machine_id}`);
      // Supervisors often log several defects on the same line: keep date + machine, clear the rest.
      setDefect('');
      setSeverity('');
      setRemarks('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field">
        <span>Machine / line ID</span>
        <input
          type="text"
          value={machine}
          onChange={(e) => setMachine(e.target.value)}
          placeholder="e.g. Loom-12"
          maxLength={50}
          autoComplete="off"
          required
        />
      </label>

      <label className="field">
        <span>Defect type</span>
        <select value={defect} onChange={(e) => setDefect(e.target.value as DefectType)} required>
          <option value="" disabled>
            Select defect type
          </option>
          {DEFECT_TYPES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>

      <fieldset className="field">
        <legend>Severity</legend>
        <div className="segmented">
          {SEVERITIES.map((s) => (
            <button
              type="button"
              key={s}
              className={`seg sev-${s.toLowerCase()} ${severity === s ? 'selected' : ''}`}
              aria-pressed={severity === s}
              onClick={() => setSeverity(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Remarks (optional)</span>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button className="btn primary" type="submit" disabled={!canSubmit}>
        {saving ? 'Saving…' : 'Log inspection'}
      </button>
    </form>
  );
}
