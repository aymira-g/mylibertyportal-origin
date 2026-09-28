# 02 — Security, Data Rules & Escalation

Covers **Section 10 (Special Rule for Security/Data Changes)**, **Section 19 (The "One Bad Thing" Rule)**, **Section 20 (The "Did the State Really Change?" Rule)**, and **Section 21 (When Light Regression Must Escalate)**.

---

# 10. Special Rule for Security & Data Changes

For changes touching:
- Firestore security rules;
- role normalization and authorization logic;
- branch logic and scoping;
- authentication and custom claims;
- identity verification and challenge signatures;
- payment and financial state;
- attendance and kiosk shift state;
- deletion and cascade logic;
- Cloudflare Worker security and secrets.

**Do not use a purely superficial regression.** Always test the three-point matrix:

```text
1. ALLOWED:
   Valid user / same branch / authorized role → operation succeeds.

2. DENIED:
   Unauthorized user / wrong role → operation fails cleanly.

3. WRONG CONTEXT:
   Branch A user targeting Branch B resource → operation is strictly DENIED.
```

---

# 19. The "One Bad Thing" Rule

A fast, high-yield shortcut for developers and coding agents:

> **After every change, intentionally try to make the feature do one thing it should not be allowed to do.**

### Examples:
- Submit from the wrong branch;
- Execute with an unauthorized role;
- Double-tap or spam submit;
- Leave a required payload field empty;
- Submit an expired, inactive, or malformed ID;
- Attempt an action outside the scheduled event window.

*This is not a full security audit, but it is the fastest way to expose broken trust boundaries and validation regressions.*

---

# 20. The "Did the State Really Change?" Rule

Never consider a regression check complete based only on UI visual feedback.

Always trace the 3-step verification chain:

```text
What did the UI report? (e.g. Success Toast)
        ↓
What did Firestore / Database actually store? (Document inspection)
        ↓
What does the next downstream consumer see? (Reports, balances, rosters)
```

### Critical Domains for This Rule:
- **Payments:** UI says paid → verify student account balance and receipt ledger.
- **Attendance:** UI says marked → verify date-stamped document, branch, and status.
- **Kiosk Shifts:** UI says clocked in → verify open shift document with employee ID.
- **Approvals:** UI says approved → verify reviewer ID, timestamp, and immutable state.
- **Enrollments:** UI says added → verify class subcollection and roster query.
- **Deletions:** UI says deleted → verify cascading cleanup and orphaned references.

---

# 21. When Light Regression Must Escalate

Stop the light regression immediately and **escalate to a Section Deep Audit** if you uncover any of the following:

- **Unauthorized access** or authentication bypass;
- **Cross-branch data leakage** or cross-branch mutation;
- **Duplicate financial transactions** or balance inaccuracies;
- **Duplicate shifts or attendance records** corrupting operational history;
- **Security fail-open fallbacks** (e.g. falling back to unauthenticated paths when an API fails);
- **Server trusting unverified client parameters** for critical business logic;
- **Inconsistent role or branch normalization** between client and Worker;
- **Destructive data corruption** or unhandled deletion cascades;
- **Uncontrolled read/write loops** risking Firestore free-tier quota exhaustion;
- **Manual human corrections** silently overwritten by automated scanning;
- **UI reporting success** while persistence actually failed;
- **A change that inadvertently broke multiple unrelated workflows**.

### Escalation Workflow:

```text
Light Regression
      ↓
Serious finding discovered
      ↓
VERIFY & ISOLATE EVIDENCE
      ↓
ESCALATE to Section Deep Audit (docs/audits/Comprehensive Hidden-Bug Audit Strategy/)
      ↓
REMEDIATION & REGRESSION TESTS
      ↓
RUNTIME VERIFICATION
```

*Do not treat serious architectural, security, or data integrity flaws as minor regression quirks.*
