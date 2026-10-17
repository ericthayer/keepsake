"use client";
import { useState } from "react";
import { Copy, Check, Info } from "lucide-react";
export function AgentConnectionDetails(){
 const [copied,setCopied]=useState(false),[error,setError]=useState("");
 const endpoint=typeof window==="undefined"?"/mcp":`${window.location.origin}/mcp`;
 async function copy(){try{await navigator.clipboard.writeText(endpoint);setCopied(true);}catch{setError("Select and copy the endpoint above.");}}
 return <><div className="form-note"><Info size={17}/><span>Connect a remote agent or gateway through the Keepsake plugin. It uses the same signed-in locker as this website.</span></div><label>Remote MCP endpoint<input value={endpoint} readOnly aria-label="Remote MCP endpoint" onFocus={e=>e.currentTarget.select()}/></label><div className="form-actions"><button className="button secondary" onClick={()=>void copy()}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copied":"Copy endpoint"}</button></div><div className="privacy-copy agent-help"><h3>What your agent can do</h3><p>Read the overview, search account and document records, list contacts, read your family guide, and prepare changes for review. An agent can apply a preview after you approve it in your agent client, or you can open its review link here.</p><h3>Connect through Keepsake</h3><p>In ChatGPT or Codex, install or connect the Keepsake plugin under Plugins → Personal → Created by you. External clients need the Sites authentication flow; this endpoint is private.</p><h3>Browser WebMCP</h3><p>The browser bridge is staged in the source and is not active in this release. It requires verification in a browser with WebMCP support before activation.</p></div>{error&&<p className="form-error" role="alert">{error}</p>}</>;
}
