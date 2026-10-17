import { lockerSchema, type Locker, type LockerEnvelope } from "../locker";

export type Query = <Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: Row[] }>;
export type Connection = { query: Query; release: () => void };
export type Database = { query: Query; connect: () => Promise<Connection> };
export type ProposalRow = { id: string; owner_id: string; candidate_json: string; preview_json: string; expected_version: number; applied_version: number | null; created_at: string; expires_at: string };
export type ApiKeyView = { id: string; name: string; created_at: string; revoked_at: string | null };
type LockerRow = { state_json: string | null; version: number };

export class LockerError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

/** All writes lock the same owner row, including the first save and agent receipts. */
export class LockerStore {
  constructor(public readonly db: Database) {}

  async transaction<T>(ownerId: string, work: (client: Connection, current: LockerRow) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO lockers (owner_id, updated_at) VALUES ($1, $2) ON CONFLICT DO NOTHING", [ownerId, new Date().toISOString()]);
      const { rows } = await client.query<LockerRow>("SELECT state_json, version FROM lockers WHERE owner_id = $1 FOR UPDATE", [ownerId]);
      const result = await work(client, rows[0]);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async read(ownerId: string): Promise<LockerEnvelope> {
    const { rows: [row] } = await this.db.query<LockerRow>("SELECT state_json, version FROM lockers WHERE owner_id = $1", [ownerId]);
    return { locker: row?.state_json ? lockerSchema.parse(JSON.parse(row.state_json)) : null, version: row?.version ?? 0 };
  }

  async save(ownerId: string, locker: Locker, expectedVersion: number): Promise<number> {
    const state = JSON.stringify(lockerSchema.parse(locker));
    if (new TextEncoder().encode(state).length > 480000) throw new LockerError("Locker is too large.", 413, "SIZE_LIMIT");
    return this.transaction(ownerId, async (client, current) => {
      if (current.version !== expectedVersion) throw new LockerError("Your locker changed. Read the latest version before saving again.", 409, "VERSION_CONFLICT");
      await client.query("UPDATE lockers SET state_json = $1, version = version + 1, updated_at = $2 WHERE owner_id = $3", [state, new Date().toISOString(), ownerId]);
      return current.version + 1;
    });
  }

  async proposal(ownerId: string, id: string, client: Pick<Database, "query"> = this.db): Promise<ProposalRow> {
    const { rows: [row] } = await client.query<ProposalRow>("SELECT * FROM agent_proposals WHERE id = $1 AND owner_id = $2", [id, ownerId]);
    if (!row) throw new LockerError("Proposed change not found in your locker.", 404, "NOT_FOUND");
    return row;
  }

  async createProposal(row: ProposalRow) {
    return this.transaction(row.owner_id, async (client, current) => {
      if (current.version !== row.expected_version) throw new LockerError("Your locker changed. Prepare a new preview.", 409, "VERSION_CONFLICT");
      await client.query("DELETE FROM agent_proposals WHERE owner_id = $1 AND expires_at <= $2", [row.owner_id, row.created_at]);
      const { rows: [count] } = await client.query<{ total: string }>("SELECT COUNT(*) AS total FROM agent_proposals WHERE owner_id = $1", [row.owner_id]);
      if (Number(count.total) >= 20) throw new LockerError("There are too many recent proposals. Review an existing proposal or wait until it expires.", 429, "PROPOSAL_LIMIT");
      await client.query("INSERT INTO agent_proposals (id, owner_id, candidate_json, preview_json, expected_version, created_at, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [row.id, row.owner_id, row.candidate_json, row.preview_json, row.expected_version, row.created_at, row.expires_at]);
      return row;
    });
  }

  async applyProposal(ownerId: string, id: string, now: string) {
    return this.transaction(ownerId, async (client, current) => {
      const proposal = await this.proposal(ownerId, id, client);
      if (proposal.applied_version !== null) return { proposalId: id, applied: true, version: proposal.applied_version, alreadyApplied: true };
      if (proposal.expires_at <= now) throw new LockerError("This preview expired. Prepare a fresh change before applying it.", 410, "PROPOSAL_EXPIRED");
      if (current.version !== proposal.expected_version) throw new LockerError("Your locker changed after this preview. Prepare a new change; nothing was overwritten.", 409, "VERSION_CONFLICT");
      const state = JSON.stringify(lockerSchema.parse(JSON.parse(proposal.candidate_json)));
      const version = current.version + 1;
      await client.query("UPDATE lockers SET state_json = $1, version = $2, updated_at = $3 WHERE owner_id = $4", [state, version, now, ownerId]);
      await client.query("UPDATE agent_proposals SET applied_version = $1 WHERE id = $2 AND owner_id = $3", [version, id, ownerId]);
      return { proposalId: id, applied: true, version, alreadyApplied: false };
    });
  }
}
