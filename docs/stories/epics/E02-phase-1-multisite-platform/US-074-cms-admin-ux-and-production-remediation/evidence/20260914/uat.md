# UAT matrix — implementation candidate

The matrix records what is evidenced now; it does not convert a read-only local
check into production sign-off.

| Use case | Candidate evidence | Status / remaining gate |
| --- | --- | --- |
| WingsGo tour outbound | Itinerary row labels and initial collapsed state have unit proof; compact locale control is registered | Partial; real tour edit/save/reload UAT on staging remains |
| WingsPass landing | Page Wizard preserves site/preset context and create-another link is implemented without reset/write | Partial; two-record staging interaction remains |
| WingSide localization | Nine admin locale labels, compact controls, missing-title fallback and independent locale contract have unit proof | Partial; editor dirty-state and real translation workflow remain |
| Sales/CSKH | Site-scoped triage route has role, field allowlist and stale-version integration proof | Partial; product vocabulary approval and synthetic browser workflow remain |
| Mobile ngoài hiện trường | 13 closed-nav viewport measurements plus open-nav tablet/desktop checks pass; Site Review local preview handshake passes | Partial; Safari/iOS, staging roles and production smoke remain |

No UAT case published content, changed a real lead, changed a domain or changed
an account in this run.
