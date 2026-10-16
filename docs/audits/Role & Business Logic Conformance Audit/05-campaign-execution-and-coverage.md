# MyLiberty Portal — BLRCA 05: Campaign Execution & Coverage

**Document Type:** Level 2 Audit Campaign Procedure  
**Status:** Restructured from the owner-ratified BLRCA procedure dated 2026-10-15; moved content is intended to preserve the approved meaning. Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified.  
**Scope:** Step-by-step campaign execution phases, slice-by-slice workflow, working ledger schema, and completion criteria  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Parent Framework:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./00-README.md)

---

## 1. The Six Phases of Campaign Execution

BLRCA operates through six sequential phases. Execution is conducted slice-by-slice, allowing each slice to pass through these phases independently.

```text
PHASE 0: Establish Reliable Baseline (Commit, Repo, Blueprint Version, Invariant Matrix)
   ↓
PHASE 1: Build Expected Role Contracts (Ratified Sources, Derivation, Owner Review)
   ↓
PHASE 2: Discover Implemented Surface (Routes, Components, Repositories, Rules, Integrations)
   ↓
PHASE 3: Compare Expected vs. Observed (Positive, Negative, Boundary, Alternate-Path Checks)
   ↓
PHASE 4: Reconcile Findings & Matrix Status (Canonical IDs, Bug Ledger, Invariant Updates)
   ↓
PHASE 5: Owner Decisions & Remediation Handoff (Bounded Executor Tickets, Regression Specs)
   ↓
PHASE 6: Independent Post-Fix Verification (Re-test Failures, Verify Defense-in-Depth, Close)
```

---

### Phase 0 — Establish a Reliable Baseline

1. **Environment State:** Record the exact Git repository checkout, branch name, commit SHA, date, and working-tree status.
2. **Governance Baseline:** Verify the current version, status, and ratification date of `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` (e.g., v3.4, Ratified 2026-10-13) and accepted decisions in `docs/decisions/`.
3. **Cross-Cutting Invariant Matrix Rule:** Existing `COMPLIANT` statuses in [`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md) are **NOT reset** at the start of a campaign. An invariant status is flagged for re-verification only when concrete contrary evidence emerges; its recorded status changes only after verified evidence meets the standards in BLRCA 06.
4. **Scope Declaration:** Explicitly declare the boundaries of the active slice and note any uninspected paths.

---

### Phase 1 — Build Expected Role Contracts

1. Enumerate the ratified roles, system identities, branch scopes, and division boundaries relevant to the slice.
2. Derive allowed, prohibited, conditional, and delegated behaviors using the method in [`BLRCA 01`](./01-governance-and-role-contracts.md).
3. Identify policy gaps or ambiguities; mark them **`[Owner Decision Required]`** and present them to the owner rather than fabricating test expectations.
4. Finalize the expected contract before beginning testing.

---

### Phase 2 — Discover Implemented Feature Surface

1. Inventory all user-facing screens, tabs, dialogs, quick actions, tables, and reports using [`BLRCA 02`](./02-feature-discovery-and-coverage.md).
2. Trace generic props (`isAdminView`, `canEdit`, `isSupervisor`) and permission helpers to their concrete operational effects.
3. Map non-human paths: background listeners (`onSnapshot`), Cloudflare Worker endpoints, Apps Script (`FormSync.gs`), and administrative scripts.
4. Document the feature inventory table for the slice.

---

### Phase 3 — Compare Expected vs. Observed Behavior

1. Populate the **Role-Function Conformance Ledger** with one row per meaningful role-capability-scope combination.
2. Execute the required test types according to the surface risk tier ([`BLRCA 04`](./04-risk-tiers-and-test-matrix.md)):
   - **Tier 1 Surfaces:** Positive, Negative, Boundary, Alternate-Path (all 4 mandatory).
   - **Tier 2 Surfaces:** Positive, Negative, Boundary (all 3 mandatory).
   - **Tier 3 Surfaces:** Positive, Negative (2 expected).
3. Record exact evidence: file paths, line numbers, test commands, and reproducible CLI outputs.
4. Record UI exposure separately from confirmed backend/data access.

---

### Phase 4 — Reconcile Findings & Matrix Status

1. Assign a canonical finding ID (e.g., `DOM11-GOV-02`) to each proven defect, deduplicating repeated symptoms sharing the same root cause.
2. Log findings into the master bug ledger ([`docs/audits/current/bug-ledger.md`](../current/bug-ledger.md)).
3. Reassess affected invariant statuses in [`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md) only after end-to-end evidence is complete. If evidence is partial, mark `PARTIALLY RECONCILED`.

---

### Phase 5 — Owner Decision & Remediation Handoff

1. Present policy ambiguities to the owner in plain language, separated from confirmed code bugs.
2. Formulate bounded, actionable remediation tickets or executor plans (e.g., [`docs/plans/active/2026-10-15-blrca-slice1-system-admin-remediation.md`](../../plans/active/2026-10-15-blrca-slice1-system-admin-remediation.md)).
3. **Neighboring-Role Regression Protection:** Explicitly specify regression test expectations for neighboring roles to ensure remediation does not accidentally strip legitimate capabilities.
4. Keep the audit agent strictly read-only; hand remediation to an authorized implementation agent.

