# Exec Plan

## Goal

Bring the implemented WingsGroup v3 corporate subpages into parity with the
approved subpage prototypes while retaining Payload-first, site-scoped,
localized public content.

## Scope

In scope:

- shared WingsGroup editorial chrome and rails;
- services, ecosystem, about, trust, news and contact presentation archetypes;
- governed hero-media selection and contract validation;
- Vietnamese and English copy/metadata in the existing corporate-route content
  contract; and
- focused automated and browser evidence.

Out of scope:

- production database writes, imports, deployment, release cutover or credentials;
- opening consultation/external ecosystem URLs; and
- publishing unverified proof claims.

## Risk Classification

Risk flags:

- Public contracts;
- Existing behavior;
- Cross-platform browser presentation;
- Multi-domain/site and locale behavior;
- Weak prior fidelity proof.

Hard gates:

- governed-media and site/locale scope must remain fail-closed;
- no production operation is authorized by this implementation work.

## Work Phases

1. Freeze base SHA, route/prototype matrix and owned workspace.
2. Implement the shared shell and responsive editorial primitives.
3. Implement route archetypes and content-contract/media bindings.
4. Add targeted regression coverage and execute static/build checks.
5. Independently review the committed diff and browser proof.
6. Sync durable/Plane tracking only after accepted evidence is available.

## Stop Conditions

Pause for human confirmation if:

- a required route needs an unapproved legal, proof or partner claim;
- matching the prototype would bypass governed media, locale or site scope;
- a data import, migration, deployment or release cutover becomes necessary;
- validation needs to be weakened or the architecture must change.
