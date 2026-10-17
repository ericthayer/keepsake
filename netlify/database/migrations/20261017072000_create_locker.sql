CREATE TABLE lockers (
  owner_id TEXT PRIMARY KEY,
  state_json TEXT,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at TEXT NOT NULL,
  CHECK ((version = 0 AND state_json IS NULL) OR (version > 0 AND state_json IS NOT NULL))
);
CREATE TABLE agent_proposals (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES lockers(owner_id) ON DELETE CASCADE,
  candidate_json TEXT NOT NULL,
  preview_json TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  applied_version INTEGER,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX agent_proposals_owner_expiry ON agent_proposals(owner_id, expires_at);
CREATE TABLE agent_api_keys (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES lockers(owner_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX agent_api_keys_owner ON agent_api_keys(owner_id);
