import { lockerSchema, type Locker, type LockerEnvelope } from "../locker";

export class LockerError extends Error { constructor(message:string,public status:number,public code:string){super(message);} }
export const saveLockerSql = `INSERT INTO lockers (owner_id, state_json, version, updated_at)
SELECT ?, ?, 1, ? WHERE (? = 0 OR EXISTS (SELECT 1 FROM lockers WHERE owner_id = ? AND version = ?))
ON CONFLICT(owner_id) DO UPDATE SET state_json = excluded.state_json, version = lockers.version + 1, updated_at = excluded.updated_at
WHERE lockers.version = ? RETURNING version`;
export class LockerStore {
 constructor(public readonly db:D1Database){}
 async read(ownerId:string):Promise<LockerEnvelope>{
  const row=await this.db.prepare("SELECT state_json, version FROM lockers WHERE owner_id = ?").bind(ownerId).first<{state_json:string;version:number}>();
  return {locker:row?lockerSchema.parse(JSON.parse(row.state_json)):null,version:row?.version??0};
 }
 async save(ownerId:string,locker:Locker,expectedVersion:number):Promise<number>{
  const next=lockerSchema.parse(locker),state=JSON.stringify(next);
  if(new TextEncoder().encode(state).length>480000)throw new LockerError("Locker is too large.",413,"SIZE_LIMIT");
  const row=await this.db.prepare(saveLockerSql).bind(ownerId,state,new Date().toISOString(),expectedVersion,ownerId,expectedVersion,expectedVersion).first<{version:number}>();
  if(!row)throw new LockerError("Your locker changed. Read the latest version before saving again.",409,"VERSION_CONFLICT");
  return row.version;
 }
}
