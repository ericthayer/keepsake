import { z } from "zod";

/**
 * Account profile stored in the signed-in person's Netlify Identity `user_metadata`.
 * It describes the account holder only; it is never part of the locker, backups, or the family guide.
 */
const text = (max: number) => z.string().trim().max(max);

export const addressSchema = z.object({
  line1: text(200),
  line2: text(200),
  city: text(120),
  region: text(120),
  postalCode: text(20),
  country: text(120),
}).strict();

export const profileSchema = z.object({
  fullName: text(120).min(1, "Enter your name."),
  phone: text(40).regex(/^[0-9+().\-\s]*$/, "Use digits, spaces, and + ( ) - only."),
  address: addressSchema,
}).strict();

export const emailSchema = z.string().trim().toLowerCase().max(200).email("Enter a valid email address.");

export type Address = z.infer<typeof addressSchema>;
export type Profile = z.infer<typeof profileSchema>;

export const emptyAddress: Address = { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };

function readString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Reads a profile from untrusted Identity metadata without throwing. */
export function profileFromMetadata(metadata: Record<string, unknown> | undefined): Profile {
  const meta = metadata ?? {};
  const raw = typeof meta.address === "object" && meta.address !== null ? meta.address as Record<string, unknown> : {};
  return {
    fullName: readString(meta.full_name, 120) || readString(meta.name, 120),
    phone: readString(meta.phone, 40),
    address: {
      line1: readString(raw.line1, 200),
      line2: readString(raw.line2, 200),
      city: readString(raw.city, 120),
      region: readString(raw.region, 120),
      postalCode: readString(raw.postalCode, 20),
      country: readString(raw.country, 120),
    },
  };
}

/** Maps a validated profile to the `data` payload accepted by Identity `updateUser`. */
export function profileToMetadata(profile: Profile): Record<string, unknown> {
  return { full_name: profile.fullName, phone: profile.phone, address: { ...profile.address } };
}

/** First name shown in the workspace label, matching SessionLocker's derivation. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "Your";
}
