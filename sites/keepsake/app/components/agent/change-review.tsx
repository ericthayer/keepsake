"use client";
import { useEffect, useState } from "react";
import { Check, Info, RefreshCw } from "lucide-react";
import { callAgentTool } from "../../../lib/agent-client";
import type { ProposalView } from "../../../lib/agent-contract";
import { Modal } from "../ui";
const labels:Record<string,string>={title:"Name",name:"Name",kind:"Record type",category:"Category",organization:"Institution / provider",website:"Website",reference:"Last four characters",contactName:"Contact person",contactEmail:"Contact email",contactPhone:"Contact phone",location:"Original document location",notes:"Notes",status:"Readiness",relationship:"Relationship",role:"Role",email:"Email",phone:"Phone"};
function printable(value:unknown):string{return value===null||value===undefined||value===""?"—":String(value);}
function Difference({proposal}:{proposal:ProposalView}){
 const {before,after}=proposal.preview;
 const beforeObject=before&&typeof before==="object"?before as Record<string,unknown>:null;
 const afterObject=after&&typeof after==="object"?after as Record<string,unknown>:null;
 const keys=beforeObject||afterObject?[...new Set([...Object.keys(beforeObject??{}),...Object.keys(afterObject??{})])].filter(k=>k!=="id"&&k!=="updatedAt"&&beforeObject?.[k]!==afterObject?.[k]):["value"];
 return <div className="agent-diff" role="region" aria-label="Proposed changes"><table><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{keys.map(key=><tr key={key}><th>{key==="value"?proposal.preview.action==="set_family_note"?"Family note":"Review date":labels[key]??key}</th><td>{printable(key==="value"?before:beforeObject?.[key])}</td><td>{printable(key==="value"?after:afterObject?.[key])}</td></tr>)}</tbody></table></div>;
}
export function AgentChangeReview({proposalId,onClose,onApplied}:{proposalId:string;onClose:()=>void;onApplied:()=>Promise<void>}){
 const [proposal,setProposal]=useState<ProposalView|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();callAgentTool<ProposalView&Record<string,unknown>>("keepsake_get_change",{proposalId},controller.signal).then(setProposal).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Could not load the preview.");});return()=>controller.abort();},[proposalId]);
 async function apply(){setBusy(true);setError("");try{await callAgentTool("keepsake_apply_change",{proposalId,userConfirmed:true});await onApplied();onClose();}catch(e){setError(e instanceof Error?e.message:"Could not apply this change.");}finally{setBusy(false);}}
 return <Modal title="Review an agent’s change" subtitle="Check the exact change before applying it to your locker." wide onClose={()=>{if(!busy)onClose();}}>{proposal?<><div className="form-note"><Info size={17}/><span>{proposal.preview.summary}. {proposal.status==="pending"?`This preview expires ${new Date(proposal.expiresAt).toLocaleString()}.`:proposal.status==="applied"?"This change has already been applied.":proposal.status==="conflict"?"Your locker has changed since this preview. Ask the agent to prepare a new one.":"This preview has expired. Ask the agent to prepare a new one."}</span></div><Difference proposal={proposal}/><div className="form-actions"><button className="button secondary" disabled={busy} onClick={onClose}>Close</button>{proposal.status==="pending"&&<button className="button primary" disabled={busy} onClick={()=>void apply()}><Check size={16}/>{busy?"Applying…":"Apply this change"}</button>}</div></>:!error?<p className="agent-loading"><RefreshCw size={16}/>Loading the preview…</p>:null}{error&&<p className="form-error" role="alert">{error}</p>}</Modal>;
}
