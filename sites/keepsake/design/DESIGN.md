# Keepsake design baseline

Approved working baseline for this site. Preserve the visual language through feature iterations unless the user requests a design change.

- Palette: warm ivory `#fafaf6`, paper white, forest `#284f3f`, sage `#eaf0df`, ink `#293c32`.
- Editorial Georgia headings; compact Arial interface typography. Quiet serif italics only in the hero.
- Desktop: 232 px persistent sidebar, 73 px top bar, 38 px content gutters, 278 px supporting column.
- Components: thin warm-gray borders, 6–12 px corner radii, subtle category tints, outlined Lucide icons.
- Mobile: off-canvas navigation below 760 px; single-column content; 3 compact summary cards.
- Semantics: explicit example mode, no fabricated security promises, no implied access invitation.
- Runtime composition lives in exported TypeScript React components under app/components/.
- Global tokens and responsive scaffold are app/globals.css. Family print layout shares the same baseline.

## Appearance extension

- User-authorized dark mode adds a forest-and-sage palette while preserving the approved light palette, typography, grid, and spacing.
- Mode options: Light, Dark, System; default System. The sidebar and settings share one appearance provider. Preference is browser-local, syncs across tabs, and follows live device changes in System mode.
- A before-paint bootstrap sets the resolved root theme to avoid flashing the wrong palette.
- Dark surfaces: page `#151d18`, cards `#202a22`, sidebar `#18211b`, modal `#222d25`. Text: primary `#e5eadd`, secondary `#b5c4ab`. Accent `#b3ce9c`.
- Semantic tokens cover category tints, readiness and warning states, controls, dialogs, guide panels, agent diffs, focus rings, and illustration colors. Original light values remain CSS fallbacks.
- Dark overrides apply only to screen media; printed/PDF family guides retain the original light palette.
