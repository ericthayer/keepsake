import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emailSchema, firstName, profileFromMetadata, profileSchema, profileToMetadata } from "../lib/account";
import { encodeFeedback, FEEDBACK_FORM_NAME, submitFeedback } from "../lib/feedback";

test("account profiles round-trip through Identity metadata and tolerate bad metadata", () => {
  const profile = profileSchema.parse({ fullName: "  Jane Doe ", phone: "+1 (555) 010-0199", address: { line1: "1 Elm St", line2: "", city: "Portland", region: "OR", postalCode: "97201", country: "USA" } });
  assert.equal(profile.fullName, "Jane Doe");
  assert.deepEqual(profileFromMetadata(profileToMetadata(profile)), profile);
  assert.deepEqual(profileFromMetadata({ full_name: 42, address: "nope" }).address.city, "");
  assert.equal(profileFromMetadata({ name: "Legacy Name" }).fullName, "Legacy Name");
  assert.equal(profileFromMetadata(undefined).phone, "");
  assert.equal(firstName("Jane Doe"), "Jane");
  assert.equal(firstName("   "), "Your");
});

test("account validation rejects blank names, bad phones and invalid emails", () => {
  const address = { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };
  assert.equal(profileSchema.safeParse({ fullName: " ", phone: "", address }).success, false);
  assert.equal(profileSchema.safeParse({ fullName: "Jane", phone: "call me", address }).success, false);
  assert.equal(profileSchema.safeParse({ fullName: "Jane", phone: "", address, extra: 1 }).success, false);
  assert.equal(emailSchema.parse(" Jane@Example.com "), "jane@example.com");
  assert.equal(emailSchema.safeParse("not-an-email").success, false);
});

test("feedback is URL-encoded with field names registered in the Netlify Forms skeleton", () => {
  const body = new URLSearchParams(encodeFeedback({ kind: "bug", message: "The dropdown overlaps the edge.", email: "", context: "view=overview" }));
  assert.equal(body.get("form-name"), FEEDBACK_FORM_NAME);
  const skeleton = readFileSync(new URL("../public/__forms.html", import.meta.url), "utf8");
  assert.match(skeleton, new RegExp(`name="${FEEDBACK_FORM_NAME}"`));
  for (const field of body.keys()) assert.match(skeleton, new RegExp(`name="${field}"`), `skeleton declares ${field}`);
});

test("feedback submission validates before posting and reports failures", async () => {
  const calls: RequestInit[] = [];
  const ok: typeof fetch = async (_url, init) => { calls.push(init ?? {}); return new Response("", { status: 200 }); };
  assert.deepEqual(await submitFeedback({ kind: "feedback", message: "short", email: "", context: "" }, "", ok), { ok: false, error: "Add a few more words so we can understand." });
  assert.equal(calls.length, 0);
  assert.deepEqual(await submitFeedback({ kind: "feedback", message: "Fonts are too small to read.", email: "a@b.co", context: "" }, "", ok), { ok: true });
  assert.equal(new Headers(calls[0].headers).get("content-type"), "application/x-www-form-urlencoded");
  const failing: typeof fetch = async () => new Response("", { status: 404 });
  assert.equal((await submitFeedback({ kind: "bug", message: "Something broke here.", email: "", context: "" }, "", failing)).ok, false);
  const offline: typeof fetch = async () => { throw new TypeError("offline"); };
  assert.equal((await submitFeedback({ kind: "bug", message: "Something broke here.", email: "", context: "" }, "", offline)).ok, false);
});
