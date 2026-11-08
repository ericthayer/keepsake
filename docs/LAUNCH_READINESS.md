# Launch readiness — Keepsake (Netlify app)

Reviewed 2026-11-07 against `main` @ `dd52282` (v0.2.0), using the shipping-and-launch checklist.

## Verdict: NO-GO until P0 #1 (Invite only) is set and the P0 fixes are deployed

> **Update 2026-11-07:** P0 #2–#4 are fixed in code on `claude/keepsake-status-review-b29bdc` (awaiting PR, CI, and Deploy Preview). P0 #1 is a dashboard change for the owner.

Production is **live**. `keep5ake.netlify.app` serves `main` @ `dd52282`. It was published 2026-10-17 with the Next.js handler, `api` and `mcp` functions, and an on-publish DB snapshot. The core data path is sound: owner-scoped queries, row locks, optimistic versions, hashed revocable agent keys, a strict same-origin check, size caps, and rate limits. Four gaps make the deploy unready for real family data. Two of them (open sign-up, vulnerable Next.js) are live exposures today.

## What was verified

| Check | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm run typecheck` | ✅ clean |
| `npm test` | ✅ 25/25 pass (PGlite runs the real migration; 3 new error-logging tests) |
| `npm run build` | ⚠️ Not verifiable locally: Turbopack's PostCSS worker can't bind a port in this environment. Netlify built and published the same commit successfully. |
| `npm audit --omit=dev` | 🟡 Next.js advisories cleared by 16.4.5; 1 high (zod) remains, see P1 #6 |
| Live `/`, `/login` | ✅ 200 |
| Live anonymous `/api/locker`, `/api/session`, `/mcp` | ✅ 401 |
| Spoofed `oai-authenticated-user-id` header | ✅ 401 |
| Live HSTS, `nosniff`, API `private, no-store` | ✅ present |
| Live CSP / X-Frame-Options / Referrer-Policy / Permissions-Policy | ❌ absent |
| Live Identity settings (`/.netlify/identity/settings`) | ❌ `disable_signup: false`: **registration is open**, not invite-only |
| Deploy secret scan | ✅ 0 matches |
| Lighthouse (mobile, `/`) | Perf 96 · A11y 97 · Best Practices 92 · SEO 90 (`noindex` is intentional) |
| Health endpoint | ❌ none (`/healthz` 404) |
| CI on PRs | 🟡 `.github/workflows/ci.yml` added; branch protection still to enable |

## Checklist status

| Area | Status | Notes |
|---|---|---|
| Code quality | 🟡 | Green locally, but nothing enforces it on merge. No TODOs or stray `console.log`. |
| Security | 🔴 | Open sign-up; Next.js critical advisories; no CSP or clickjacking protection on pages that show sensitive family info. Auth, authz, input validation, origin checks and rate limits are solid. |
| Performance | 🟢 | Lighthouse 96. One owner-row query per request, PK/indexed lookups, no N+1. The 15 s visibility-gated poll is the only recurring load. |
| Accessibility | 🟢 | Lighthouse 97. Modal focus return and centering were fixed in the most recent merge (#6). |
| Infrastructure | 🟡 | Deploy, DB, migrations and SSL are fine. Server errors are swallowed without logging, there is no health check, and Deploy Previews are unprotected on a public repo. |
| Documentation | 🟡 | README and runbook are good. No CHANGELOG, and no ADR for the open Sites-vs-Netlify hosting decision. |
| Rollback | 🟢 | Documented in `NETLIFY_DEPLOYMENT.md`. Netlify takes on-publish DB snapshots, and the Sites app plus a JSON backup stay as the fallback. |

## Action items

### P0: blockers (do before inviting anyone)

1. **Switch Identity to Invite only.** *(Dashboard, owner.)* Live settings show `disable_signup: false`, so anyone can register, confirm by email, and consume DB credits. Path: Netlify → keep5ake → Identity → Registration → **Invite only**. Verify with `curl -s https://keep5ake.netlify.app/.netlify/identity/settings` (expect `"disable_signup":true`). Check whether any stray accounts were created while sign-up was open, and remove them.
2. ✅ **Patch Next.js.** *(Done: `next` and `eslint-config-next` pinned to 16.4.5.)* Bump `next` and `eslint-config-next` 16.3.4 → **16.4.5**. Advisories include unauthenticated RCE in the Image Optimization API (SVG) and in `use cache`, SSRF in image optimization, and Server Actions DoS. The app doesn't use `next/image`, `next/og`, `use cache` or Server Actions, so exposure is limited, but the framework endpoints still exist. Re-run lint, typecheck and test, then verify the Deploy Preview.
3. ✅ **Log server failures.** *(Done: `logServerError` in `lib/server/http.ts` writes one JSON line per unexpected failure, with scope, route, method, Netlify request id, error name, message and code. It never logs bodies, owner ids, emails or keys. Covers API, MCP, and agent-tool failures via an `AgentService` hook, and 503 responses now return the `requestId`. Tests in `tests/netlify.test.ts`.)* `lib/server/api-handler.ts` and `lib/server/mcp-handler.ts` turn every unexpected error into a 503 and log nothing, so a production outage leaves no trace in function logs. Add one structured `console.error` (route, method, error name and message, a request id) without locker contents or user PII. Add a test that asserts the 503 body still leaks nothing.
4. 🟡 **Gate merges with CI.** *(Workflow added. It runs lint, typecheck, test, build and a critical-level audit on PRs and pushes to `main`, on Node 22. Remaining: in GitHub Settings → Branches, require the "Lint, typecheck, test, build" check on `main`.)* Add `.github/workflows/ci.yml` that runs `npm ci && npm run lint && npm run typecheck && npm test && npm run build` on PRs to `main`, plus branch protection requiring it. As a cheaper interim step, set the Netlify build command to run the same chain so a red build blocks publish.

