# MYLIBERTY Baseline Audit — Advisor Assessment

**Date:** 2026-10-01  
**Baseline audit:** `2026-10-01-whole-portal-baseline-audit.md`  
**Baseline commit:** `2a7c7ac`  
**Purpose:** Preserve the advisor's assessment of the whole-portal baseline audit as a durable project document for discussion and executor handoff.

---

## 1. Executive Assessment

The whole-portal baseline audit is a strong and useful baseline.

It should be kept as the **authoritative baseline audit for commit `2a7c7ac`**.

It correctly distinguishes verified findings from unverified production assumptions and does not treat passing tests as proof of production readiness.

The overall conclusion is:

> **The architecture is structurally sound, but the portal should not receive an unconditional production-readiness claim until the demonstrated authorization, data-integrity, and privileged-Worker issues are remediated and re-tested.**

The audit reports that local lint, typecheck, production build, Vitest, Playwright, and the Cloudflare Worker build pass, while the real Firestore emulator suite still has failures. That distinction must be preserved.

---

## 2. Important Interpretation

The absence of a proven Critical-severity finding must **not** be interpreted as "the system is safe to ship."

The audit identifies High findings involving:

- Firestore authorization evaluation;
- parent access;
- parent access revocation;
- Worker state transitions;
- server-side event authorization.

Therefore:

> **No proven Critical finding ≠ production-ready.**

The correct interpretation is:

> No Critical issue was proven by the available evidence, but several High issues remain and must be addressed before an unconditional production-readiness claim.

---

## 3. What the Baseline Audit Does Well

### 3.1 It separates local verification from production verification

The audit explicitly leaves these unverified:

- deployed Firebase rules;
- deployed indexes;
- production Worker version;
- Worker secrets;
- allowed-origin configuration;
- App Check state;
- real collection sizes;
- production traffic and read/write rates;
- Firebase usage/billing;
- production kiosk behavior;
- concurrent Worker behavior.

Therefore this is a **repository/static/local verification baseline**, not a production penetration test or production load test.

Do not upgrade its conclusions beyond the evidence.

### 3.2 It identifies contract mismatches, not just isolated bugs

Several findings are symptoms of inconsistent contracts between:

```text
Client
  ↓
Repository/query layer
  ↓
Firestore rules
  ↓
Privileged Worker
  ↓
Stored data/state
```

The remediation should therefore focus on making these layers enforce the same business and security contracts.

---

# 4. Main Remediation Families

## A. Authorization Contract Consistency

Related findings:

- H-02 — Parent portal class query denied by branch-list rules
- H-03 — Front Office cannot unlink a parent-child relationship
- H-05 — Worker does not enforce corporate-event audience eligibility
- M-01 — Kiosk clock-in has a direct-write fallback
- M-02 — Clock-out does not enforce kiosk/device branch equality
- M-03 — Archived linked students remain readable through progress-report list authorization
- M-06 — Parent progress-report list access is broader than other parent data access

Core question:

> **Is the same access policy enforced consistently at the client, repository, Firestore-rule, and privileged Worker layers?**

Currently, the answer is not consistently yes.

The remediation should establish a clear authorization contract and make each layer conform to it.

---

## B. Data Integrity and Concurrency

Related findings:

- H-04 — Worker class switch is not atomic or safe against concurrent retries
- payment reconciliation concerns;
- active shift state;
- shift locking;
- partial failure recovery.

The critical invariant should be explicit:

```text
For one staff member:

0 open shifts
OR
1 open shift

NEVER > 1 open shift
```

This must remain true under:

- normal requests;
- duplicate requests;
- simultaneous requests;
- retries;
- timeouts;
- partial failures;
- uncertain network responses.

Do not fix H-04 by merely adding another ordinary write or UI check.

The invariant must drive the implementation.

---

# 5. Firestore Rules Architecture

## H-01 must be handled carefully

The emulator reports valid Front Office operations hitting the Firestore rules expression ceiling.

Affected examples include:

- payment recording batch;
- mark-payment-pending;
- Front Office student status update.

Correct direction:

> **Reduce authorization evaluation complexity while preserving authorization strength.**

Incorrect direction:

> "Relax the rules until the tests pass."

The executor should first determine why evaluation is expensive, then simplify repeated role/profile/branch evaluation without weakening security.

Acceptance must prove both:

```text
Valid same-branch operations pass.
Invalid/cross-branch operations still fail.
```

---

# 6. Parent Access Must Be Treated as One Lifecycle

The parent findings should be handled together rather than as isolated bugs.

Current issues include:

- parent class query does not satisfy the branch requirement;
- permission failure is converted into an empty result;
- Front Office cannot unlink through the current direct write;
- progress-report list authorization is broader than direct-read authorization;
- archived-child access may therefore become inconsistent.

Before implementation, explicitly define:

```text
Who can create a parent ↔ child link?
Who can remove it?
What branch relationship is required?
What happens if the child is archived?
What happens if the child is deleted?
What happens if the parent has multiple children?
What happens if unlink is retried?
Which reads must stop working after unlink?
```

