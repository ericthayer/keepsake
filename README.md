# Life Locker

An encrypted, private record of **where things are**: life insurance, bank and investment accounts, the mortgage, the will, and the people to call. It exists so your family has one place to start if something happens to you.

It stores pointers, not secrets. You record "Harborview Mutual Life, policy ending 4417, claims line (555) 019-6600, paperwork in the fireproof box". You never record passwords, PINs, full account numbers, or Social Security numbers. The editor warns when something looks like one.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4173, rebuilds on change
npm test           # unit tests (crypto, guard, store, vault)
npm run test:e2e   # browser test: owner builds a locker, family opens it
```

Requires Node 22.18 or later. There is no bundler: `tsc` compiles `src/` to native ES modules in `public/js/`, and `public/` is the whole site.

## How your family gets it

The locker lives encrypted in your browser while you edit it. Your family can't open your browser, so you give them a copy:

| Path | What you do | What they do |
| --- | --- | --- |
| **File with your will** (recommended) | Settings → Download `.locker` file. Put it on a USB drive with your will, or give it to your executor or attorney. | Open the site, choose "Open a .locker file", enter the passphrase. |
| **Published with the site** | Rename the file to `vault.locker`, put it in `public/`, remove the `public/vault.locker` line from `.gitignore`, deploy. | Visit the site. It offers to open the family locker. |
| **Paper** | Family guide → Print. | Read it. |

The passphrase is the key to everything. Write it on a card and keep it with the will. The passphrase hint is saved **unencrypted** in the file so the family can find it: "On the card in the fireproof box", never the passphrase.

Re-download after every change. The overview's checklist and the header's download button show when your backup is out of date.

## Security model

- **Encryption**: PBKDF2-SHA-256 (600,000 iterations) derives an AES-256-GCM key from your passphrase. A fresh IV is used on every save. The key is non-extractable and lives only in memory. Everything runs in WebCrypto; nothing leaves the device.
- **No server**: the site makes no outside requests. Fonts are self-hosted. The CSP (`public/_headers` and a meta tag) allows only same-origin scripts, styles, fonts, and fetches, and blocks framing.
- **Untrusted input**: `.locker` files and `vault.locker` are validated before use, including a cap on iteration counts so a crafted file can't hang the tab. All rendering uses `textContent`; no user string reaches `innerHTML`. Links render only for `http(s)` URLs.
- **Auto-lock** after 10 minutes idle (configurable). Locking clears the key and the decrypted data from memory.
- **No recovery**. A lost passphrase means a lost locker. This is deliberate.

### What this does not protect against

- **A weak passphrase on a published file.** `vault.locker` on a public site can be attacked offline. The app requires a 12+ character passphrase and rates its strength, but four or more random words is the real bar. If that worries you, use the file-with-your-will path.
- **A compromised device.** Malware or a malicious browser extension on the machine where you unlock it can read what you see.
- **Hosting going away.** A website may not outlive you. That is why the file and paper paths come first.

## Architecture

Vanilla TypeScript and Web Components (Custom Elements, Shadow DOM, constructable stylesheets). One dev dependency for building and one for browser tests.

```
src/
  core/        Pure logic, no DOM. Unit-tested in Node.
    types.ts        Domain types (Vault, Entry, CategoryDef, discriminated FieldDef)
    schema.ts       The 11 sections and their fields
    crypto.ts       Envelope format, key derivation, seal/unseal, passphrase strength
    guard.ts        Detects SSNs, card numbers, long account numbers, inline passwords
    vault.ts        Immutable updates and validation of decrypted JSON
    store.ts        VaultStore state machine: loading → setup | locked → unlocked
    persistence.ts  IndexedDB (memory fallback), published vault fetch, file reading
    readiness.ts    "Before you're done" checklist
    guide-steps.ts  Universal first-week / first-month / when-ready steps
    router.ts       Bare-token hash routes (#banking, #guide)
  ui/          DOM helpers: safe h(), icons, base element, focus restoration
  styles/      Shared constructable stylesheets
  components/  ll-app, ll-gate, ll-shell, ll-overview, ll-category, ll-entry,
               ll-entry-editor, ll-guide, ll-settings, ll-confirm, ll-toast
public/
  index.html, styles/app.css (design tokens), fonts/, _headers, js/ (build output)
```

**Modes** once unlocked: `device` (saved in this browser), `copy` (opened from a file and not saved unless you choose "Keep on this device"), `demo` (sample data, never saved).

**Design tokens** live in `public/styles/app.css`. That file is the master template: change colors, type, and spacing there, not in components. Typefaces: Libre Caslon Display for headings, Public Sans for text, Atkinson Hyperlegible Mono for account numbers. All are OFL-licensed; licenses are in `public/fonts/`.

## Deploying

Any static host works. Netlify is configured in `netlify.toml` (build `npm run build`, publish `public/`) and `public/_headers` sets the security headers. On other hosts, copy the headers from `_headers` into the host's config.

`robots` is set to `noindex`.

## Roadmap

1. **Emergency access with a waiting period.** A small backend (for example Supabase with row-level security) holds the encrypted envelope. A named beneficiary requests access, you get a notice, and access unlocks after N days unless you decline. This is the main gap versus Bitwarden or 1Password emergency access, and it adds a server, accounts, and email.
2. **Split passphrase.** Shamir secret sharing so any two of three named people together can open the locker, with no one person holding the key.
3. **Document attachments.** Scans of policy pages, stored encrypted in the same envelope.