### P1: before relying on it as the primary copy

5. **Security headers for HTML routes** (`netlify.toml` `[[headers]]`): `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a CSP. Ship the CSP as `Content-Security-Policy-Report-Only` first: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. Inline script is needed for the appearance bootstrap and the RSC payload. Tighten to a nonce later if wanted, and enforce after a clean week.
6. **Migrate zod 3 → 4.** GHSA-mrhx-c7xc-m3w5 (memory exhaustion on oversized constrained collections) has no 3.x fix. Exposure is capped by the 500 KB / 64 KB body limits, but it is still flagged high. Replace `zod-to-json-schema` with zod 4's built-in `z.toJSONSchema` in `lib/agent-contract.ts`, update `z.ZodIssueCode.custom` usage in `lib/locker.ts`, and keep the Sites copy untouched.
7. **Error boundaries.** Add `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` in the existing visual language. Today an uncaught render error shows Next's default page.
8. **Health check plus uptime alert.** Add `GET /api/health` (unauthenticated, `SELECT 1`, returns `{ok:true}` with no data) and point an uptime monitor at it. Netlify Observability is already attached to the functions. Add an alert on function error rate.
9. **Protect Deploy Previews.** The repo is public, `requiresPassword` is false, and preview DB branches can copy production data. Enable password or team-SSO protection for non-production deploys (Pro plan supports it).
10. **Run the production verification script** from `docs/NETLIFY_DEPLOYMENT.md` § "Verify the deployed preview" against production. That covers invite, login, recovery and logout; a second account's isolation; export and restore; the agent-key lifecycle; and the stale-proposal conflict. Record the date and result in this file.
11. **Data cutover.** Export the JSON backup from the Sites app, restore it into the Netlify locker, compare records, contacts and note, and keep the Sites copy until sign-off.

### P2: hygiene after launch

12. **ADR: hosting decision.** Record whether Netlify is now primary, and either freeze `sites/keepsake` (read-only, with a banner) or retire it. Two hand-synced copies will drift.
13. **Prune unused UI kit.** Nothing in `app/` imports `components/ui/*` (61 shadcn files). Removing the kit and its exclusive deps (recharts, cmdk, embla, input-otp, react-day-picker, react-resizable-panels, vaul, sonner, date-fns, react-hook-form, @hookform/resolvers, next-themes, @base-ui/react, @shadcn/react) shrinks the audit surface and install time.
14. **Dependabot** (or Renovate) for npm and GitHub Actions. Note `.npmrc` sets `audit=false`, so installs never surface advisories.
15. **CHANGELOG** and a version bump to `1.0.0` at the invite-only launch.
16. **Lightweight SLO.** For example, 99.5 % of `/api/locker` requests succeed per 30 days. When it's breached, pause feature work until fixed. This fits a single-family app without heavier tooling.

## Rollback plan (current)

- **Trigger:** owner-visible save failures, any cross-owner data visibility, or function error spike.
- **App:** Netlify → Deploys → publish the previous deploy (< 1 min). Source: `git revert <sha>` on `main`.
- **Database:** migrations are append-only. Do not auto-restore snapshots; restore from the on-publish snapshot only by deliberate decision.
- **Data:** the Sites app and the exported JSON backup remain the fallback until cutover sign-off (item 11).

## Local environment note

`~/.npm` contains root-owned files, so `npm ci` fails with the default cache. Fix with `sudo chown -R 501:20 ~/.npm`, or use `npm ci --cache "$TMPDIR/npm-cache"`.
