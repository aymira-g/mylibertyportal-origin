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
| [`domain-04-payments-cash-audit.md`](domain-04-payments-cash-audit.md) | Level 2 deep audit — Domain 4 (2026-10-12, complete — 4 findings open, awaiting owner approval) |
| [`regression-log.md`](regression-log.md) | Level 1 targeted regression evidence (chronological) |
| [`bug-ledger.md`](bug-ledger.md) | **Master bug ledger** — canonical finding index |
| [`audit-debt-register.md`](audit-debt-register.md) | Audit debt register — per-domain last-audit state |

## Permanent Audit Suites & Baseline

For permanent verification procedures and baselines, use:
- Cross-Cutting Conformance: [`../blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md)
- Level 1 (Targeted Regression): [`../Light Regression Check Playbook/`](../Light%20Regression%20Check%20Playbook/00-README.md)
- Level 2 (Deep Functional & Workflow Conformance): [`../Comprehensive Hidden-Bug Audit Strategy/`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md)
- Level 3 (Architecture & Scalability): [`../Full System Architecture & Scalability Audit Procedure/`](../Full%20System%20Architecture%20&%20Scalability%20Audit%20Procedure/00-README.md)

## Important Notice

Audits describe the codebase as inspected. They do **not** override source code or Firestore rules. Historical and superseded audits can be found in [`../archive/`](../archive/README.md).

