"use client";
import { useEffect, useState } from "react";
import { hydrateSession } from "@netlify/identity";
import { completeAuthCallback } from "../../lib/auth-client";
import { LockerApp } from "./locker-app";

/** Route Identity callbacks to the password/invitation flow before rendering private data. */
export function SessionLocker() {
  const [owner, setOwner] = useState({ id: "initial", name: "Your" });
  useEffect(() => {
    if (/(?:^#|&)(?:access_token|invite_token|recovery_token|confirmation_token|email_change_token)=/.test(window.location.hash)) {
      window.location.replace(`/login${window.location.hash}`);
      return;
    }
    let active = true;
    async function hydrate() {
      await completeAuthCallback();
      await hydrateSession().catch(() => null);
      const response = await fetch("/api/session", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json() as { user: { id: string; name: string } };
        if (active) setOwner({ id: data.user.id, name: data.user.name.trim().split(/\s+/)[0] || "Your" });
      }
    }
    void hydrate().catch(() => { /* The locker request presents the connection state. */ });
    return () => { active = false; };
  }, []);
  return <LockerApp key={owner.id} ownerName={owner.name} />;
}
