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
| 4 | Payments / Cash / Financial State | 2026-10-12 (`L2-DOM04`) | 4 findings remediated & verified (DOM04-SEC-01, DOM04-IDX-01, DOM04-COR-01, DOM04-GOV-01) | No |
| 5 | Students / Admissions / Profiles | 2026-10-12 (`L2-DOM05`) | 4 findings remediated & verified (DOM05-SEC-01, DOM05-COR-01, DOM05-GOV-01, DOM05-RES-01) | No |
| 6 | Classes / Rosters / Scheduling | 2026-10-12 (`L2-DOM06`) | 5 findings remediated & verified (DOM06-SEC-01..03, DOM06-COR-01, DOM06-GOV-01) | No |
| 7 | Corporate Events / Staff Shifts / Leave | 2026-10-12 (`L2-DOM07`) | 6 findings remediated & verified (DOM07-SEC-01..03, DOM07-COR-01..03) | No |
| 8 | Parent Portal | 2026-10-12 (`L2-DOM08`) | 6 findings remediated & verified (DOM08-IDX-01, DOM08-COR-01..03, DOM08-SEC-01, DOM08-UX-01) | No — light re-verify after next rules deploy |
| 9 | Approvals / Maker-Checker / Directives / Audit Logs | 2026-10-12 (`L2-DOM09`) | 6 findings remediated & verified (DOM09-SEC-01..05, DOM09-COR-01) | No |
| 10 | PWA / Network / Service Worker | 2026-10-12 (`L2-DOM10`) | 7 findings remediated & verified (DOM10-SW-01..02, DOM10-COR-01, DOM10-UX-01..03, DOM10-PERF-01) | No |
| 11 | Reports / Dashboards / Derived Data | 2026-10-12 (`L2-DOM11`) | 6 findings remediated & verified (DOM11-COR-01..03, DOM11-PERF-01, DOM11-GOV-01, DOM11-TECH-01) | No |
| 12 | UX / Navigation / Mobile | 2026-10-12 (`L2-DOM12`) | 5 findings remediated & verified (DOM12-A11Y-01..03, DOM12-UX-01..02) | No |
| 13 | Cloudflare Worker / Integrations | 2026-10-12 (`L2-DOM13`) | 6 findings remediated & verified (DOM13-SEC-01, DOM13-COR-01..02, DOM13-RES-01, DOM13-INT-01, DOM13-TECH-01) | No |
| 13b | External Integrations & Ops Tooling (`FormSync.gs`, `scripts/`) | 2026-10-12 (`L2-DOM13`) | Audited and closed within Domain 13 report | No |
| 14 | Final Cross-Feature Attack Audit | 2026-10-12 (`L2-LIFECYCLE-ATTACK-2026-10-12`) | 5 findings remediated & verified (DOM-LIFE-01..05) | No |

## Rules for This Register

- A row moves to **No** only when its deep audit is complete *and* its findings are closed or ledgered as accepted risk.
- Any rule change, role change, or new subsystem touching a **No** row re-opens the light-re-verify flag.
- "Partial" means the named slices were audited inside another domain's audit; the remainder is still owed its own pass.
