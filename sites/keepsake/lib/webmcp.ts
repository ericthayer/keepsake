/** Staged adapter: do not mount until tested in an approved browser context. */
import { agentTools, getToolSpec, type AgentToolName } from "./agent-contract";
import { callAgentTool } from "./agent-client";
import { z } from "zod";
export type WebMcpRegistry={registerTool(tool:{name:string;title?:string;description:string;inputSchema:object;annotations?:{readOnlyHint:boolean;untrustedContentHint:boolean;consequentialHint:boolean};execute:(input:unknown,options?:{signal?:AbortSignal})=>Promise<unknown>},options?:{signal?:AbortSignal}):void|Promise<void>};
export type LockerView="overview"|"locker"|"documents"|"circle"|"guide";
export function registerKeepsakeWebMcp(registry:WebMcpRegistry,options:{signal:AbortSignal;onApplied:()=>Promise<void>;openView:(view:LockerView)=>void;onError:(error:unknown)=>void}){
 for(const tool of agentTools){
  try{void Promise.resolve(registry.registerTool({name:tool.name,title:tool.title,description:tool.description,inputSchema:tool.inputSchema,annotations:{readOnlyHint:tool.annotations.readOnlyHint,untrustedContentHint:true,consequentialHint:tool.name==="keepsake_apply_change"},execute:async(input,context)=>{getToolSpec(tool.name)!.schema.parse(input);context?.signal?.throwIfAborted();const result=await callAgentTool(tool.name as AgentToolName,input,context?.signal);if(tool.name==="keepsake_apply_change")await options.onApplied();return result;}},{signal:options.signal})).catch(options.onError);}catch(error){options.onError(error);}
 }
 try{void Promise.resolve(registry.registerTool({name:"keepsake_open_view",title:"Open a Keepsake view",description:"Navigate the current Keepsake page to a named view. Does not save, print, or share anything.",inputSchema:{type:"object",properties:{view:{type:"string",enum:["overview","locker","documents","circle","guide"]}},required:["view"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false,consequentialHint:false},execute:async input=>{const {view}=z.object({view:z.enum(["overview","locker","documents","circle","guide"])}).strict().parse(input);options.openView(view);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));return {view};}},{signal:options.signal})).catch(options.onError);}catch(error){options.onError(error);}
}
