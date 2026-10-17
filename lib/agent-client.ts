import type { AgentToolResult, AgentToolName } from "./agent-contract";
export async function callAgentTool<T extends Record<string,unknown>>(name:AgentToolName,args:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch("/api/agent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,arguments:args}),signal,cache:"no-store"});
 const result=await response.json() as AgentToolResult;
 if(!response.ok||result.isError)throw new Error(typeof result.structuredContent?.error==="string"?result.structuredContent.error:"Could not complete the agent request.");
 if(!result.structuredContent)throw new Error("Invalid agent response.");
 return result.structuredContent as T;
}
