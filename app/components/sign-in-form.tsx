"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { acceptInvite, getSettings, login, oauthLogin, requestPasswordRecovery, signup, updateUser, type AuthProvider, type Settings } from "@netlify/identity";
import { completeAuthCallback } from "../../lib/auth-client";
import { BrandMark } from "./ui";

type Mode = "login" | "signup" | "recovery" | "reset" | "invite";
export function SignInForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [invite, setInvite] = useState("");
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function initialize() {
      const result = await completeAuthCallback();
      if (!active) return;
      if (result?.type === "invite" && result.token) { setInvite(result.token); setMode("invite"); }
      else if (result?.type === "recovery") setMode("reset");
      else if (result?.user) { window.location.replace("/"); return; }
      const settings = await getSettings();
      if (active) setSettings(settings);
    }
    void initialize().catch(() => { if (active) setError("Sign-in is unavailable right now. Please contact the owner or try again later."); });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "recovery") { await requestPasswordRecovery(email); setMessage("Check your email for a password reset link."); return; }
      if (mode === "invite") await acceptInvite(invite, password);
      else if (mode === "reset") await updateUser({ password });
      else if (mode === "signup") {
        await signup(email, password);
        if (!settings?.autoconfirm) { setMessage("Check your email to confirm your account, then sign in."); setPassword(""); setMode("login"); return; }
      } else await login(email, password);
      window.location.replace("/");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  }
  function switchMode(next: Mode) { setMode(next); setError(""); setMessage(""); setPassword(""); }
  const title = mode === "signup" ? "A little care starts here." : mode === "invite" ? "Your private locker awaits." : mode === "reset" ? "Choose a new password." : mode === "recovery" ? "Find your way back." : "Welcome back.";
  const providers = settings ? Object.entries(settings.providers).filter(([, enabled]) => enabled).map(([provider]) => provider as AuthProvider) : [];
  return <main className="auth-shell"><section className="panel auth-card"><div className="modal-content"><div className="brand"><BrandMark /><span>keepsake<span className="brand-period">.</span></span></div><div className="modal-heading"><div><h1>{title}</h1><p>Sign in to the information you’ve kept with care.</p></div></div><form className="auth-form" onSubmit={event => void submit(event)}>
    {mode !== "reset" && mode !== "invite" && <label>Email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>}
    {mode !== "recovery" && <label>{mode === "reset" || mode === "invite" ? "New password" : "Password"}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} minLength={mode === "login" ? 1 : 12} onChange={event => setPassword(event.target.value)} required /></label>}
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <button className="button primary full-button" disabled={busy || (!settings && mode !== "invite" && mode !== "reset")}>{busy ? "Please wait…" : mode === "recovery" ? "Send reset link" : mode === "reset" || mode === "invite" ? "Set password and continue" : mode === "signup" ? "Create account" : "Sign in"}</button>
    {mode === "login" && <><button type="button" className="quiet-button" onClick={() => switchMode("recovery")}>Forgot password?</button>{!settings?.disableSignup && settings && <button type="button" className="quiet-button" onClick={() => switchMode("signup")}>Create an account</button>}{providers.map(provider => <button type="button" className="button secondary full-button" key={provider} onClick={() => oauthLogin(provider)}>Continue with {provider}</button>)}</>}
    {(mode === "signup" || mode === "recovery") && <button type="button" className="quiet-button" onClick={() => switchMode("login")}>Back to sign in</button>}
  </form><Link className="quiet-button" href="/">Explore the example locker</Link></div></section></main>;
}
