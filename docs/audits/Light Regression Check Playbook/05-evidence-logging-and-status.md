# 05 — Evidence Logging, Status & History

Covers **Section 22 (Light Regression Evidence)**, **Section 23 (Suggested Test Status)**, and **Section 24 (Lightweight Regression Log)**.

---

# 22. Light Regression Evidence Standard

Every completed Light Regression Check must record sufficient evidence so another engineer, auditor, or AI agent can verify what was tested.

### Minimum Evidence Record Schema:

```text
Change:
Date:
Section:
Workflow:
Tester / Agent:
Normal Test:
Duplicate Test:
Failure Test:
Boundary Test:
Result Verification:
Findings:
Escalation Required: (No / Yes)
Status: (PASS / FAIL / BLOCKED / ESCALATE)
```

### Concrete Example:

```text
Change: Updated kiosk clock-out Worker endpoint & proof verification
Date: 2026-09-28
Section: Attendance / Kiosk
Workflow: Staff Clock-Out
Tester / Agent: Antigravity AI
Normal Test: Valid open shift closed successfully via Worker endpoint
Duplicate Test: Second clock-out attempt rejected because shift was already closed
Failure Test: Invalid shift ID rejected with HTTP 400
Boundary Test: Wrong employee identity rejected with HTTP 403
Result Verification: Firestore shift document contains clockOut timestamp, totalHours, and status="closed"
Findings: None
Escalation Required: No
Status: PASS
```

---

# 23. Suggested Test Statuses

Use these five unambiguous statuses:

### `PASS`
The targeted workflow, duplicate check, failure path, boundary, and stored result all behaved strictly as expected.

### `FAIL`
A functional regression was discovered. The code change broke an immediate or connected workflow and must be fixed.

### `BLOCKED`
The regression check could not be completed because a prerequisite or external dependency prevented testing (e.g. missing environment credentials, broken emulator).

### `NOT TESTED`
A specific check was intentionally omitted (must include written rationale).

### `ESCALATE`
The check revealed a severe underlying defect (security bypass, data corruption, cross-branch leakage, quota storm) that exceeds the scope of a light check and requires a **Section Deep Audit**.

---

# 24. Lightweight Regression Log

Maintain a running log of completed regression checks alongside the Master Bug Ledger.

### Regression Log vs Bug Ledger:

```text
Lightweight Regression Log
    ↓
Quick chronological history of checks run after code commits

Master Bug Ledger (docs/audits/Comprehensive Hidden-Bug Audit Strategy/05-bug-tracking.md)
    ↓
Detailed permanent record of confirmed bugs, root causes, regression tests, and lifecycle
```

### Recommended Log Format:

| Date | Change Summary | Section / Module | Result Status | Escalated? | Notes / Bug ID |
|---|---|---|---|---|---|
| 2026-09-28 | Kiosk clock-out proof fix | Kiosk | PASS | No | Verified with automated test |
| 2026-09-29 | Attendance repository refactor | Attendance | ESCALATE | Yes | Escalated: cross-branch query leak found |
| 2026-09-30 | Student profile modal UI | Students | PASS | No | Form validation verified |