---

### Phase 6 — Independent Post-Fix Verification

1. Once the implementation agent completes the remediation plan, an independent auditor re-executes Phase 6.
2. Re-run all original failing test cases and their positive, negative, boundary, and alternate-path counterparts.
3. Verify that the expected role retains legitimate functionality.
4. Verify that defense-in-depth is enforced in backend rules and repositories, not only in the UI.
5. Record verification evidence in [`docs/audits/current/regression-log.md`](../current/regression-log.md) and close ledger entries in [`docs/audits/current/bug-ledger.md`](../current/bug-ledger.md).

---

## 2. Working Role-Function Conformance Ledger Schema

During campaign execution, all evaluated capabilities are tracked in a structured conformance ledger.

### Strict One-Row-Per-Capability Rule

Auditors are strictly prohibited from using broad, aggregated rows such as *"Admin is secure"* or *"Front Office has access"*. Every meaningful capability, role, branch/division scope, and entry path must have its own testable row.

### Ledger Structure

| Field | Purpose | Example Entry |
|---|---|---|
| `Contract ID` | Stable identifier for the evaluated permission | `CTR-FIN-01` |
| `Role + Scope` | Organizational role, branch scope, division scope, technical identity | `admin` (System Admin, technical identity only) |
| `Expected Behavior & Source` | What governance dictates, with canonical citations | Zero financial data visibility; forbidden from reading payments or reports. (Blueprint §7, OD-2) |
| `Feature / Path` | UI component, repository function, or rule location | `ReportsDashboard.jsx:266` / `FinancialReportsTab.jsx` |
| `Observed Behavior` | What the running system actually does | Tab visible in UI; rule permits listing payments if helper bundled |
| `Evidence` | Exact file/line, Vitest command, test output | `ReportsDashboard.jsx:24-27` derives `isActualAdmin`; `firestore.rules:43` bundles `isAdmin()` |
| `Check Result` | Atomic outcome | `FAIL` |
| `Mismatch Type` | Conformance failure classification | `Excess Capability` / `Governance Conflict` |
| `Finding ID` | Link to canonical entry in bug ledger | `DOM11-GOV-02` |

---

## 3. Slice-by-Slice Execution Sequence & Dependencies

BLRCA is structured into five distinct operational slices:

```text
SLICE 1: System Admin Boundary (Technical-Only Infrastructure vs. Business Data)
   ↓ (Prerequisite: Admin stripped from business data before auditing business roles)
SLICE 2: Financial Surfaces Across Roles (Payments, Tuition, Discounts, Cash Balancing)
   ↓
SLICE 3: Personal Data Surfaces (Student Records, Parent Linkage, Staff Directory)
   ↓
SLICE 4: Exports, Downloads & Print Operations (CSV Generation, Receipt Printing)
   ↓
SLICE 5+: Individual Role Deep-Dives (Division Managers, Ops Lead, Instructors, Facilities)
```

### Slice 1 State & Next Action

- **Status:** **COMPLETED** (Audited 2026-10-15; remediated in `220c10a` and `131f1b2`; Phase 6 verified and all 4 findings closed on 2026-10-16).
- **Remediation State:** Remediation plan `docs/plans/active/2026-10-15-blrca-slice1-system-admin-remediation.md` is **COMPLETED**. Findings `DOM11-GOV-02`, `DOM01-GOV-03`, `DOM01-REP-01`, and `DOM01-PERF-01` are `CLOSED` in `bug-ledger.md`.
- **Next Operational Action:** Execute **Slice 2: Financial Surfaces Across Roles** (Payments, Tuition, Discounts, Cash Balancing, and `DOM04-GOV-03`).

---

## 4. Slice Completion Criteria

A campaign slice can be formally reported as **COMPLETE** only when all of the following conditions are met:

1. **Contract Derivation:** Every role relevant to the slice has an evidence-backed role contract derived from ratified sources, or an explicit open exception is logged as `[Owner Decision Required]`.
2. **Feature Inventory:** Every screen, dialog, action, and data query in the slice has been inventoried or explicitly logged as out of scope with written justification.
3. **Mandatory Testing Complete:**
   - 100% of Tier 1 role-function combinations have completed all 4 mandatory test types (positive, negative, boundary, alternate-path).
   - 100% of Tier 2 combinations have completed all 3 mandatory test types (positive, negative, boundary).
   - Tier 3 checks have been performed or formally justified as out of scope.
4. **Backend Tracing:** All data queries and mutations have been traced beyond the UI into repositories, Worker endpoints, and `firestore.rules`.
5. **Canonical Findings Logged:** Every verified mismatch is assigned a canonical ID, documented with evidence, and logged in `docs/audits/current/bug-ledger.md`.
6. **Owner Decisions Separated:** Policy questions are clearly segregated from implementation defects.
7. **Reproducibility:** All findings can be independently reproduced using the recorded commands or code references.
8. **Owner Summary Delivered:** The owner receives a plain-language briefing of what is broken, why it matters, what decisions are needed, and what should be remediated first.
