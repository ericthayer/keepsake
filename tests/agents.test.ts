import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyLocker, lockerSchema } from "../lib/locker";
import { agentTools, changeSchema } from "../lib/agent-contract";
import { LockerStore } from "../lib/server/locker-store";
import { AgentService } from "../lib/server/agent-service";
import { handleMcp } from "../lib/server/mcp-protocol";

// Execute the production SQL against real SQLite, including transactional D1 batches.
function fixture(){
 const sqlite=new DatabaseSync(":memory:");
 const journal=JSON.parse(readFileSync(join(process.cwd(),"drizzle/meta/_journal.json"),"utf8"));
 for(const entry of journal.entries)sqlite.exec(readFileSync(join(process.cwd(),`drizzle/${entry.tag}.sql`),"utf8"));
 class Statement {
  args:unknown[]=[];
  constructor(public sql:string){}
  bind(...args:unknown[]){this.args=args;return this;}
  statement(){return sqlite.prepare(this.sql);}
  async first(){return this.statement().get(...this.args as never[])??null;}
  async run(){return {success:true,meta:this.statement().run(...this.args as never[])};}
 }
 const db={prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{sqlite.exec("BEGIN");try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}}} as unknown as D1Database;
 const store=new LockerStore(db);let now=new Date("2026-10-16T14:00:00.000Z"),counter=0;
 const service=new AgentService(store,()=>now,()=>`generated-${++counter}`,"https://keepsake.example");
 return {store,service,sqlite,advance:(minutes:number)=>{now=new Date(now.getTime()+minutes*60000);}};
}
const create=changeSchema.parse({action:"create_record",record:{title:"Test checking",category:"banking",organization:"Test provider",website:"https://example.com/login"}});
async function prepare(f:ReturnType<typeof fixture>,owner="owner-a",expected=0,change=create){return f.service.prepare(owner,expected,change);}

