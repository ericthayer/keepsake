"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { getUser } from "@netlify/identity";
import { Bug, Info, MessageSquareText, Send } from "lucide-react";
import { describeEnvironment, FEEDBACK_FORM_NAME, feedbackKindLabels, feedbackKinds, submitFeedback, type FeedbackKind } from "../../lib/feedback";

const kindIcons = { feedback: MessageSquareText, bug: Bug } as const;
const placeholders: Record<FeedbackKind, string> = {
  feedback: "What’s working, what’s confusing, or what you wish Keepsake could do.",
  bug: "What were you doing, what did you expect, and what happened instead?",
};

/** Sends feedback or a bug report to Netlify Forms. Bug reports attach non-sensitive browser details. */
export function FeedbackForm({ view, sample, onSent, onClose }: { view: string; sample: boolean; onSent: (message: string) => void; onClose: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);
  const groupId = useId();

  useEffect(() => {
    let active = true;
    // Prefill the reply address for signed-in people; signed-out visitors may add one.
    getUser().then(user => { if (active && user?.email) setEmail(previous => previous || user.email || ""); }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true); setError("");
    const context = kind === "bug" ? describeEnvironment(view, sample) : `view=${view}; example=${sample ? "yes" : "no"}`;
    const result = await submitFeedback({ kind, message, email, context }, honeypot.current?.value ?? "");
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    onSent(kind === "bug" ? "Thanks. Your bug report was sent." : "Thanks. Your feedback was sent.");
  }

  return <form name={FEEDBACK_FORM_NAME} className="feedback-form" onSubmit={event => void submit(event)} aria-busy={busy}>
    <fieldset className="appearance-control feedback-kind" disabled={busy}>
      <legend>What would you like to send?</legend>
      <div className="appearance-options">
        {feedbackKinds.map(value => { const Icon = kindIcons[value]; return <label className="appearance-choice" key={value}><input type="radio" name={`feedback-kind-${groupId}`} value={value} checked={kind === value} onChange={() => setKind(value)} /><span><Icon size={18} strokeWidth={1.7} /><span>{feedbackKindLabels[value]}</span></span></label>; })}
      </div>
    </fieldset>
    <div className="form-grid">
      <label className="full">{kind === "bug" ? "What happened?" : "Your feedback"}<textarea required minLength={10} maxLength={4000} rows={6} value={message} onChange={event => setMessage(event.target.value)} placeholder={placeholders[kind]} /></label>
      <label className="full">Reply email <span className="optional">optional</span><input type="email" maxLength={200} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" /><small>Only used if we need to follow up.</small></label>
      <label className="feedback-honeypot" aria-hidden="true">Leave this empty<input ref={honeypot} name="bot-field" tabIndex={-1} autoComplete="off" /></label>
    </div>
    <div className="form-note feedback-note"><Info size={17} /><span>{kind === "bug" ? "Your page, theme, screen size, and browser version are attached to help us reproduce it. " : ""}Please don’t include passwords, account numbers, or other sensitive details.</span></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}><Send size={16} />{busy ? "Sending…" : kind === "bug" ? "Send bug report" : "Send feedback"}</button></div>
  </form>;
}
