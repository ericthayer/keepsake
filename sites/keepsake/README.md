# Keepsake

Live application: https://keepsake-family-locker.ethayer-design.chatgpt.site/

Private family account directory built with React, TypeScript, Vinext, and the Sites D1 database. Records belong to the signed-in ChatGPT user. No external financial APIs or account login credentials are used.

## Product behavior

- An explicitly labeled example locker appears until the owner starts a personal locker.
- Account and document records support create, edit, delete, search, filtering, review status, and provider contact information.
- Document records store locations, not original document uploads.
- Trusted contacts are a directory, not an invitation or permission system.
- A family guide collects the personal note, contacts, records, and a practical checklist; print styling supports PDF handoff.
- JSON backup and validated restore are supported. Restore starts a new locker and cannot overwrite an existing personal locker through the interface.
- Writes require identity, same-origin requests, validated input, and an optimistic version match.
- Private hosting limits online access to the owner. Beneficiaries receive only the guide or copy the owner deliberately provides. No automatic release or death verification is implemented.

## Structure

`app/components/` exports reusable typed React components. `lib/locker.ts` is the shared schema and model. `db/schema.ts` and `drizzle/` own database migrations. `design/master-template.html` and `design/DESIGN.md` preserve the design scaffold.

Run `npm run db:generate` for schema changes and the Sites build helper to build. Publish with the native Sites workflow. No secret configuration is needed.

See [docs/SITES_DEPLOYMENT.md](docs/SITES_DEPLOYMENT.md) for the working runtime, release checks, and GitHub publication process. GitHub branches store source; pushing a branch does not deploy the Sites application.

## Agent integration

Keepsake now exposes an authenticated stateless remote MCP server at `/mcp`, with eight tools for reads and previewed changes. The website can review proposals at `/?review=<proposalId>`. The server and UI use the same validation and optimistic concurrency rules; agent writes and their receipts are transactional.

See [docs/AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md) for connection, authentication, tool schemas, confirmation semantics, and browser WebMCP activation requirements. Browser WebMCP is staged, unmounted, and not claimed as verified. Run `npm run test:agents` to validate the integration against real SQLite.

## Appearance

Light, Dark, and System controls in both the sidebar and user settings share the same provider. The preference is stored in this browser and synchronized across tabs. System mode follows device changes. A shared before-paint bootstrap also runs in the standalone export. Print media retains the light palette.
