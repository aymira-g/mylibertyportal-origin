# MyLiberty Portal — BLRCA 06: Findings, Evidence & Closure

**Document Type:** Level 2 Audit Campaign Procedure  
**Status:** Restructured from the owner-ratified BLRCA procedure dated 2026-10-15; moved content is intended to preserve the approved meaning. Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified.  
**Scope:** Check outcome definitions, finding categories, severity standards, register integration, and closure rules  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Parent Framework:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./00-README.md)

---

## 1. Atomic Check Outcomes

When recording test results in the Role-Function Conformance Ledger, each capability row must receive exactly one of five atomic check outcomes:

| Outcome | Definition | Evidence Standard Required |
|---|---|---|
| **`PASS`** | Expected capability and its enforcement boundaries were verified. | Reproducible positive and negative test results (automated tests, emulator run, or verified code inspection). |
| **`FAIL`** | Observed behavior conflicts with an established governance requirement. | Explicit evidence of unauthorized access, missing capability, wrong scope, or un-enforced boundary. |
| **`BLOCKED`** | Verification could not safely or reliably be completed. | Technical blocker documented (e.g., test runner failure, missing test persona, lack of isolated emulator). |
| **`NOT TESTED`** | No testing or code inspection has been conducted yet. | Default starting state for newly discovered items. |
| **`NOT APPLICABLE`** | The dimension or test type truly does not apply to this feature. | Brief technical justification recorded in the ledger row (silent skipping is prohibited). |

### Compatibility with the Blueprint Conformance Matrix

These atomic check outcomes operate at the granular feature/role level. They complement—and do not replace—the overall invariant status scale maintained in [`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md):

- `COMPLIANT`: Architecture, implementation, rules, and tests fully realize the invariant.
- `PARTIALLY RECONCILED`: Frontend or architecture is aligned, but backend rules, queries, or legacy code require remediation.
- `DIVERGENT`: Implementation directly conflicts with approved governance; remediation scheduled.
- `DECISION REQUIRED`: An open policy question intentionally recorded in the Blueprint.

*Rule for Invariant Status Updates:* Invariant statuses are reassessed only after end-to-end evidence across all relevant roles and surfaces in a slice is collected. Never mark an invariant `COMPLIANT` based solely on a passing UI test if backend rules remain unverified.

---

## 2. Finding Categories

Auditors must classify findings into the standard repository finding categories:

1. **Governance Conflict:** Implementation directly contradicts a ratified Blueprint requirement or accepted owner decision (e.g., System Admin having access to tuition revenue per OD-2).
2. **Governance Gap:** A business workflow exists in the code or UI, but canonical governance does not define authority, approval chains, or data scope (e.g., undefined role of "Front Office Lead").
3. **Security Vulnerability:** A technical vulnerability enabling unauthorized access, data leakage, authentication bypass, or privilege escalation (e.g., rules expression limits, unvalidated Worker endpoints).
4. **Bug:** Technical implementation error, calculation defect, unhandled runtime exception, or broken state transition (e.g., date calculations using UTC instead of WITA).
5. **Technical Debt:** Architectural drift, dead code, confusing aliases, or maintenance risks that do not immediately cause unauthorized access (e.g., unused constants).
6. **Improvement:** Usability, accessibility, or diagnostic hardening opportunities without an underlying violation.

---

## 3. Severity Rationale & Standards

Severity must be justified strictly by **evidenced business and operational impact**, never by visual prominence, lines of code changed, or personal preference:

| Severity | Definition & Impact Criteria | Remediation Priority |
|---|---|---|
| **`CRITICAL`** | Credible unauthorized access to highly sensitive financial data, mass PII exposure, unauthenticated administrative access, serious approval bypass, or immediate data loss risk. | Must fix immediately; blocks deployment or active operations. |
| **`HIGH`** | Substantial unauthorized capability, cross-branch data scope leakage, incorrect approval authority, or repeated role-boundary failure. | Must fix before completion of the refinement cycle. |
| **`MEDIUM`** | Material workflow misassignment, legitimate capability incorrectly withheld, confusing business behavior likely to cause operational mistakes, or unhandled fail-open UI states. | Schedule in current or immediate next remediation batch. |
| **`LOW`** | Role terminology mismatch, non-blocking navigation quirk, or cosmetic label error with minimal direct operational impact. | Defer to normal backlog maintenance. |
| **`INFO`** | Diagnostic observation, hardening suggestion, or architectural note without a confirmed violation. | Record for informational context. |

---

## 4. Evidence Quality Standards

To maintain audit independence and prevent misleading claims, all evidence recorded in BLRCA ledgers and reports must be categorized using standard epistemic qualifiers:

- **`[Established]`:** Grounded directly in ratified governance text (Blueprint or accepted decision).
- **`[Observed]`:** Directly witnessed in code, automated test output, or runtime session.
  - *Must explicitly distinguish:*
    - `Observed by source-code inspection`: Proves what is written in the repository; does not prove runtime behavior.
    - `Observed by automated test / emulator`: Proves runtime behavior under simulated conditions.
    - `Observed by browser smoke verification`: Proves end-to-end presentation and user interaction.
- **`[Inferred]`:** Deduced logically from conventions or code context, but lacking formal confirmation. (e.g., "denial-looks-like-zero" risk in `FinancialReportsTab.jsx` is an inferred risk until proven by runtime test).
- **`[Proposed]`:** Recommended technical solution or architectural pattern.
- **`[Owner Decision Required]`:** Explicitly unresolved governance ambiguity requiring owner ratification.

> **Absolute Rule:** An auditor must **never claim an unrun test passed**, and must **never present a static observation as a verified runtime result**.

---

## 5. Integration with Existing Audit Registers

BLRCA maintains seamless integration with existing project registers:

1. **Master Bug Ledger ([`docs/audits/current/bug-ledger.md`](../current/bug-ledger.md)):**
   - Every confirmed BLRCA finding receives a unique, canonical finding ID (e.g., `DOM11-GOV-02`, `DOM01-GOV-03`, `DOM01-REP-01`, `DOM01-PERF-01`).
   - Recorded fields: ID, Date, Section/Workflow, Severity, Status (`OPEN`, `FIXED`, `CLOSED`), Verification Evidence, and Source Pointer.
2. **Lightweight Regression Log ([`docs/audits/current/regression-log.md`](../current/regression-log.md)):**
   - Post-remediation verification runs are documented in the regression log with exact test pass counts and commit SHAs.
3. **Operational Audit Log ([`docs/audits/audit-log.md`](../audit-log.md)):**
   - Major campaign milestones, slice completions, and owner decisions are logged chronologically.
4. **Blueprint Conformance Matrix ([`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md)):**
   - Invariant rows (INV-01 through INV-12) are updated with verified evidence and adjusted statuses.

