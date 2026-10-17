-- A locker is still identified by its owner's user id (lockers.owner_id).
-- Members get access through a row here; the owner's access is implicit.
CREATE TABLE locker_members (
  locker_id TEXT NOT NULL REFERENCES lockers(owner_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (locker_id, user_id)
);
CREATE INDEX locker_members_user ON locker_members(user_id);

-- Invites are bound to an email address; only a signed-in user with that
-- email can accept. Only the token hash is stored.
CREATE TABLE locker_invites (
  id TEXT PRIMARY KEY,
  locker_id TEXT NOT NULL REFERENCES lockers(owner_id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = lower(email)),
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_by TEXT,
  revoked_at TEXT
);
CREATE INDEX locker_invites_locker ON locker_invites(locker_id);
