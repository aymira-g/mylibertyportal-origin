# Checklists and Agent Instructions

## Definition of Done for an Audit Section

A section is not complete until each of these is reviewed:

- [ ] Normal workflow
- [ ] Invalid input
- [ ] Duplicate behavior
- [ ] Concurrent behavior
- [ ] Retry behavior
- [ ] Reload behavior
- [ ] Offline and slow/lost-network behavior
- [ ] Role enforcement
- [ ] Branch isolation
- [ ] Client trust boundaries
- [ ] Server/Worker enforcement
- [ ] Firestore rules
- [ ] Query scope
- [ ] Legacy/stale/deleted data
- [ ] Timezone/date boundaries
- [ ] Resource & quota safety (bounded queries with limit(), listener cleanup on unmount)
- [ ] Physical device / hardware constraints identified (camera, scanner, wake-lock, PWA)
- [ ] Downstream reports
- [ ] Cross-feature handoffs
- [ ] Runtime tests identified
- [ ] Regression tests identified
- [ ] Findings entered in the master bug ledger

## Instructions for a Coding Agent

1. Audit one business section at a time.
2. Trace the full workflow from UI to persistence and downstream use.
3. Don't treat UI restrictions as security boundaries.
4. Inspect Firestore rules, Worker/API logic, and client logic together.
5. Explicitly test duplicates and concurrent operations.
6. Look for fail-open fallbacks.
7. Look for client-supplied security or business-critical values.
8. Compare role and branch logic across layers.
9. Check timezone and midnight behavior.
10. Check manual-vs-automated conflict behavior.
11. Audit Firestore query bounds and listener lifecycles. Quota exhaustion on the free tier breaks production as surely as a runtime crash.
12. Document evidence for every finding.
13. Separate verified defects from speculative concerns.
14. Add regression tests for verified fixes.
15. Explicitly flag findings requiring physical device verification (e.g. kiosk tablet hardware) vs automated simulation.
16. Mark runtime verification separately from code review.
17. Never declare the whole Portal secure just because individual sections look correct.

## Quick-Start Audit Prompt for Coding Agents

When instructing a coding agent to audit a section, provide this prompt:

```text
Act as auditor per `docs/audits/Comprehensive Hidden-Bug Audit Strategy/`.
Target: [Domain Name / Workflow from 03-audit-domains.md]
Execute the 5-Pass Method:
1. Internal Logic & Resource Safety (business rules, errors, listener cleanup, query limits)
2. Trust Boundaries (UI vs Server vs Rules; client-supplied values)
3. Failure / Edge / Attack Matrix (offline, duplicates, concurrency, fail-open, midnight)
4. Cross-Feature Handoffs (upstream/downstream entity linkages)
5. Verification Level (Code-proven vs Test-proven vs Physical Device required)
Log all findings in the Master Bug Ledger format (`05-bug-tracking.md`). Do not mark items CLOSED without verified tests or explicit proof.
```
