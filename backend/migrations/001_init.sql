CREATE TABLE inspections (
  id              SERIAL PRIMARY KEY,
  inspection_date DATE        NOT NULL,
  machine_id      TEXT        NOT NULL CHECK (length(btrim(machine_id)) > 0),
  defect_type     TEXT        NOT NULL
                  CHECK (defect_type IN ('Weave Defect', 'Shade Variation', 'Hole/Tear', 'Count Deviation', 'Other')),
  severity        TEXT        NOT NULL CHECK (severity IN ('Critical', 'Major', 'Minor')),
  remarks         TEXT,
  status          TEXT        NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
  resolution_note TEXT,
  resolved_at     TIMESTAMPTZ,
  source          TEXT        NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'sap')),
  external_ref    TEXT        UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A resolved inspection must always carry a note and a timestamp; an open one must not.
  CONSTRAINT resolved_has_note CHECK (
    (status = 'Open'     AND resolution_note IS NULL AND resolved_at IS NULL) OR
    (status = 'Resolved' AND length(btrim(resolution_note)) > 0 AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX idx_inspections_date     ON inspections (inspection_date DESC);
CREATE INDEX idx_inspections_status   ON inspections (status);
CREATE INDEX idx_inspections_severity ON inspections (severity);
