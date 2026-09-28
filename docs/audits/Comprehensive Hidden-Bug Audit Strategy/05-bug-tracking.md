# Bug Tracking

## Master Bug Ledger

Keep one ledger throughout the audit.

| Field | Description |
|---|---|
| ID | Unique identifier |
| Section / Workflow | Portal area and business workflow affected |
| Trigger | Action or condition exposing the bug |
| Actual / Expected | What happens vs. what should |
| Severity | Critical / High / Medium / Low |
| Evidence | Code, test, log, screenshot, runtime evidence |
| Root Cause / Fix | Why it happens; proposed change |
| Regression Test | Test proving it stays fixed |
| Verification Level | Unverified / Code-proven / Automated Test Passed / Physical Device Verified / Production Verified |
| Final Status | Open / Fixed / Closed |

Example:

```text
K-01
Section: Attendance / Kiosk
Workflow: Staff Clock-In
Trigger: VITE_AI_WORKER_URL missing
Actual: Kiosk silently falls back to direct Firestore clock-in
Expected: Kiosk refuses the operation and shows an actionable error
Severity: Critical
Root Cause: Fail-open fallback in kioskClockInWithProof()
Fix: Remove silent fallback from kiosk path
Regression Test: Missing Worker URL must fail closed
Verification Level: Automated Test Passed; Physical Device Verified on Kiosk Tablet
Final Status: Closed
```

## Audit Record

Every completed audit records:

```text
Audit ID:
Section:
Workflow:
Audit Level: Targeted Regression / Section Deep Audit / Full Portal Audit
Started / Completed:
Previous Audit:
Trigger:
Major Changes Since Previous Audit:
Findings:
Open High/Critical Items:
Regression Tests Added:
Runtime Verification:
Next Scheduled Deep Audit:
Next Trigger-Based Review:
```

This builds an audit history and shows when a section hasn't been deeply reviewed for too long.

## Bug Lifecycle

```text
DISCOVERED → VERIFIED → FIXED → REGRESSION TEST ADDED → RUNTIME VERIFIED → CLOSED
```

Never jump from DISCOVERED straight to CLOSED. *Code changed* ≠ *bug proven fixed*.

## Separate Discovery From Remediation

- **A. Discovery** — find and document defects
- **B. Verification** — confirm which findings are real
- **C. Prioritization** — group by severity and dependency
- **D. Remediation** — fix verified issues
- **E. Regression** — re-run affected audits and tests

This gives a more trustworthy baseline and shows whether the system actually improved.

## Severity

Severity describes impact, not fix difficulty.

| Severity | Examples |
|---|---|
| **Critical** | Unauthorized cross-branch access, auth bypass, money duplication, destructive data corruption, security fail-open path, duplicate shifts with serious operational impact, identity confusion altering authoritative records, infinite write loop or reconnect storm rapidly exhausting Firestore daily quotas |
| **High** | Workflow produces wrong records, concurrency causes inconsistent state, server trusts untrusted business-critical values, manual corrections silently overwritten, major role/branch isolation failure, operation succeeds incorrectly under retry/failure, unbounded queries over growing historical collections or leaking listeners risking quota exhaustion |
| **Medium** | Significant edge case, incorrect reporting, ambiguous workflow, recoverable integrity problem, stale UI state, inefficient queries with moderate read fan-out |
| **Low** | Minor UI issue, low-impact presentation race, cosmetic state problem, maintenance issue |
