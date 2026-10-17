# Add dark mode and shared appearance controls

The locker previously used a single light palette. Users can now choose Light, Dark, or System from both the sidebar and user settings. The two controls share one preference, saved in this browser and synchronized across tabs. System mode follows device changes, and a before-paint script applies the saved palette on reload.

The dark palette covers surfaces, forms, category icons, readiness/warning/error states, dialogs, family guide, agent review, and the hero illustration. Existing light colors and layout rules remain intact through token fallbacks. Print/PDF output retains the light palette. No data schema, permissions, or MCP tool changes.

Validation: TypeScript check passed; preference resolution checked for all modes, invalid values, both OS modes, and blocked storage; the original light CSS was compared against token fallbacks; 27 dark text/background pairs meet 4.5:1 and control boundaries meet 3:1. Production build is required before publication. Browser visual and interaction QA remains unverified because the supported browser capability is unavailable.
