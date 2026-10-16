# Current Audit Baseline

> **Authority Level:** Active Findings Baseline (`audits/current/`)  
> Documents here represent the active, reconciled verification baseline against the current codebase.

## Purpose

These documents capture the current state of findings, verified gaps, and architectural discrepancies in MyLiberty Portal as of the latest audit cycle.

## Baseline Status

*Prior cycle audit reports (September – early October 2026) have been moved to [`../archive/`](../archive/README.md). New verification baselines and findings from the upcoming refinement will be recorded here.*

## Active Documents

| Document | Role |
|---|---|
| [`domain-01-auth-roles-permissions-audit.md`](domain-01-auth-roles-permissions-audit.md) | Level 2 deep audit — Domain 1 (2026-10-12, closed) |
| [`domain-02-branch-isolation-audit.md`](domain-02-branch-isolation-audit.md) | Level 2 deep audit — Domain 2 (2026-10-12, closed) |
| [`domain-03-attendance-kiosk-audit.md`](domain-03-attendance-kiosk-audit.md) | Level 2 deep audit — Domain 3 (2026-10-12, closed) |
| [`domain-04-payments-cash-audit.md`](domain-04-payments-cash-audit.md) | Level 2 deep audit — Domain 4 (2026-10-12, closed) |
| [`domain-05-students-admissions-audit.md`](domain-05-students-admissions-audit.md) | Level 2 deep audit — Domain 5 (2026-10-12, closed) |
| [`domain-06-classes-scheduling-audit.md`](domain-06-classes-scheduling-audit.md) | Level 2 deep audit — Domain 6 (2026-10-12, closed) |
| [`domain-07-corporate-events-shifts-leave-audit.md`](domain-07-corporate-events-shifts-leave-audit.md) | Level 2 deep audit — Domain 7 (2026-10-12, closed) |
| [`domain-08-parent-portal-audit.md`](domain-08-parent-portal-audit.md) | Level 2 deep audit — Domain 8 (2026-10-12, closed) |
| [`domain-09-approvals-maker-checker-audit.md`](domain-09-approvals-maker-checker-audit.md) | Level 2 deep audit — Domain 9 (2026-10-12, closed) |
| [`domain-10-pwa-network-sw-updates-audit.md`](domain-10-pwa-network-sw-updates-audit.md) | Level 2 deep audit — Domain 10 (2026-10-12, closed) |
| [`domain-11-reports-dashboards-audit.md`](domain-11-reports-dashboards-audit.md) | Level 2 deep audit — Domain 11 (2026-10-12, closed) |
| [`domain-12-ux-navigation-mobile-audit.md`](domain-12-ux-navigation-mobile-audit.md) | Level 2 deep audit — Domain 12 (2026-10-12, closed) |
| [`domain-13-worker-integrations-ops-audit.md`](domain-13-worker-integrations-ops-audit.md) | Level 2 deep audit — Domain 13 (2026-10-12, closed) |
| [`cross-feature-lifecycle-attack-audit.md`](cross-feature-lifecycle-attack-audit.md) | Level 2 deep audit — Lifecycles & Cross-Feature Attacks (2026-10-12, closed) |
| [`regression-log.md`](regression-log.md) | Level 1 targeted regression evidence (chronological) |
| [`bug-ledger.md`](bug-ledger.md) | **Master bug ledger** — canonical finding index |
| [`audit-debt-register.md`](audit-debt-register.md) | Audit debt register — per-domain last-audit state |

## Permanent Audit Suites & Baseline

For permanent verification procedures and baselines, use:
- Cross-Cutting Conformance: [`../blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md)
- Level 1 (Targeted Regression): [`../Light Regression Check Playbook/`](../Light%20Regression%20Check%20Playbook/00-README.md)
- Level 2 (Deep Functional & Workflow Conformance): [`../Comprehensive Hidden-Bug Audit Strategy/`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md)
  - BLRCA Campaign Framework: [`../Role & Business Logic Conformance Audit/`](../Role%20&%20Business%20Logic%20Conformance%20Audit/00-README.md)
- Level 3 (Architecture & Scalability): [`../Full System Architecture & Scalability Audit Procedure/`](../Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md)

## Important Notice

Audits describe the codebase as inspected. They do **not** override source code or Firestore rules. Historical and superseded audits can be found in [`../archive/`](../archive/README.md).

