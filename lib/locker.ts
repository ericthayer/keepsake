import { z } from "zod";

export const categories = ["insurance", "banking", "investments", "property", "legal", "other"] as const;
export const categoryLabels: Record<string, string> = { insurance: "Life & insurance", banking: "Banking", investments: "Investments", property: "Home & mortgage", legal: "Estate & legal", other: "Other" };
const line = z.string().trim().max(200);
const publicUrl = z.string().trim().max(500).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}, "Use a public http(s) address without credentials, query parameters, or access tokens.");
export const recordSchema = z.object({
  id: z.string().min(1).max(80), kind: z.enum(["account", "document"]), title: line.min(1),
  category: z.enum(categories), organization: line, website: publicUrl,
  reference: z.string().trim().regex(/^[a-zA-Z0-9]{0,4}$/, "Only the last four characters."),
  contactName: line, contactEmail: z.union([z.literal(""), z.string().email().max(200)]), contactPhone: z.string().trim().max(50),
  location: z.string().trim().max(500), notes: z.string().trim().max(3000), status: z.enum(["ready", "review"]), updatedAt: z.string().datetime(),
}).strict();
export const contactSchema = z.object({ id: z.string().min(1).max(80), name: line.min(1), relationship: line, role: line, email: z.union([z.literal(""), z.string().email().max(200)]), phone: z.string().trim().max(50), notes: z.string().trim().max(2000) }).strict();
export const lockerSchema = z.object({ records: z.array(recordSchema).max(300), contacts: z.array(contactSchema).max(100), message: z.string().trim().max(5000), reviewedAt: z.union([z.literal(""), z.string().datetime()]) }).strict().superRefine((data, ctx) => {
  if (new Set(data.records.map(r => r.id)).size !== data.records.length || new Set(data.contacts.map(r => r.id)).size !== data.contacts.length) ctx.addIssue({code:z.ZodIssueCode.custom,message:"Record identifiers must be unique."});
});
export type LockerRecord = z.infer<typeof recordSchema>;
export type TrustedContact = z.infer<typeof contactSchema>;
export type Locker = z.infer<typeof lockerSchema>;
export const lockerEnvelopeSchema = z.object({locker:lockerSchema.nullable(),version:z.number().int().min(0)});
export type LockerEnvelope = z.infer<typeof lockerEnvelopeSchema>;
export const emptyLocker: Locker = { records: [], contacts: [], message: "", reviewedAt: "" };
export function blankRecord(kind: "account" | "document" = "account"): LockerRecord {
  return { id: crypto.randomUUID(), kind, title: "", category: kind === "document" ? "legal" : "insurance", organization: "", website: "", reference: "", contactName: "", contactEmail: "", contactPhone: "", location: "", notes: "", status: "review", updatedAt: new Date().toISOString() };
}
export function formatDate(value: string) { return value ? new Intl.DateTimeFormat("en-US", {month:"short", day:"numeric", year:"numeric"}).format(new Date(value)) : "Not reviewed yet"; }
