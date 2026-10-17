import { getDatabase } from "@netlify/database";
import { LockerStore, type Database } from "../lib/server/locker-store";

export function getLockerStore() {
  // Both SDK pool implementations expose the same query/connect/release API.
  const database = getDatabase().pool as unknown as Database;
  return new LockerStore(database);
}