---

## 6. Consolidated Campaign Deliverables

To prevent confusing the owner with empty placeholders, consolidated campaign files are created **when the first consolidated report is ready to be written**:

- **Consolidated Audit Report:** `docs/audits/current/role-business-logic-conformance-audit.md`
- **Consolidated Working Ledger:** `docs/audits/current/role-function-conformance-ledger.md`

Until consolidated multi-slice reports are written, the framework points directly to verified Slice 1 evidence in `docs/audits/current/bug-ledger.md` and `docs/audits/current/regression-log.md`.

---

## 7. Remediation Handoff & Independent Post-Fix Verification

The lifecycle of every BLRCA finding follows strict separation of duties between auditor and executor:

```text
DISCOVERED (Auditor)
    ↓
VERIFIED & LOGGED (Auditor assigns Canonical ID in bug-ledger.md)
    ↓
REMEDIATION PLAN (Auditor or Executor prepares bounded plan under docs/plans/active/)
    ↓
IMPLEMENTATION (Authorized coding executor patches code, rules, tests)
    ↓
INDEPENDENT POST-FIX VERIFICATION (Independent auditor re-tests failures)
    ↓
CLOSED (Logged in regression-log.md; bug-ledger.md updated to CLOSED)
```

1. **Bounded Remediation Tickets:** Remediation plans must identify exact files, risks, free-tier cost impact, and verification commands (e.g., `docs/plans/active/2026-10-15-blrca-slice1-system-admin-remediation.md`).
2. **Neighboring-Role Regression Tests:** The ticket must specify tests confirming that authorized neighboring roles retain their legitimate capabilities.
3. **Independent Verification:** The auditor who verifies the fix must not be the agent who wrote the code, ensuring objectivity and integrity.
