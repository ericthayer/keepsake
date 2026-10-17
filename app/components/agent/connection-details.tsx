"use client";
import { useEffect, useState } from "react";
import { Copy, Check, Info } from "lucide-react";
import type { ApiKeyView } from "../../../lib/server/locker-store";

async function fetchAgentKeys(): Promise<ApiKeyView[]> {
  const response = await fetch("/api/agent-keys", { cache: "no-store" });
  if (!response.ok) throw new Error("Sign in before managing agent keys.");
  const data = await response.json() as { keys: ApiKeyView[] };
  return data.keys;
}

export function AgentConnectionDetails() {
  const [copied, setCopied] = useState(false), [error, setError] = useState("");
  const [keys, setKeys] = useState<ApiKeyView[]>([]), [token, setToken] = useState("");
  const [name, setName] = useState("My agent"), [busy, setBusy] = useState(false);
  const endpoint = typeof window === "undefined" ? "/mcp" : `${window.location.origin}/mcp`;
  async function load() { setKeys(await fetchAgentKeys()); }
  useEffect(() => {
    let active = true;
    void fetchAgentKeys().then(keys => { if (active) setKeys(keys); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, []);
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setError("Select and copy the value above."); } }
  async function change(method: "POST" | "DELETE", body: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/agent-keys", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string; token?: string };
      if (!response.ok) throw new Error(data.error || "Could not update the agent key.");
      if (data.token) { setToken(data.token); setCopied(false); }
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update the key."); }
    finally { setBusy(false); }
  }
  return <><div className="form-note"><Info size={17}/><span>Give your agent a separate key. It can access your locker until you revoke it.</span></div>
    <label>Remote MCP endpoint<input value={endpoint} readOnly onFocus={event => event.currentTarget.select()} /></label>
    <div className="form-actions"><button className="button secondary" onClick={() => void copy(endpoint)}><Copy size={15} />Copy endpoint</button></div>
    {token ? <><label>Agent key — shown once<input type="text" value={token} readOnly autoComplete="off" spellCheck={false} onFocus={event => event.currentTarget.select()} /></label><p>Store this key in your agent’s credential settings. Closing this dialog hides it permanently.</p><div className="form-actions"><button className="button secondary" onClick={() => void copy(token)}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy key"}</button><button className="button primary" onClick={() => setToken("")}>I saved this key</button></div></> : <><label>Agent name<input value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label><div className="form-actions"><button className="button primary" disabled={busy || !name.trim()} onClick={() => void change("POST", { name })}>{busy ? "Please wait…" : "Create agent key"}</button></div></>}
    <div className="settings-options">{keys.map(key => <button key={key.id} disabled={busy} onClick={() => void change("DELETE", { id: key.id })}><span><strong>{key.name}</strong><small>Revoke this agent’s access</small></span></button>)}</div>
    <div className="privacy-copy agent-help"><h3>Connect your agent</h3><p>Use the endpoint above and send Authorization: Bearer followed by your agent key. A key can read your saved information and apply approved previews. Configure your client to ask before applying a change.</p><h3>What changes require</h3><p>The agent reads the current version, prepares a before/after preview, and applies it only after you approve. You can also open the review link in this app.</p><h3>Browser WebMCP</h3><p>The browser bridge remains inactive until browser verification is complete.</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}</>;
}
