# Netlify deployment and cutover

Target project: `keep5ake` (`00198131-fbbe-4e50-b11b-bd066dd3462f`).

## Configure the existing project

1. Review the migration PR and enable Deploy Previews for it. The repository's `netlify.toml` supplies build command `npm run build`, publish directory `.next`, and the Next.js Runtime plugin. A successful deploy lists a `___netlify-server-handler` function next to `api` and `mcp`; if it is missing, `/` returns 404. Remove any stale UI override that skips the Next.js adapter (for example `NETLIFY_NEXT_PLUGIN_SKIP=true`). Do not add a static `/* -> /index.html` rewrite.
2. In [Identity](https://app.netlify.com/projects/keep5ake/identity), enable Identity and set registration to **Invite only**. Invite your own email address, then follow the invitation link and set a password. The app completes invitation, confirmation, recovery, and provider callbacks at `/login`; root-page callback links are routed there automatically. Enable optional login providers in Identity settings; the app displays only enabled providers.
3. Netlify automatically provisions Postgres from `@netlify/database` and applies migrations in `netlify/database/migrations`. Confirm Database is available on the existing account's credit-based plan. Deploy Preview databases are separate branches and can contain copies of production data; protect previews before sharing links.
4. Under **Project configuration → Build & deploy → Continuous deployment**, set the production branch to **main**. The published project was previously following `feature/life-locker-v1`.
5. Merge the migration into `main` after preview verification. Check that the deploy includes the Next.js runtime and both `api` and `mcp` Functions, and that database migrations complete before publication.

Identity configuration and production-branch selection require Netlify dashboard settings; the available project connector cannot change them. Identity is not available under `netlify dev`; test it on the deployed preview. A missing Identity callback, unreachable Identity endpoint, or failed provider return must be fixed in those settings before continuing.

## Verify the deployed preview

- `/` renders the existing example locker in Light, Dark, and System mode, including mobile layout and the family-guide print view.
- `/login` loads the configured sign-in options; invite acceptance, login, refresh, password recovery, and logout work.
- Anonymous `/api/locker` returns 401. A spoofed `oai-authenticated-user-id` header grants no access. Never disable these checks to make the example render.
- Save an account, contact, and note under the owner account. Reload and verify persistence. A second test account cannot see them. Remove test records through the app afterward.
- Export JSON and restore it into a separate empty test locker. Compare records, contacts, and the family note.
- Create an agent key and connect using `Authorization: Bearer <key>`. Discover tools, prepare a change, review its before/after values, approve it explicitly, and read it back. Revoke the key and verify its next call returns 401.
- Prepare a proposal, edit the locker in the UI, and verify the old proposal fails with a version conflict.

## Move existing data

Keep the original Sites deployment intact. Download its current Keepsake JSON backup through its UI. Sign in on Netlify and restore the backup while the new locker is empty. No user-ID mapping or data migration happens automatically. Inspect the restored data before using Netlify as the primary copy. Existing agent keys/proposals must be recreated on the new host.

## Rollback

Retain the Sites app and exported backup throughout cutover. Revert the migration commit to restore source if required; restoring a Netlify deploy alone does not undo database migrations. Never edit an applied migration, reset a hosted database, or restore a database snapshot as an automatic rollback step.
