"use client";
import { createContext, useContext, useId, useSyncExternalStore, type ReactNode } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { appearanceOptions, type Appearance } from "../../lib/appearance";
import { getAppearanceSnapshot, getServerAppearanceSnapshot, setAppearance, subscribeAppearance } from "../../lib/appearance-client";

type AppearanceContextValue = { appearance:Appearance; setAppearance:(value:Appearance)=>void };
const AppearanceContext=createContext<AppearanceContextValue|null>(null);
export function AppearanceProvider({children}:{children:ReactNode}){
 const appearance=useSyncExternalStore(subscribeAppearance,getAppearanceSnapshot,getServerAppearanceSnapshot);
 return <AppearanceContext.Provider value={{appearance,setAppearance}}>{children}</AppearanceContext.Provider>;
}
const icons={light:Sun,dark:Moon,system:Monitor};
const labels={light:"Light",dark:"Dark",system:"System"};
export function AppearanceControl({compact=false}:{compact?:boolean}){
 const context=useContext(AppearanceContext);const groupId=useId();
 if(!context)throw new Error("AppearanceControl requires AppearanceProvider.");
 return <fieldset className={`appearance-control ${compact?"appearance-compact":""}`}><legend>Appearance</legend>{!compact&&<p className="appearance-description">Choose a palette, or follow your device.</p>}<div className="appearance-options">{appearanceOptions.map(value=>{const Icon=icons[value];return <label className="appearance-choice" key={value} title={value==="system"?"Follow your device’s color preference":`${labels[value]} mode`}><input type="radio" name={`appearance-${groupId}`} value={value} checked={context.appearance===value} onChange={()=>context.setAppearance(value)}/><span><Icon size={compact?14:18} strokeWidth={1.7}/><span>{labels[value]}</span></span></label>;})}</div>{!compact&&<p className="appearance-hint">Saved in this browser. System mode follows changes to your device’s appearance.</p>}</fieldset>;
}
