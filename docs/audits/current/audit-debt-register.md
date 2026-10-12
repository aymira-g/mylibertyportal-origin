# MyLiberty Portal — Audit Debt Register

> **Authority Level:** Live state tracker per the Level 2 strategy
> ([`01-audit-cadence.md`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/01-audit-cadence.md) §Audit Debt).
> **Scope:** One row per audit domain (`03-audit-domains.md`). Update immediately after every
> Level 2 deep audit completes, and whenever a section accrues major changes while its deep
> audit is overdue. Sections marked *never* were never deep-audited under this strategy —
> the register was created 2026-10-12, so absence of history is not absence of quality.
>
> **Created:** 2026-10-12

| # | Section | Last Deep Audit | Major Changes Since | Deep Audit Due? |
|---|---|---|---|---|
| 1 | Auth / Roles / Permissions | 2026-10-12 (`L2-DOM01`) | — | No |
| 2 | Branch Isolation / Firestore Rules | 2026-10-12 (`L2-DOM02`) | P-03 list-rule fix + timestamp-integrity rules emulator-verified, **live deploy pending** | No — light re-verify after next rules deploy |
| 3 | Attendance + Kiosk | 2026-10-12 (`L2-DOM03`) | — | No |
| 4 | Payments / Cash / Financial State | 2026-10-12 (`L2-DOM04`) | 4 findings identified (DOM04-SEC-01, DOM04-IDX-01, DOM04-COR-01, DOM04-GOV-01) — remediation plan awaiting operator approval | No — remediate, then re-verify per Level 1 playbook |
| 5 | Students / Admissions / Profiles | never | Parent-linkage surface (P-01..P-08 fixes), progress reports / promotion flow | **Yes** |
| 6 | Classes / Rosters / Scheduling | never | — | **Yes** |
| 7 | Corporate Events / Staff Shifts / Leave | partial 2026-10-12 (via DOM03 kiosk/shift chain) | Overnight-event fix (DOM03-COR-01) | Partial — leave + non-kiosk shift paths remain |
| 8 | Parent Portal | partial 2026-10-12 (P-01..P-08 remediation, external-audit driven) | P-01/P-02 accepted residual risks; rules deploy pending | Light follow-up after rules deploy |
| 9 | Approvals / Maker-Checker / Directives / Audit Logs | partial 2026-10-10 (OB-SEC-01..03) + 2026-10-10 timestamp integrity | Full envelope-family audit (NEW_STAFF_ACCOUNT, elevation, deactivation, retroactive attendance, placement override, withdrawal/freeze) still pending | Partial — schedule full envelope audit |
| 10 | PWA / Network / Service Worker | never | — | **Yes** |
| 11 | Reports / Dashboards / Derived Data | never | Dashboard-by-dashboard refinement series ongoing (front office, instructor leader, office boy, marketing, kindergarten, executive) | **Yes** — pair per-dashboard checks with each refinement phase |
| 12 | UX / Navigation / Mobile | never | DOM01-UX-01 (student login routing) found via auth audit | **Yes** |
| 13 | Cloudflare Worker / Integrations | partial 2026-10-12 (via DOM03 worker branch validation) | DOM03-SEC-01 fix | Partial — full surface (signature, replay, rate limits, multi-instance) remains |
| 13b | External Integrations & Ops Tooling (`FormSync.gs`, `scripts/`) | never | `FormSync.gs` live admissions sync, 5 backfill scripts in `scripts/` | **Yes (HIGH PRIORITY)** — service-account writes bypass all Firestore rules; live admissions pipeline integration |
| 14 | Final Cross-Feature Attack Audit | never | Run after domains 4–13 | Scheduled at milestone |

## Rules for This Register

- A row moves to **No** only when its deep audit is complete *and* its findings are closed or ledgered as accepted risk.
- Any rule change, role change, or new subsystem touching a **No** row re-opens the light-re-verify flag.
- "Partial" means the named slices were audited inside another domain's audit; the remainder is still owed its own pass.
