import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const lockers = sqliteTable("lockers", {
  ownerId: text("owner_id").primaryKey(),
  stateJson: text("state_json").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const agentProposals = sqliteTable("agent_proposals", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  candidateJson: text("candidate_json").notNull(),
  previewJson: text("preview_json").notNull(),
  expectedVersion: integer("expected_version").notNull(),
  appliedVersion: integer("applied_version"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, table => [index("agent_proposals_owner_expiry").on(table.ownerId, table.expiresAt)]);
