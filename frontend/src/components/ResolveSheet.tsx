import { FormEvent, useState } from 'react';
import { ApiError, resolveInspection } from '../api';
import type { Inspection } from '../types';

interface Props {
  inspection: Inspection;
  onClose: () => void;
  onResolved: (updated: Inspection) => void;
}

/** Bottom sheet: thumb-reachable on a phone, and the note field is autofocused. */
export default function ResolveSheet({ inspection, onClose, onResolved }: Props) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onResolved(await resolveInspection(inspection.id, note.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={`Resolve inspection ${inspection.id}`}
      >
        <h2>
          Resolve #{inspection.id} · {inspection.machine_id}
        </h2>
        <p className="muted">
          {inspection.defect_type} · {inspection.severity}
        </p>

        <label className="field">
          <span>Resolution note (required)</span>
          <textarea
            autoFocus
            rows={4}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was done to fix it?"
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="row">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" type="submit" disabled={note.trim().length < 3 || saving}>
            {saving ? 'Saving…' : 'Mark resolved'}
          </button>
        </div>
      </form>
    </div>
  );
}
