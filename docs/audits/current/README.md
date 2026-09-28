# Current Audit Baseline

> **Authority Level:** Active Findings Baseline (`audits/current/`)  
> Documents here represent the active, reconciled verification baseline against the current codebase.

## Purpose

These documents capture the current state of findings, verified gaps, and architectural discrepancies in MyLiberty Portal as of the latest audit cycle.

## Documents

| Audit Document | Scope | Date |
|---|---|---|
| [`2026-09-27-reconciled-full-audit.md`](./2026-09-27-reconciled-full-audit.md) | **Primary baseline**: Reconciled findings across architecture, security, performance, and multi-branch data isolation. | 2026-09-27 |
| [`2026-09-27-claude-audit-broader-findings.md`](./2026-09-27-claude-audit-broader-findings.md) | Broader architectural and operational findings supporting the baseline. | 2026-09-27 |
| [`2026-09-27-claude-audit-continuation.md`](./2026-09-27-claude-audit-continuation.md) | Detailed verification walkthrough and continuation evidence. | 2026-09-27 |
| [`2026-09-28-corporate-events-kiosk-investigation-report.md`](./2026-09-28-corporate-events-kiosk-investigation-report.md) | Investigation into corporate event clock-in, kiosk matching, and data integrity. | 2026-09-28 |
| [`MyLiberty_Portal_Attendance_Kiosk_Deep_Audit_and_Trigger_Map.md`](./MyLiberty_Portal_Attendance_Kiosk_Deep_Audit_and_Trigger_Map.md) | Deep vertical audit, failure triggers, and edge-case map for Attendance & Kiosk. | 2026-09-28 |
| [`cross-feature-integration-audit-revised.md`](./cross-feature-integration-audit-revised.md) | **Cross-Feature Handoff Baseline**: Revised cross-module integration audit & coding agent handoff. | 2026-09-28 |
| [`cross-feature-integration-remediation-walkthrough.md`](./cross-feature-integration-remediation-walkthrough.md) | Remediation walkthrough and execution notes for cross-feature findings. | 2026-09-28 |

## Important Notice

Current audits describe the codebase as inspected. They do **not** override source code or Firestore rules. Historical and superseded audits can be found in [`../archive/`](../archive/README.md).
