# Exec Plan

## Goal

Replace static Home tour discovery facts with governed real-tour projections
while preserving the approved hi-fi design.

## Risk Classification

Lane: `high-risk` because the change crosses Payload relationships, public
queries, locale/site routing, cached rendering and three visible Home sections.

## Work Phases

1. Confirm US-049 taxonomy/data gate and approve selections.
2. Add Home curation fields and relationship validation.
3. Implement one server-side discovery query/projection service.
4. Wire Destination and Style sections to classified inventory.
5. Replace Sample Journeys static data with three selected TourProducts.
6. Remove or isolate obsolete static-tour bindings so they cannot mask CMS gaps.
7. Add unit, integration, component and browser coverage.
8. Re-run visual matrix, build and focused go-live review.
9. Close BUG-WS-001 and update Harness/Plane proof.

## Stop Conditions

- US-049 has unresolved taxonomy gaps.
- Fewer than three eligible featured tours are approved.
- A relationship resolves across sites or to an unpublished record.
- Real price/currency cannot be represented truthfully in the approved card.
- Implementation would change non-WingSide card behavior.

## Release Gate

This story may be accepted locally while production remains frozen. Public
deploy still requires SEO tenant, form delivery, PostgreSQL data and VPS release
gates.