test("tool discovery is deterministic and exposes bounded object schemas",()=>{
 assert.equal(agentTools.length,8);assert.deepEqual(agentTools.map(t=>t.name),agentTools.map(t=>t.name).sort());
 for(const tool of agentTools){const schema=tool.inputSchema as Record<string,unknown>;assert.equal(schema.type,"object");assert.equal(schema.additionalProperties,false);assert.ok(tool.description.length>30);}
 assert.equal(agentTools.find(t=>t.name==="keepsake_apply_change")?.annotations.destructiveHint,true);
});
test("real locker reads never return sample records",async()=>{const f=fixture();const result=await f.service.call("owner-a","keepsake_get_overview",{});assert.equal(result.structuredContent?.accounts,0);assert.equal(result.structuredContent?.exampleData,false);assert.equal(result.structuredContent?.isEmpty,true);f.sqlite.close();});
test("a staged change does not modify the locker; apply is versioned and idempotent",async()=>{
 const f=fixture(),p=await prepare(f);assert.equal((await f.store.read("owner-a")).locker,null);assert.equal(p.status,"pending");assert.ok(p.reviewUrl?.startsWith("https://keepsake.example/?review="));
 const first=await f.service.call("owner-a","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true});assert.equal(first.isError,undefined);assert.equal(first.structuredContent?.version,1);
 assert.equal((await f.store.read("owner-a")).locker?.records[0].title,"Test checking");
 const second=await f.service.call("owner-a","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true});assert.equal(second.structuredContent?.alreadyApplied,true);assert.equal((await f.store.read("owner-a")).version,1);f.sqlite.close();
});
test("confirmation is required and invalid changes never write",async()=>{
 const f=fixture(),p=await prepare(f);
 for(const args of [{proposalId:p.proposalId},{proposalId:p.proposalId,userConfirmed:false}])assert.equal((await f.service.call("owner-a","keepsake_apply_change",args)).structuredContent?.code,"INVALID_INPUT");
 for(const field of [{reference:"123456789"},{website:"javascript:alert(1)"},{website:"https://user:secret@example.com"},{website:"https://example.com?token=secret"},{password:"secret"}]){
  const result=await f.service.call("owner-a","keepsake_prepare_change",{expectedVersion:0,change:{action:"create_record",record:{title:"Bad input",category:"banking",...field}}});assert.equal(result.isError,true);
 }
 assert.equal((await f.store.read("owner-a")).locker,null);f.sqlite.close();
});
test("other owners cannot read or apply a proposal or record",async()=>{
 const f=fixture(),p=await prepare(f);const otherRead=await f.service.call("owner-b","keepsake_get_change",{proposalId:p.proposalId});assert.equal(otherRead.structuredContent?.code,"NOT_FOUND");
 const otherApply=await f.service.call("owner-b","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true});assert.equal(otherApply.structuredContent?.code,"NOT_FOUND");
 await f.service.apply("owner-a",p.proposalId);assert.equal((await f.service.call("owner-b","keepsake_get_record",{id:p.preview.entityId})).structuredContent?.code,"NOT_FOUND");assert.equal((await f.store.read("owner-b")).locker,null);f.sqlite.close();
});
test("UI saves invalidate agent previews without overwriting newer records",async()=>{
 const f=fixture(),p=await prepare(f);await f.store.save("owner-a",{...emptyLocker,message:"Newer UI edit"},0);
 const result=await f.service.call("owner-a","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true});assert.equal(result.structuredContent?.code,"VERSION_CONFLICT");assert.equal((await f.store.read("owner-a")).locker?.message,"Newer UI edit");assert.equal((await f.service.getProposal("owner-a",p.proposalId)).status,"conflict");f.sqlite.close();
});
test("an identical UI save still invalidates an earlier preview",async()=>{
 const f=fixture(),p=await prepare(f);const row=f.sqlite.prepare("SELECT candidate_json FROM agent_proposals WHERE id = ?").get(p.proposalId) as {candidate_json:string};await f.store.save("owner-a",JSON.parse(row.candidate_json),0);
 const result=await f.service.call("owner-a","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true});assert.equal(result.structuredContent?.code,"VERSION_CONFLICT");assert.equal((await f.service.getProposal("owner-a",p.proposalId)).status,"conflict");f.sqlite.close();
});
test("expired previews cannot write; stale writes cannot create a missing locker",async()=>{
 const f=fixture(),p=await prepare(f);f.advance(16);assert.equal((await f.service.call("owner-a","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true})).structuredContent?.code,"PROPOSAL_EXPIRED");
 await assert.rejects(()=>f.store.save("owner-c",structuredClone(emptyLocker),5),/locker changed/);assert.equal((await f.store.read("owner-c")).locker,null);f.sqlite.close();
});
test("contacts, documents, edits, notes, review, deletion, and bounded search work",async()=>{
 const f=fixture();let version=0;
 async function apply(change:unknown){const p=await f.service.prepare("owner-a",version,changeSchema.parse(change));const result=await f.service.apply("owner-a",p.proposalId);version=result.version;return p;}
 const doc=await apply({action:"create_record",record:{kind:"document",title:"Will location",category:"legal",location:"Cabinet"}});
 await apply({action:"update_record",id:doc.preview.entityId,patch:{status:"ready",notes:"Call my attorney"}});
 const contact=await apply({action:"create_contact",contact:{name:"Test adviser",role:"Attorney"}});
 await apply({action:"update_contact",id:contact.preview.entityId,patch:{phone:"555-0100"}});
 await apply({action:"set_family_note",message:"Start with the family folder."});await apply({action:"mark_locker_reviewed"});
 const guide=await f.service.call("owner-a","keepsake_get_family_guide",{});assert.equal(guide.structuredContent?.message,"Start with the family folder.");
 const search=await f.service.call("owner-a","keepsake_search_records",{query:"will",kind:"document",limit:1});assert.equal(search.structuredContent?.total,1);assert.equal((search.structuredContent?.records as unknown[]).length,1);
 assert.equal((await f.service.call("owner-a","keepsake_search_records",{limit:1000})).isError,true);
 await apply({action:"delete_contact",id:contact.preview.entityId});await apply({action:"delete_record",id:doc.preview.entityId});
 const saved=(await f.store.read("owner-a")).locker!;assert.equal(saved.records.length,0);assert.equal(saved.contacts.length,0);assert.ok(saved.reviewedAt);assert.equal(lockerSchema.safeParse(saved).success,true);f.sqlite.close();
});
test("agent proposal and locker write roll back together on a database failure",async()=>{
 const f=fixture(),p=await prepare(f);f.sqlite.exec("CREATE TRIGGER fail_agent_apply BEFORE UPDATE OF applied_version ON agent_proposals BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
 const result=await f.service.call("owner-a","keepsake_apply_change",{proposalId:p.proposalId,userConfirmed:true});assert.equal(result.structuredContent?.code,"SERVICE_UNAVAILABLE");assert.equal((await f.store.read("owner-a")).locker,null);assert.equal((await f.service.getProposal("owner-a",p.proposalId)).status,"pending");f.sqlite.close();
});
function request(method:string,params:Record<string,unknown>={},options:{modern?:boolean;headers?:Record<string,string>;id?:unknown;body?:string}={}){
 const modern=options.modern??true;const value={jsonrpc:"2.0",id:options.id??1,method,params:{...params,...(modern?{_meta:{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}:{})}};
 return new Request("https://keepsake.example/mcp",{method:"POST",headers:{"Content-Type":"application/json",...(modern?{"MCP-Protocol-Version":"2026-07-28","Mcp-Method":method,...(method==="tools/call"?{"Mcp-Name":String(params.name)}:{})}:{}),...options.headers},body:options.body??JSON.stringify(value)});
}
const okInvoke=async()=>({content:[{type:"text" as const,text:"ok"}]});
test("modern discovery, tools, legacy initialization, and notifications",async()=>{
 const discover=await handleMcp(request("server/discover"),okInvoke);assert.equal(discover.status,200);const body=await discover.json() as {result:{resultType:string;supportedVersions:string[]}};assert.equal(body.result.resultType,"complete");assert.ok(body.result.supportedVersions.includes("2026-07-28"));
 const list=await handleMcp(request("tools/list"),okInvoke);assert.equal((await list.json() as {result:{tools:unknown[]}}).result.tools.length,8);
 const legacy=await handleMcp(request("initialize",{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"test",version:"1"}},{modern:false}),okInvoke);assert.equal((await legacy.json() as {result:{protocolVersion:string}}).result.protocolVersion,"2025-11-25");
 let calls=0;const notification=await handleMcp(request("tools/call",{name:"keepsake_apply_change",arguments:{}},{modern:false,body:JSON.stringify({jsonrpc:"2.0",method:"tools/call",params:{name:"keepsake_apply_change",arguments:{}}})}),async()=>{calls++;return okInvoke();});assert.equal(notification.status,202);assert.equal(calls,0);
});
test("RPC rejects batch, malformed JSON, header mismatch, cross-origin, oversized and unknown calls",async()=>{
 let calls=0;const invoke=async()=>{calls++;return okInvoke();};
 const cases:[Request,number][]=[
  [request("tools/list",{},{body:"[1,2]"}),400], [request("tools/list",{},{body:"{"}),400],
  [request("tools/call",{name:"keepsake_get_overview",arguments:{}},{headers:{"Mcp-Name":"different"}}),400],
  [request("tools/list",{},{headers:{Origin:"https://attacker.example"}}),403],
  [request("tools/list",{},{body:"x".repeat(65000)}),413],
  [request("unknown"),404], [request("tools/call",{name:"missing",arguments:{}}),400],
  [request("tools/list",{},{headers:{"MCP-Protocol-Version":"1900-01-01"}}),400],
 ];
 for(const [req,status] of cases){const response=await handleMcp(req,invoke);assert.equal(response.status,status);assert.equal(response.headers.get("cache-control"),"private, no-store");}
 assert.equal(calls,0);
});
test("MCP dispatch reaches the real service and reports tool-level failures",async()=>{
 const f=fixture();const invoke=(name:string,args:unknown)=>f.service.call("owner-a",name,args);
 const response=await handleMcp(request("tools/call",{name:"keepsake_get_overview",arguments:{}}),invoke);const body=await response.json() as {result:{structuredContent:{accounts:number}}};assert.equal(body.result.structuredContent.accounts,0);
 const invalid=await handleMcp(request("tools/call",{name:"keepsake_apply_change",arguments:{proposalId:"missing",userConfirmed:false}}),invoke);assert.equal((await invalid.json() as {result:{isError:boolean}}).result.isError,true);f.sqlite.close();
});
