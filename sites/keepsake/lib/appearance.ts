export const appearanceStorageKey = "keepsake.appearance";
export const appearanceOptions = ["light", "dark", "system"] as const;
export type Appearance = typeof appearanceOptions[number];
export type ResolvedAppearance = "light" | "dark";
export function validAppearance(value:unknown):Appearance { return value==="light"||value==="dark"||value==="system"?value:"system"; }
export function resolveAppearance(value:Appearance,systemDark:boolean):ResolvedAppearance { return value==="system"?(systemDark?"dark":"light"):value; }
/** Runs before paint; kept dependency-free and shared with the standalone export. */
export const appearanceBootstrap = `(()=>{let p="system";try{const v=localStorage.getItem("${appearanceStorageKey}");if(v==="light"||v==="dark"||v==="system")p=v;}catch{}const d=typeof matchMedia==="function"&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.appearance=p;document.documentElement.dataset.theme=p==="system"?(d?"dark":"light"):p;})()`;
