# Keepsake

A family account directory built with Next.js, React, TypeScript, Netlify Identity, and Netlify Database (Postgres). Save account connections, document locations, trusted contacts, and a printable family guide. Never store financial login credentials, full account numbers, or original identity documents.

## Development

Requires Node 22.13 or newer.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

`next dev` renders the example locker. Use `netlify dev` for local Functions and Database integration. Netlify Identity sign-in must be tested on a deployed site or Deploy Preview; it does not run under local development.

## Deployment

The repository contains `netlify.toml`: build `npm run build`, publish `.next`, and bundle modern Functions from `netlify/functions`. Netlify automatically supplies its Next.js adapter. No static SPA fallback is used.

Before production cutover, follow [the deployment runbook](docs/NETLIFY_DEPLOYMENT.md). Enable Identity, choose **Invite only**, and invite the owner. The `@netlify/database` dependency and committed SQL migration enable automatic database provisioning on supported Netlify plans. Database usage consumes Netlify credits; verify the existing account supports Database before publishing.

Anonymous visitors see the labeled example only. Every data API requires a verified Identity session; every query is scoped to that identity's user ID. Saved contacts have no granted access. Family members receive only the guide or backup the owner deliberately shares.

## Data and architecture

- `app/components/`: exported typed components; the existing workspace design is preserved.
- `design/DESIGN.md`, `design/master-template.html`: approved visual scaffold.
- `lib/locker.ts`: validation and portable JSON backup model.
- `lib/server/locker-store.ts`: owner-scoped Postgres transactions with row locks and optimistic versions.
- `netlify/database/migrations/`: append-only SQL migrations, applied by Netlify during deployment.
- `netlify/functions/api.mts`: verified-session APIs for the locker, proposals, and agent-key management.
- `netlify/functions/mcp.mts`: authenticated remote MCP endpoint with revocable owner-bound keys.

Postgres integration tests execute the actual migration using PGlite. The in-process test adapter serializes its single connection; production uses Postgres clients and owner-row locks. These tests verify schema, transactions, rollback, version conflicts, key revocation, owner isolation, and MCP dispatch. They do not replace deployed Identity and Netlify routing verification.

## Migration from Sites

Sites authentication and D1 bindings have been removed from this branch. Identity accounts are new and do not inherit the old ChatGPT user IDs. Export a version 1 Keepsake JSON backup from the original Sites app, sign into the Netlify app, and restore it into an empty locker. Review and keep the original copy until the restored records, contacts, and note have been checked. No production data is copied or deleted automatically. Encrypted legacy `.locker` files are not supported by the JSON restore flow.

## Agent access

In settings, choose **Connect an agent**, create a named key, and copy it once into the client's credential storage. Only a SHA-256 hash is stored; keys can be revoked immediately. Use `/mcp` with `Authorization: Bearer <key>`. The previous Sites plugin authentication does not transfer to this host. See [agent integration](docs/AGENT_INTEGRATION.md).

Light, Dark, and System modes remain synchronized between the sidebar and settings, across tabs, and with device changes. Browser WebMCP remains inactive until its supported-browser verification passes.
