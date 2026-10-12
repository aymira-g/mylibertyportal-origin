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
- [ ] Firestore rules (evaluate expression budget headroom against the 1000-expression ceiling)
- [ ] Query scope and index parity (every compound query shape has an explicit index in `firestore.indexes.json`; verify no silent fallback to unbounded scans)
- [ ] Dev-tool build gating (dev-only surfaces such as `DevQuickSwitcher`, dev presets, and debug panels are tree-shaken and absent from production builds)
- [ ] Accessibility basics (form labels, keyboard operability, and status indicators that do not rely on color alone per AGENTS.md)
- [ ] Privileged service-account writes & ops scripts (pre-write validation, dedupe, key custody, audit trail, and rollback plan verified for external integrations and `scripts/`)
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
12. Verify index parity: every compound query shape in repositories must have an entry in `firestore.indexes.json`. Missing indexes don't always error loudly — they can silently degrade into unbounded scans or false zero figures (e.g. DOM04-IDX-01).
13. Track rules expression headroom: Firestore enforces a strict 1000-expression evaluation ceiling. Any rules change must verify evaluation headroom to avoid deployment rejection or emergency refactors.
14. Verify dev-tool build gating: ensure development-only components (`DevQuickSwitcher`, mock accounts, debug instrumentation) are hard-gated by `import.meta.env.DEV` and absent from production builds (DOM01-SEC-02).
15. Verify accessibility basics: form inputs have accessible labels, interactive elements support keyboard navigation, and status indicators convey meaning without relying solely on color (AGENTS.md).
16. Audit service-account code as privileged infrastructure: scripts holding service-account keys (`FormSync.gs`, `scripts/` backfills) write with admin rights and bypass all Firestore rules. Enforce pre-write validation, dedupe, audit attribution, and require pre-execution risk and rollback plans per AGENTS.md.
17. Document evidence for every finding.
18. Separate verified defects from speculative concerns.
19. Add regression tests for verified fixes.
20. Explicitly flag findings requiring physical device verification (e.g. kiosk tablet hardware) vs automated simulation.
21. Mark runtime verification separately from code review.
22. Never declare the whole Portal secure just because individual sections look correct.

## Quick-Start Audit Prompt for Coding Agents

When instructing a coding agent to audit a section, provide this prompt:

```text
Act as auditor per `docs/audits/Comprehensive Hidden-Bug Audit Strategy/`.
Target: [Domain Name / Workflow from 03-audit-domains.md]
Execute the 5-Pass Method:
1. Internal Logic & Resource Safety (business rules, errors, listener cleanup, query limits, index parity, rules budget, dev gating, accessibility)
2. Trust Boundaries (UI vs Server vs Rules; client-supplied values; service-account bypasses in FormSync.gs / ops scripts)
3. Failure / Edge / Attack Matrix (offline, duplicates, concurrency, fail-open, midnight, missing indexes, unvalidated external writes)
4. Cross-Feature Handoffs (upstream/downstream entity linkages)
5. Verification Level (Code-proven vs Test-proven vs Physical Device required)
Log all findings in the Master Bug Ledger format (`05-bug-tracking.md`). Do not mark items CLOSED without verified tests or explicit proof.
```