Only then implement the fix.

---

# 7. Parent Query Failures Must Not Become Empty Data

The current conceptual failure path is:

```text
Authorization failure
        ↓
Repository catches error
        ↓
[]
        ↓
UI interprets "no classes"
```

This hides the difference between:

```text
There are no classes.
```

and:

```text
The user was not permitted to read the classes.
```

Permission failures should not silently masquerade as valid empty data.

---

# 8. Worker Must Be an Authorization Boundary

The Worker can use privileged service-account access, so it cannot rely on Firestore rules to protect its operations.

For Worker operations:

```text
Client checks
    ≠
Security boundary
```

The Worker must independently validate authoritative facts for:

- corporate-event eligibility;
- branch;
- division;
- role;
- device branch;
- shift ownership;
- shift state.

A modified client must not be able to bypass a policy simply because the normal UI filters choices.

---

# 9. Corporate Event Eligibility

The baseline audit identifies a client/Worker mismatch.

The client checks:

- active state;
- event date/time;
- branch;
- division;
- role.

The Worker currently checks a smaller subset before recording the shift.

Required direction:

> Recompute authoritative event eligibility inside the Worker using authoritative user/device/event data and server time.

Client filtering may remain for UX, but client filtering is not an authorization boundary.

---

# 10. Kiosk Security

## M-01 — Direct clock-in fallback

The scan processor can fall back to direct Firestore clock-in when Worker configuration or browser crypto prerequisites are missing.

This creates a downgrade path affecting:

- device proof;
- server-side timestamp guarantees;
- kiosk attribution.

Preferred direction:

> Remove the fallback, or explicitly define it as a separate authorized operating mode with clear audit attribution and tests.

Do not silently downgrade security because configuration is missing.

## M-02 — Clock-out branch validation

Clock-in validates employee/device branch alignment, while clock-out does not perform the equivalent validation.

Required invariant where kiosk validation applies:

```text
Employee branch
    =
Shift branch
    =
Authorized kiosk/device branch
```

Add the corresponding server-side validation and wrong-branch tests.

---

# 11. Class-Switch Concurrency

Current conceptual flow:

```text
Read open shift
    ↓
Close old shift
    ↓
Create new shift
    ↓
Update/replace active state
```

These are separate operations.

Two valid requests can observe the same old state and both attempt to create a new open state.

The executor should use conditional state transitions rather than ordinary sequential writes.

Required tests:

1. normal class switch;
2. duplicate request;
3. simultaneous valid requests;
4. stale update;
5. failure during new-shift creation;
6. failure during lock replacement;
7. retry after uncertain response.

Acceptance:

> No valid sequence of retries or concurrent requests may produce more than one open shift for the same staff member.

---

# 12. Financial Reconciliation

M-04 is secondary to the security/integrity issues but remains important.

A fallback capped at 200 documents can turn:

```text
Incomplete data
    ↓
Apparently complete data
    ↓
Potentially incorrect reconciliation
```

Preferred contract:

```text
Complete result
OR
Explicitly blocked/incomplete result
```

Do not silently reconcile partial financial data.

---

# 13. Dependency Advisory

The `@grpc/grpc-js` advisory should be investigated without automatically downgrading Firebase.

Distinguish:

```text
Package exists in dependency tree
```

from:

```text
Affected runtime path is shipped/executable
```

Required sequence:

1. identify dependency path;
2. determine browser/server reachability;
3. identify compatible upgrades;
4. test compatibility;
5. decide remediation.

Do not use `npm audit fix --force` as an automatic solution.

---

# 14. Technical Debt That Should Not Distract the Executor

The audit identifies:

- 219 formatting failures;
- Knip warnings;
- unused exports;
- documentation index drift;
- Firebase CLI dependency declaration issues;
- possible intentional barrel exports.

These should remain secondary.

Do not:

- mass-format the repository during behavioral remediation;
- broadly refactor unrelated architecture;
- turn the remediation into a general cleanup project.

The goal is targeted correction of demonstrated correctness, security, and integrity problems.

---

# 15. Recommended Execution Order

## Phase 0 — Freeze the baseline

Record:

```text
Baseline commit: 2a7c7ac
Baseline audit: 2026-10-01-whole-portal-baseline-audit.md
```

Do not modify the baseline audit.

Create a separate remediation document.

## Phase 1 — Define contracts before coding

Define:

### Authorization

- parent link creation;
- parent link removal;
- active-child rules;
- archived-child policy;
- branch requirements;
- role requirements;
- division requirements;
- Worker authorization responsibilities.

### Shift state

Define the single-open-shift invariant.

### Corporate events

Define authoritative eligibility.

### Kiosk

Define device/employee/shift branch requirements.

This prevents symptom-fixing without fixing the model.

## Phase 2 — Fix Firestore rule evaluation

Target: **H-01**

Requirements:

