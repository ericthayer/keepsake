import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { appearanceBootstrap, appearanceStorageKey } from "../lib/appearance";
import { getAppearanceSnapshot, getServerAppearanceSnapshot, setAppearance, subscribeAppearance } from "../lib/appearance-client";

function browserFixture() {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const media = Object.assign(new EventTarget(), { matches: false });
  const values = new Map<string, string>();
  const dataset: { appearance?: string; theme?: string } = {};
  const document = { documentElement: { dataset } };
  const browser = Object.assign(new EventTarget(), {
    localStorage: { setItem: (key: string, value: string) => { values.set(key, value); }, getItem: (key: string) => values.get(key) ?? null },
    matchMedia: () => media,
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  return {
    browser, document, dataset, media, values,
    restore() {
      for (const [key, descriptor] of [["window", originalWindow], ["document", originalDocument]] as const) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("appearance hydration preserves the before-paint preference and notifies every control", () => {
  const f = browserFixture();
  let unsubscribe = () => {};
  try {
    f.values.set(appearanceStorageKey, "dark");
    runInNewContext(appearanceBootstrap, { localStorage: f.browser.localStorage, document: f.document, matchMedia: f.browser.matchMedia });
    assert.equal(getServerAppearanceSnapshot(), "system");
    let changes = 0;
    unsubscribe = subscribeAppearance(() => { changes++; });
    assert.equal(getAppearanceSnapshot(), "dark");
    assert.equal(f.dataset.theme, "dark");
    setAppearance("light");
    assert.equal(changes, 1);
    assert.equal(f.values.get(appearanceStorageKey), "light");
    assert.equal(getAppearanceSnapshot(), "light");
    assert.equal(f.dataset.theme, "light");
    unsubscribe();
    setAppearance("dark");
    assert.equal(changes, 1);
  } finally { unsubscribe(); f.restore(); }
});

test("device changes update only the system palette and stop after unsubscribe", () => {
  const f = browserFixture();
  const unsubscribe = subscribeAppearance(() => {});
  try {
    assert.equal(f.dataset.theme, "light");
    f.media.matches = true;
    f.media.dispatchEvent(new Event("change"));
    assert.equal(f.dataset.theme, "dark");
    setAppearance("light");
    f.media.dispatchEvent(new Event("change"));
    assert.equal(f.dataset.theme, "light");
    setAppearance("system");
    unsubscribe();
    f.media.matches = false;
    f.media.dispatchEvent(new Event("change"));
    assert.equal(f.dataset.theme, "dark");
  } finally { unsubscribe(); f.restore(); }
});

test("other-tab changes and storage clearing synchronize the preference", () => {
  const f = browserFixture();
  let changes = 0;
  const unsubscribe = subscribeAppearance(() => { changes++; });
  function storage(key: string | null, newValue: string | null) {
    f.browser.dispatchEvent(Object.assign(new Event("storage"), { key, newValue }));
  }
  try {
    storage("unrelated", "dark");
    assert.equal(changes, 0);
    storage(appearanceStorageKey, "dark");
    assert.equal(getAppearanceSnapshot(), "dark");
    storage(null, null);
    assert.equal(getAppearanceSnapshot(), "system");
    assert.equal(f.dataset.theme, "light");
    assert.equal(changes, 2);
  } finally { unsubscribe(); f.restore(); }
});

test("a blocked storage write still updates the current selection and subscribers", () => {
  const f = browserFixture();
  let changes = 0;
  const unsubscribe = subscribeAppearance(() => { changes++; });
  try {
    f.browser.localStorage.setItem = () => { throw new Error("Storage unavailable"); };
    setAppearance("dark");
    assert.equal(getAppearanceSnapshot(), "dark");
    assert.equal(f.dataset.theme, "dark");
    assert.equal(changes, 1);
  } finally { unsubscribe(); f.restore(); }
});
