# MyLiberty Portal — BLRCA 04: Risk Tiers & Test Matrix

**Document Type:** Level 2 Audit Campaign Procedure  
**Status:** Restructured from the owner-ratified BLRCA procedure dated 2026-10-15; moved content is intended to preserve the approved meaning. Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified.  
**Scope:** Risk-tier classification, test types, required evidence quality, and financial decision integration  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Parent Framework:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./00-README.md)

---

## 1. Risk-Tier Classification Model

To ensure thoroughness and proportionality within a zero-budget Firebase Spark environment, role-feature combinations are partitioned into three risk tiers. The risk tier determines the **mandatory test types** and **depth of evidence** required before an item or slice can be closed.

| Tier | Surface Category | Scope & Examples | Mandatory Test Types |
|---|---|---|---|
| **Tier 1** | **Critical / High-Risk** | Money, payments, tuition revenue, discounts, refunds, student/child/parent PII, staff access & role elevation, data exports/downloads, maker-checker approvals, audit logs, deletions, and payroll-affecting attendance records. | **All 4 Types Mandatory:**<br>Positive, Negative, Boundary, Alternate-Path |
| **Tier 2** | **Operational** | Operational writes, cohort scheduling, facility maintenance tasks, daily shift logging, and branch/division-scoped operational views. | **3 Types Mandatory:**<br>Positive, Negative, Boundary |
| **Tier 3** | **Informational / Presentation** | Navigation menus, labels, status badges, UI counters, and lower-impact read-only presentation views. | **2 Types Expected:**<br>Positive, Negative (UI-level evidence acceptable when justified) |

### Strict Safety Invariants Across Tiers

1. **Low Risk Does Not Excuse Data Leaks:** A presentation feature classified as Tier 3 is not excused if it discloses confidential financial, student, or staff information. Any unauthorized exposure of Tier 1 data through a Tier 3 interface automatically escalates the finding to Tier 1 severity.
2. **No Skipping Without Technical Justification:** Omitting a mandatory test type for Tier 1 or Tier 2 is prohibited unless a formal `NOT APPLICABLE` justification is recorded in the ledger.

---

## 2. The Four Mandatory Test Types

When evaluating a role-function combination, the auditor applies the following test types:

### 1. Positive Test (Authorized Access)

- **Definition:** Asserts that an authorized role, operating within its legitimate branch/division scope and valid workflow state, can successfully view or execute the function.
- **Required Evidence:** Successful UI rendering, clean repository execution, and HTTP 200 / Firestore success in emulator or unit test suite.
- **Why It Matters:** Prevents over-correction where security hardening accidentally removes legitimate capabilities from authorized staff.

### 2. Negative Test (Unauthorized Access Denial)

- **Definition:** Asserts that an unauthorized role (e.g., System Admin on financial reports, or Front Office on staff deactivation) is blocked from accessing the capability.
- **Required Evidence:** UI control hidden/disabled **AND** underlying request rejected with Firestore `permission-denied`, Worker HTTP 403, or repository exception.
- **Why It Matters:** Proves that access restrictions are enforced at the backend and do not rely merely on client-side visual hiding.

### 3. Boundary Test (Scope & Workflow Constraints)

- **Definition:** Asserts that a role possessing valid general access is strictly denied access outside its authorized physical branch (`branchId`), division (`division`), record boundary (e.g., non-linked child), or invalid workflow state (e.g., approving an already-sealed ticket).
- **Required Evidence:** Cross-branch query returns zero documents or throws `permission-denied`; cross-division mutation is rejected; re-approval of terminal ticket fails.
- **Why It Matters:** Catches lateral privilege escalation and cross-campus data leakage.

### 4. Alternate-Path Test (Bypass & Direct Requests)

- **Definition:** Asserts that unauthorized access cannot be gained through indirect or alternate channels, such as direct URL navigation, query parameter manipulation, calling exported repository functions directly, invoking Cloudflare Worker endpoints, or crafting direct Firestore SDK requests.
- **Required Evidence:** Emulator direct request rejection, Worker authorization test, or route guard redirection.
- **Why It Matters:** Validates that client UI guards are backed by true defense-in-depth.

---

## 3. Required Evidence Standards & Escalation

### Minimum Evidence Requirements

- **Tier 1 Surfaces:** Must be verified with **executable code evidence** (automated unit tests, Vitest emulator assertions, or reproducible CLI commands with exact outputs). Source inspection alone is insufficient to close a Tier 1 item as `PASS`.
- **Tier 2 Surfaces:** Verified via automated test suite or verified repository/rules code inspection with exact file and line citations.
- **Tier 3 Surfaces:** Verified via component render assertions, snapshot tests, or structured UI inspection.

### Escalation Protocol When Runtime Verification Is Blocked

If an emulator is unavailable, test runner fails, or a live environment cannot be safely constructed:
1. The check outcome must be marked **`BLOCKED`** or **`NOT TESTED`**.
2. Static code observations may be recorded, but must be explicitly labeled:  
   `"Observed by static code inspection — NOT emulator-verified"`.
3. An auditor must **never claim an unrun test passed**.

---

## 4. Integration with Ratified Financial Decisions

`[NEW — PENDING OWNER REVIEW: Runtime Derivation Rule]`

Permanent audit procedures must **not duplicate a static, competing per-role financial rulebook**. Because financial authorities evolve through formal owner decisions, the auditor executing **Slice 2 (Financial Surfaces)** must read the governing documents fresh at campaign runtime:

1. **Owner Decision 2026-10-05 (OD-1):** [`docs/decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md`](../../decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md) — Establishes dual-control executive review for discounts and refunds.
2. **Owner Decision 2026-10-13 (OD-2, OD-3, OD-4):** [`docs/decisions/2026-10-13-payment-correction-payment-data-access-and-cash-discrepancy.md`](../../decisions/2026-10-13-payment-correction-payment-data-access-and-cash-discrepancy.md) —
   - **OD-2:** Establishes Multi-Role Financial Data Access & Operations Model. System Admin is strictly forbidden from financial reads and writes. Front Office is desk payment maker. Division Managers have branch/division scoped read-only financial views. Executives hold province-wide read-only analytical views.
   - **OD-3:** Payment correction and void reversal workflows (two-step envelope approval).
   - **OD-4:** Tiered cash discrepancy approval thresholds (< Rp 20.000, Rp 20.000–Rp 49.999, ≥ Rp 50.000).
3. **Owner Decision 2026-10-07 (G-009):** [`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](../../decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md) — Ratified financial approval chains.
4. **Authoritative Blueprint v3.4 §7, §18:** Organizational financial authority principles.

The auditor derives the test matrix for Slice 2 directly from these current ratified documents, ensuring the audit tests live company policy rather than stale documentation copies.
