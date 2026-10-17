import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AgentService } from "../../lib/server/agent-service";
import { LockerStore, type Database, type Query } from "../../lib/server/locker-store";

export async function fixture() {
  const pg = new PGlite();
  const migrations = join(process.cwd(), "netlify/database/migrations");
  for (const file of readdirSync(migrations).filter(name => name.endsWith(".sql")).sort()) await pg.exec(readFileSync(join(migrations, file), "utf8"));
  const query: Query = async (sql, values) => pg.query(sql, values);
  // PGlite has one connection. Serialize transactions in this test adapter;
  // production uses separate pg clients and SELECT ... FOR UPDATE owner locks.
  let previous = Promise.resolve();
  const db: Database = {
    query,
    async connect() {
      const wait = previous;
      let release = () => {};
      previous = new Promise<void>(resolve => { release = resolve; });
      await wait;
      return { query, release };
    },
  };
  const store = new LockerStore(db);
  let now = new Date("2026-10-17T07:00:00.000Z"), counter = 0;
  const service = new AgentService(store, () => now, () => `generated-${++counter}`, "https://keepsake.example");
  return { store, service, pg, advance(minutes: number) { now = new Date(now.getTime() + minutes * 60000); } };
}
