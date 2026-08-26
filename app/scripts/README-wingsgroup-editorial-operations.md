# WingsGroup editorial release operations

These tools are deliberately separate from `seed-subsites.ts`. The seed clears
site-scoped content and is only suitable for disposable bootstrap databases.
Neither operation below creates or deletes content.

## Trust-article correction

The updater targets exactly one active `wings-group` site and exactly one
already-published Post with the governed trust slug. It updates only localized
VI/EN `title`, `content`, and the three approved SEO text fields. Existing SEO
media and unrelated fields are preserved.

Dry-run is the default and performs no writes:

```bash
pnpm run update:wingsgroup:trust-article
```

Retain and review that JSON report before an authorized apply. Apply requires
the explicit token and is idempotent:

```bash
pnpm run update:wingsgroup:trust-article -- --apply \
  --confirm CONFIRM_UPDATE_WINGSGROUP_TRUST_ARTICLE_VI_EN
```

Do not run apply until the operator has an independently verified database
backup and the exact release has been approved.

## Anonymous media preflight

Run this read-only gate against a configured staging or production-preview
origin after media import and before cutover. It fetches the VI/EN archive and
trust article without credentials, discovers the actual `og:image` and marked
editorial image candidates, and requires HTTP 200 plus an `image/*` content
type for every URL.

```bash
pnpm run preflight:wingsgroup:editorial-media -- \
  --origin https://approved-preview.example
```

The origin is mandatory and is never embedded in the code. Redirects, 403s,
missing images, non-HTML routes, and non-image responses fail the gate.
