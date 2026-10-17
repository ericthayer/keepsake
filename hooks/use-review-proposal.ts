"use client";

import { useSyncExternalStore } from "react";

const reviewChanged = "keepsake:review-change";

function getReviewProposal() {
  const id = new URLSearchParams(window.location.search).get("review");
  return id && id.length <= 80 ? id : null;
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(reviewChanged, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(reviewChanged, onChange);
  };
}

export function useReviewProposal() {
  return useSyncExternalStore(subscribe, getReviewProposal, () => null);
}

export function clearReviewProposal() {
  const url = new URL(window.location.href);
  url.searchParams.delete("review");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  window.dispatchEvent(new Event(reviewChanged));
}
