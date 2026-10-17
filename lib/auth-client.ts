"use client";
import { handleAuthCallback } from "@netlify/identity";

// Callback redemption must happen once even when React replays mount effects.
let callback: ReturnType<typeof handleAuthCallback> | undefined;
export function completeAuthCallback() {
  return callback ??= handleAuthCallback();
}
