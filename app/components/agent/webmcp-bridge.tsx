"use client";
import { useEffect, useRef } from "react";
import { registerKeepsakeWebMcp, type WebMcpRegistry, type LockerView } from "../../../lib/webmcp";
/** Deliberately unmounted until live registration/execution has passed browser QA. */
export function WebMcpBridge({onApplied,openView}:{onApplied:()=>Promise<void>;openView:(view:LockerView)=>void}){
 const handlers=useRef({onApplied,openView});
 useEffect(()=>{handlers.current={onApplied,openView};},[onApplied,openView]);
 useEffect(()=>{const registry=(document as Document&{readonly modelContext?:WebMcpRegistry}).modelContext;if(typeof registry?.registerTool!=="function")return;const lifecycle=new AbortController();registerKeepsakeWebMcp(registry,{signal:lifecycle.signal,onApplied:()=>handlers.current.onApplied(),openView:view=>handlers.current.openView(view),onError:()=>{console.warn("Keepsake browser tool registration failed; the ordinary interface remains available.");}});return()=>lifecycle.abort();},[]);
 return null;
}
