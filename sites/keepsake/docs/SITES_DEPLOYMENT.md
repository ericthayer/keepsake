# Keepsake Sites deployment

## Working application

- URL: https://keepsake-family-locker.ethayer-design.chatgpt.site/
- Site identity: `.openai/hosting.json`.
- Runtime: Vinext on Cloudflare Workers through Sites.
- Storage: the existing Sites D1 binding `DB`.
- Authentication: Sites supplies the authenticated ChatGPT identity. Locker and agent endpoints enforce that identity server-side.

The page is publicly reachable; personal locker records require the signed-in owner's identity. Public site access does not grant access to another user's records. Do not describe the entire site as owner-private.

## Release checks

Use Node 22.13 or newer and the pinned package manager in `package.json`. In a fresh checkout, install dependencies with `npm run install:ci`. In the Sites workspace, use the Sites dependency installer.

Run these checks against the source that will be packaged:

```sh
npm test
npx --no-install tsc --noEmit --incremental false
npm run build
```

The tests cover owner isolation, preview and confirmation, optimistic concurrency, atomic writes and receipts, MCP dispatch, and persisted appearance preferences. A passing build does not prove that a deployed browser session works.

## Publish and verify

1. Open the existing project with the Sites source workflow. Preserve `.openai/hosting.json`, existing schema migrations, and the current access policy.
2. Apply only the intended changes. Keep the established UI, reusable components, design scaffold, and existing fixes.
3. Run the release checks, then package the resulting Worker with the Sites source workflow. Retain its pushed commit SHA and archive as one matching release.
4. Save that exact source commit and archive as a Sites version, then deploy that version to the existing project.
5. Wait for a terminal successful deployment result before opening the GitHub PR. Record the live URL, version, checks, and any browser verification limits in the PR.
6. Publish the same source tree to a new GitHub branch based on `main`. Compare the resulting tree with the validated source before creating a PR into `main`.

The existing project is the publication target; do not create a replacement Site or reset its data. GitHub is a source mirror, not an automatic Sites deployment pipeline. Future merges need an explicit Sites publication to update the working URL.

## Hosting boundary

This application requires the Sites identity and D1 environment. Its Worker build is not a Netlify static export or a native Netlify Function. Publishing this branch to Netlify alone does not provide those services. A Netlify migration is a separate implementation and requires its own deployed verification and data migration; do not substitute that migration for this working Sites release.
