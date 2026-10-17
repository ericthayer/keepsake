"use client";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { appearanceStorageKey, appearanceOptions, validAppearance, resolveAppearance, type Appearance } from "../../lib/appearance";

type AppearanceContextValue = { appearance:Appearance; setAppearance:(value:Appearance)=>void };
const AppearanceContext=createContext<AppearanceContextValue|null>(null);
export function AppearanceProvider({children}:{children:ReactNode}){
 const [appearance,setValue]=useState<Appearance>("system");
 const current=useRef<Appearance>("system");
 function apply(value:Appearance){
  current.current=value;setValue(value);
  document.documentElement.dataset.appearance=value;
  document.documentElement.dataset.theme=resolveAppearance(value,typeof window.matchMedia==="function"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
 }
 function setAppearance(value:Appearance){const next=validAppearance(value);apply(next);try{window.localStorage.setItem(appearanceStorageKey,next);}catch{/* Still usable when browser storage is unavailable. */}}
 useEffect(()=>{
  let preference=validAppearance(document.documentElement.dataset.appearance);
  try{preference=validAppearance(window.localStorage.getItem(appearanceStorageKey));}catch{}
  apply(preference);
  const media=typeof window.matchMedia==="function"?window.matchMedia("(prefers-color-scheme: dark)"):null;
  const systemChanged=()=>{if(current.current==="system")apply("system");};
  const storageChanged=(event:StorageEvent)=>{if(event.key===appearanceStorageKey||event.key===null)apply(validAppearance(event.newValue));};
  media?.addEventListener("change",systemChanged);window.addEventListener("storage",storageChanged);
  return()=>{media?.removeEventListener("change",systemChanged);window.removeEventListener("storage",storageChanged);};
 },[]);
 return <AppearanceContext.Provider value={{appearance,setAppearance}}>{children}</AppearanceContext.Provider>;
}
const icons={light:Sun,dark:Moon,system:Monitor};
const labels={light:"Light",dark:"Dark",system:"System"};
export function AppearanceControl({compact=false}:{compact?:boolean}){
 const context=useContext(AppearanceContext);const groupId=useId();
 if(!context)throw new Error("AppearanceControl requires AppearanceProvider.");
 return <fieldset className={`appearance-control ${compact?"appearance-compact":""}`}><legend>Appearance</legend>{!compact&&<p className="appearance-description">Choose a palette, or follow your device.</p>}<div className="appearance-options">{appearanceOptions.map(value=>{const Icon=icons[value];return <label className="appearance-choice" key={value} title={value==="system"?"Follow your device’s color preference":`${labels[value]} mode`}><input type="radio" name={`appearance-${groupId}`} value={value} checked={context.appearance===value} onChange={()=>context.setAppearance(value)}/><span><Icon size={compact?14:18} strokeWidth={1.7}/><span>{labels[value]}</span></span></label>;})}</div>{!compact&&<p className="appearance-hint">Saved in this browser. System mode follows changes to your device’s appearance.</p>}</fieldset>;
}
