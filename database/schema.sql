CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  bpm integer NOT NULL CHECK (bpm BETWEEN 60 AND 200),
  melody jsonb NOT NULL DEFAULT '{}'::jsonb,
  drums jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_owner_created_idx ON projects(owner_id, created_at DESC);
