"use client";

import { appearanceStorageKey, resolveAppearance, validAppearance, type Appearance } from "./appearance";

const appearanceChanged = "keepsake:appearance-change";

export function getAppearanceSnapshot(): Appearance {
  return validAppearance(document.documentElement.dataset.appearance);
}

export function getServerAppearanceSnapshot(): Appearance {
  return "system";
}

function applyAppearance(value: Appearance) {
  const systemDark = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.appearance = value;
  document.documentElement.dataset.theme = resolveAppearance(value, systemDark);
}

export function setAppearance(value: Appearance) {
  const next = validAppearance(value);
  applyAppearance(next);
  try { window.localStorage.setItem(appearanceStorageKey, next); }
  catch { /* Keep the selection usable when browser storage is unavailable. */ }
  window.dispatchEvent(new Event(appearanceChanged));
}

export function subscribeAppearance(onChange: () => void) {
  const media = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const systemChanged = () => {
    if (getAppearanceSnapshot() === "system") applyAppearance("system");
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key === appearanceStorageKey || event.key === null) {
      applyAppearance(validAppearance(event.newValue));
      onChange();
    }
  };
  // The shared before-paint bootstrap initializes the DOM preference.
  applyAppearance(getAppearanceSnapshot());
  media?.addEventListener("change", systemChanged);
  window.addEventListener("storage", storageChanged);
  window.addEventListener(appearanceChanged, onChange);
  return () => {
    media?.removeEventListener("change", systemChanged);
    window.removeEventListener("storage", storageChanged);
    window.removeEventListener(appearanceChanged, onChange);
  };
}
