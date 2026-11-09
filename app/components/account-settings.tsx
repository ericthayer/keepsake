"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getUser, updateUser } from "@netlify/identity";
import { Check, Info, LockKeyhole, Mail } from "lucide-react";
import { emailSchema, emptyAddress, profileFromMetadata, profileSchema, profileToMetadata, type Address, type Profile } from "../../lib/account";

type Load = { state: "loading" } | { state: "signedOut" } | { state: "error" } | { state: "ready"; email: string; pendingEmail: string };
type Status = { tone: "success" | "error"; text: string } | null;

const addressFields: ReadonlyArray<{ key: keyof Address; label: string; autoComplete: string; full?: boolean; optional?: boolean }> = [
  { key: "line1", label: "Street address", autoComplete: "address-line1", full: true },
  { key: "line2", label: "Apartment, suite, or unit", autoComplete: "address-line2", full: true, optional: true },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "region", label: "State or region", autoComplete: "address-level1" },
  { key: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  { key: "country", label: "Country", autoComplete: "country-name" },
];

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return status.tone === "error"
    ? <p className="form-error" role="alert">{status.text}</p>
    : <p className="form-status" role="status"><Check size={14} />{status.text}</p>;
}

/** Self-service account details. Profile fields live in Identity user metadata; email changes go through Identity confirmation. */
export function AccountSettings({ onProfileSaved, onClose }: { onProfileSaved: (profile: Profile) => void; onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [profile, setProfile] = useState<Profile>({ fullName: "", phone: "", address: { ...emptyAddress } });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"profile" | "email" | null>(null);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [emailStatus, setEmailStatus] = useState<Status>(null);

  useEffect(() => {
    let active = true;
    getUser().then(user => {
      if (!active) return;
      if (!user) { setLoad({ state: "signedOut" }); return; }
      setProfile(profileFromMetadata(user.userMetadata));
      setEmail(user.email ?? "");
      setLoad({ state: "ready", email: user.email ?? "", pendingEmail: user.pendingEmail ?? "" });
    }).catch(() => { if (active) setLoad({ state: "error" }); });
    return () => { active = false; };
  }, []);

  function updateAddress(key: keyof Address, value: string): void {
    setProfile(previous => ({ ...previous, address: { ...previous.address, [key]: value } }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) { setProfileStatus({ tone: "error", text: parsed.error.issues[0]?.message ?? "Check your details." }); return; }
    setBusy("profile"); setProfileStatus(null);
    try {
      const user = await updateUser({ data: profileToMetadata(parsed.data) });
      const saved = profileFromMetadata(user.userMetadata);
      setProfile(saved);
      setProfileStatus({ tone: "success", text: "Your details have been saved." });
      onProfileSaved(saved);
    } catch (error) {
      setProfileStatus({ tone: "error", text: error instanceof Error ? error.message : "We couldn’t save your details. Please try again." });
    } finally { setBusy(null); }
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (load.state !== "ready") return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setEmailStatus({ tone: "error", text: parsed.error.issues[0]?.message ?? "Enter a valid email address." }); return; }
    if (parsed.data === load.email.toLowerCase()) { setEmailStatus({ tone: "error", text: "That’s already your sign-in email." }); return; }
    setBusy("email"); setEmailStatus(null);
    try {
      const user = await updateUser({ email: parsed.data });
      const pendingEmail = user.pendingEmail ?? parsed.data;
      setLoad({ state: "ready", email: user.email ?? load.email, pendingEmail });
      setEmail(pendingEmail);
      setEmailStatus({ tone: "success", text: `We sent a confirmation link to ${pendingEmail}. Your sign-in email changes after you open it.` });
    } catch (error) {
      setEmailStatus({ tone: "error", text: error instanceof Error ? error.message : "We couldn’t start the email change. Please try again." });
    } finally { setBusy(null); }
  }

  if (load.state === "loading") return <p className="form-status" role="status">Loading your account…</p>;
  if (load.state !== "ready") {
    return <>
      <div className="form-note"><Info size={17} /><span>{load.state === "signedOut" ? "Sign in to manage your name, email, phone, and address." : "We couldn’t load your account. Reload and try again."}</span></div>
      {load.state === "signedOut" ? <a className="button primary full-button" href="/login" target="_top">Sign in</a> : <button type="button" className="button primary full-button" onClick={() => window.location.reload()}>Reload</button>}
    </>;
  }

  return <div className="account-settings">
    <div className="form-note"><LockKeyhole size={17} /><span>These details describe you, the account holder. They stay with your sign-in and aren’t added to your locker, backups, or family guide.</span></div>
    <form className="account-form" onSubmit={event => void saveProfile(event)} aria-busy={busy === "profile"}>
      <fieldset disabled={busy !== null}>
        <legend>Profile</legend>
        <div className="form-grid">
          <label className="full">Full name<input required maxLength={120} autoComplete="name" value={profile.fullName} onChange={event => setProfile(previous => ({ ...previous, fullName: event.target.value }))} /></label>
          <label className="full">Phone <span className="optional">optional</span><input type="tel" maxLength={40} autoComplete="tel" inputMode="tel" value={profile.phone} onChange={event => setProfile(previous => ({ ...previous, phone: event.target.value }))} placeholder="e.g. +1 555 010 0199" /></label>
        </div>
      </fieldset>
      <fieldset disabled={busy !== null}>
        <legend>Mailing address <span className="optional">optional</span></legend>
        <div className="form-grid">
          {addressFields.map(field => <label key={field.key} className={field.full ? "full" : ""}>{field.label}{field.optional && <> <span className="optional">optional</span></>}<input maxLength={field.key === "postalCode" ? 20 : 200} autoComplete={field.autoComplete} value={profile.address[field.key]} onChange={event => updateAddress(field.key, event.target.value)} /></label>)}
        </div>
      </fieldset>
      <StatusMessage status={profileStatus} />
      <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Close</button><button className="button primary" disabled={busy !== null}><Check size={16} />{busy === "profile" ? "Saving…" : "Save details"}</button></div>
    </form>
    <form className="account-form" onSubmit={event => void changeEmail(event)} aria-busy={busy === "email"}>
      <fieldset disabled={busy !== null}>
        <legend>Sign-in email</legend>
        <p className="account-hint" id="email-change-hint">We’ll send a confirmation link to the new address. Until you open it, keep signing in with {load.email || "your current email"}.</p>
        {load.pendingEmail && <div className="form-note"><Mail size={17} /><span>Waiting for confirmation of {load.pendingEmail}. Check that inbox, or request a new link below.</span></div>}
        <label>Email<input type="email" required maxLength={200} autoComplete="email" aria-describedby="email-change-hint" value={email} onChange={event => setEmail(event.target.value)} /></label>
      </fieldset>
      <StatusMessage status={emailStatus} />
      <div className="form-actions"><button className="button secondary" disabled={busy !== null}><Mail size={16} />{busy === "email" ? "Sending…" : "Send confirmation link"}</button></div>
    </form>
  </div>;
}
