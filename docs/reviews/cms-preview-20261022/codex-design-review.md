**Assessment: the proposed fix is reasonable, conditional on browser verification.** Your supplied-cookie result supports a cookie-delivery failure; it does not prove CHIPS resolves the browser flow.

### Required contract

- **Production cookies:** both the signed grant and Next’s `__prerender_bypass` must be host-only, `Path=/`, `HttpOnly; Secure; SameSite=None; Partitioned`. Issue them inside the CMS iframe’s top-level-site context. Partitioned state depends on that context. ([developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies/Partitioned_cookies?utm_source=openai))
- **Framework cookie:** retain the exact value issued by `draft.enable()` and add partitioning to the final outgoing cookie. Do not fabricate a bypass value or leave competing outgoing cookies. Next owns that cookie and regenerates its value per build. ([nextjs.org](https://nextjs.org/docs/app/api-reference/functions/draft-mode?utm_source=openai))
- **Grant migration:** use a distinct production cookie name, preferably `__Host-…`, and update its writer, authorization reader, frame-policy reader, and exit cleanup together. Never fall back to the legacy grant. Same-name partitioned and unpartitioned cookies can coexist ambiguously. ([privacysandbox.google.com](https://privacysandbox.google.com/cookies/chips-transition?hl=en&utm_source=openai))
- **Authorization:** preserve signature, 60-second expiry, tenant, normalized path, locale, collection checks, and trusted frame-request checks. Partitioning supplies no additional authorization.
- **Cleanup:** exit and published-mode handoff must explicitly expire the partitioned bypass cookie; exit must also expire the partitioned grant. Match name, host scope, path, and partition context. Separately expire legacy unpartitioned cookies where accessible. A top-level exit cannot be assumed to clear the CMS iframe’s partition. ([developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies/Partitioned_cookies?utm_source=openai))
- **Framing:** retain the existing conditional enforced CSP and ordinary public `X-Frame-Options: SAMEORIGIN`.

### Findings from the four files

- Grant storage currently lasts **300 seconds**, while signature validity lasts **60 seconds**. Authorization still expires at 60 seconds; preferably cap cookie storage at remaining signed lifetime.
- Exit currently uses an unpartitioned grant tombstone and plain `draft.disable()`; both need explicit partitioned cleanup.
- Published-mode handoff also calls `draft.disable()` and needs the same treatment.
- `draft.isEnabled` checks server state, not browser acceptance.

**Acceptance:** with third-party cookies blocked, verify actual iframe handoff → draft render → exit, expiry rejection, wrong tenant/path rejection, and legacy-cookie coexistence.

Read only the four specified source files; no edits, deployment, subagents, or runtime tests. Browser cookie serialization and acceptance remain unverified.