- preserve authorization;
- simplify repeated evaluations;
- run exact emulator tests;
- do not weaken role/branch protections.

## Phase 3 — Fix parent authorization lifecycle

Target:

- H-02;
- H-03;
- M-03;
- M-06.

Requirements:

- fix parent class query/rule contract;
- stop converting permission errors into empty data;
- implement authorized unlink;
- define archive behavior;
- align list/get authorization;
- test post-unlink access revocation.

## Phase 4 — Harden Worker authorization

Target:

- H-05;
- M-01;
- M-02.

Requirements:

- Worker validates event eligibility;
- Worker validates branch/division/role;
- kiosk fallback is removed or explicitly controlled;
- clock-out validates device/employee/shift branch relationships.

## Phase 5 — Fix Worker shift state transition

Target: **H-04**

Requirements:

- conditional state transition;
- concurrency protection;
- retry safety;
- failure recovery;
- active-shift invariant.

## Phase 6 — Fix financial fallback

Target: **M-04**

Use pagination or explicit blocked/error behavior.

## Phase 7 — Dependency and CI hardening

Target:

- M-05;
- emulator CI gap;
- Worker test gap.

Requirements:

- establish dependency reachability;
- resolve/document compatible dependency remediation;
- make emulator tests reproducible in CI;
- add Worker endpoint tests;
- add concurrency tests.

## Phase 8 — Re-audit

Do not declare completion merely because tests pass.

The second audit must answer:

```text
Did the original finding get fixed?
Did the fix weaken another authorization path?
Did the fix create a new race?
Are query and rules contracts aligned?
Does the Worker enforce its required policy independently?
Are invariants still true?
Did unrelated architecture change?
Do regression tests still pass?
```

---

# 16. Executor Guardrails

## Allowed

- targeted changes required by findings;
- new tests;
- small supporting refactors necessary to preserve contracts;
- rule simplification that preserves authorization;
- repository/query changes required by authorization contracts;
- Worker validation and state-transition changes;
- documentation of newly established contracts.

## Not allowed without explicit approval

- redesigning the entire authorization system;
- replacing ROLE × BRANCH × DIVISION;
- introducing division-specific role IDs;
- broad Firestore rule relaxation;
- changing unrelated dashboards;
- mass formatting;
- broad dependency upgrades;
- Firebase downgrade;
- removing compatibility aliases without migration evidence;
- deleting architecture merely because Knip reports it;
- changing unrelated business workflows;
- large-scale schema migration as part of a targeted fix.

---

# 17. Acceptance-Test Philosophy

Every High finding should prove both sides:

```text
AUTHORIZED CASE PASSES
+
UNAUTHORIZED CASE FAILS
```

For state transitions:

```text
NORMAL CASE PASSES
+
RETRY CASE PASSES SAFELY
+
CONCURRENT CASE PRESERVES INVARIANT
+
FAILURE CASE RECOVERS SAFELY
```

For queries:

```text
VALID DATA RETURNS
+
INVALID ACCESS IS DENIED
+
DENIAL IS NOT MASQUERADED AS EMPTY DATA
```

A security fix that merely makes a failing test pass can accidentally weaken the authorization model.

---

# 18. Architecture to Preserve

Preserve:

- domain-centered feature structure;
- lazy dashboard loading;
- deterministic class-attendance IDs;
- transaction-based scan idempotency;
- parent/student entity separation;
- documented direct-Firestore exceptions where still valid and bounded;
- existing ROLE × BRANCH × DIVISION architecture;
- explicit default-deny Firestore behavior.

The remediation should be **surgical**, not a rewrite.

---

# 19. Required Next Artifact

The next project document should be:

```text
2026-10-01-baseline-remediation-plan.md
```

Its purpose is different from this assessment.

This document answers:

> **What do we think about the baseline audit?**

The remediation plan should answer:

> **Exactly what does the executor need to do, in what order, under what constraints, and how do we prove each change is correct?**

That separation is intentional.

---

# 20. Final Advisor Position

The whole-portal baseline audit should be accepted as the current technical baseline for commit `2a7c7ac`.

The architecture does **not** need to be thrown away.

The project does **not** need a rewrite.

The immediate problem is not "too much code."

The immediate problem is that several important contracts are inconsistent across layers:

```text
UI
 ↓
Repository
 ↓
Firestore rules
 ↓
Worker
 ↓
Data state
```

Therefore:

> **Preserve the architecture. Repair the contracts. Prove the invariants. Re-audit.**

The biggest mistake to avoid is allowing the executor to treat this as a generic cleanup exercise.

The correct workflow is:

```text
Current baseline
      ↓
Define invariants/contracts
      ↓
Targeted remediation
      ↓
Security + concurrency tests
      ↓
Full regression
      ↓
Second audit
      ↓
Only then reassess production readiness
```

**Final recommendation:** Keep the baseline audit unchanged, create a separate remediation plan, and make that remediation plan the executor's actual implementation contract.
