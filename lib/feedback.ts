import { z } from "zod";

/**
 * Feedback and bug reports land in Netlify Forms. The field names here must match
 * public/__forms.html exactly; Netlify drops fields the registered form does not declare.
 */
export const FEEDBACK_FORM_NAME = "keepsake-feedback";
export const FEEDBACK_ENDPOINT = "/__forms.html";
export const feedbackKinds = ["feedback", "bug"] as const;
export type FeedbackKind = (typeof feedbackKinds)[number];
export const feedbackKindLabels: Record<FeedbackKind, string> = { feedback: "Share feedback", bug: "Report a bug" };

export const feedbackSchema = z.object({
  kind: z.enum(feedbackKinds),
  message: z.string().trim().min(10, "Add a few more words so we can understand.").max(4000, "Keep your message under 4,000 characters."),
  email: z.union([z.literal(""), z.string().trim().max(200).email("Enter a valid email address, or leave it blank.")]),
  context: z.string().max(1000),
}).strict();

export type Feedback = z.infer<typeof feedbackSchema>;
export type FeedbackResult = { ok: true } | { ok: false; error: string };

/** URL-encodes a submission; Netlify Forms does not accept JSON bodies. */
export function encodeFeedback(feedback: Feedback, honeypot = ""): string {
  return new URLSearchParams({
    "form-name": FEEDBACK_FORM_NAME,
    subject: `Keepsake ${feedback.kind === "bug" ? "bug report" : "feedback"} (%{submissionId})`,
    kind: feedback.kind,
    email: feedback.email,
    message: feedback.message,
    context: feedback.context,
    "bot-field": honeypot,
  }).toString();
}

export async function submitFeedback(input: unknown, honeypot = "", fetcher: typeof fetch = fetch): Promise<FeedbackResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your message and try again." };
  try {
    const response = await fetcher(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeFeedback(parsed.data, honeypot),
    });
    if (!response.ok) return { ok: false, error: "We couldn’t send your message. Please try again in a moment." };
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn’t reach Keepsake. Check your connection and try again." };
  }
}

/** Non-sensitive diagnostics attached to bug reports so they can be reproduced. */
export function describeEnvironment(view: string, sample: boolean): string {
  if (typeof window === "undefined") return `view=${view}`;
  const theme = document.documentElement.dataset.theme ?? "unknown";
  return [
    `view=${view}`,
    `example=${sample ? "yes" : "no"}`,
    `theme=${theme}`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
    `agent=${navigator.userAgent}`,
  ].join("; ").slice(0, 1000);
}
