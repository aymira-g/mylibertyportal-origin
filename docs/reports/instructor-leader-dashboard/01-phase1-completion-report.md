# Instructor Leader Dashboard — Phase 1: Refinement Completion Report

> **Document Type:** Phase 1 Leadership Workspace Refinement & Completion Report
> **Target Subsystem:** Instructor Leader Dashboard (`src/features/dashboard/InstructorLeaderDashboard.jsx`) and
> `src/features/dashboard/instructor/` leader modules
> **Governing Baselines:**
> - Authoritative Blueprint v3.3 (§6.11 Instructor Leader, §5.2 Branch leadership model, §5.5 Branch Manager removal, §11.3 Branch scope does not imply branch-wide authority)
> - Ratified governance decisions G-003, G-005, G-006, G-007, G-011 (`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`)
> - Plan document: [`docs/plans/active/2026-10-08-instructor-leader-dashboard-phase1-refinement.md`](../../plans/active/2026-10-08-instructor-leader-dashboard-phase1-refinement.md)
> - Phase 0 predecessor: [`00-phase0-file-split.md`](./00-phase0-file-split.md)
> **Status:** Phase 1 Implementation Complete & Verified Locally — **not deployed**
> **Date:** 2026-10-08

---

## 1. Established (Governance Anchors)

1. **§6.11 Instructor Leader** — "The Instructor Leader leads academic delivery within the assigned branch scope", with established responsibilities: curriculum standardization; academic quality control; teacher schedule assignments; teacher evaluations. The role belongs to the Teaching and Learning Structure.
2. **§6.11 prohibition** — "The Instructor Leader is **not** a Branch Manager and does not automatically inherit general operational or financial authority."
3. **G-003 (ratified 2026-10-07)** — the Instructor Leader reports upward to Executive Leadership: **Vice Director** for day-to-day instructor scheduling, class coverage, shift adherence and substitute assignments; **Director** for pedagogical curriculum standards, placement testing criteria and academic excellence. "All branch Instructors report directly to the Instructor Leader."
4. **G-011 (ratified 2026-10-07)** — the four branch leadership roles (Course Division Manager, Kindergarten Division Manager, Operational Leader, Instructor Leader) are **functional peers**.
5. **G-007** — the Instructor Leader owns exactly two gated actions: `PLACEMENT_LEVEL_OVERRIDE` (blocking) and `SUBSTITUTE_INSTRUCTOR` (logged).
6. **§5.5 / rule 22–23** — the Branch Manager layer is removed; former Branch Manager permissions must not be silently transferred to the Instructor Leader or any other branch-scope leader.

### Owner-approved amendment to the Phase 1 plan

The plan (§22, §25, acceptance line 868) states **"`firestore.rules` is unchanged in this task."** The owner (Kifry) explicitly authorized an amendment to that constraint on 2026-10-08, scoping it to **read-only** widening for two academic collections. This report records the amendment rather than treating the original constraint as satisfied.

---

## 2. Observed (Post-Phase-0 Implementation State)

Verified against the repository at commit `9804f89`:

`InstructorLeaderDashboard.jsx` was still the Phase 0 **structural twin**: 170 lines, 9 tabs, shell title `"Instructor Portal"`, `ApprovalInbox userRole="instructor_leader"`, and no leadership content whatsoever. It reused the ordinary instructor views (`InstructorOverview`, `InstructorClasses`, `InstructorProgress`) unchanged, so an Instructor Leader and an ordinary Instructor saw effectively the same screen.

Routing (`src/App.jsx:581–586`) already dispatched `instructorleader` / `instructor_leader` to `InstructorLeaderDashboard` regardless of division. No routing change was required or made.

---

## 3. Gap (Where the software did not satisfy the role)

Each gap below was verified directly against `firestore.rules`, not inferred from documentation.

| # | G-003 / §6.11 responsibility | Backend reality before this task | Outcome |
|---|---|---|---|
| G1 | Branch-scope academic progress oversight | `progressReports` read allowed only where `resource.data.instructorId == request.auth.uid` (plus executive / manager / front office). An Instructor Leader could not read any other instructor's report. | **Closed** by owner-approved widening |
| G2 | Branch-scope attendance / teaching-activity oversight | `classAttendance` read for instructor-family staff required `isAssignedToClass(classId)` — only classes the leader personally taught. | **Closed** by owner-approved widening |
| G3 | Shift adherence visibility | `shifts` read is limited to executives, manager / front office, or the shift's own `userId`. | **Remains open — deliberately** (see §7) |
| G4 | Teacher evaluations | No evaluation subsystem exists anywhere in the repository: no rubric, no observation record, no collection. | **Remains open — documented, not faked** |
| G5 | Kindergarten pedagogical tools for the leader | Deferred in Phase 0 §5.4. The leader route is division-independent, so kindergarten classes and instructors are inside monitoring scope, but kindergarten-specific teaching tools (class photo share, developmental observation logs) are not adapted for leaders. | **Remains open — deferred** |

### G3 precision (why shifts stay closed)

Blueprint §6.11 states the Instructor Leader "does not automatically inherit general operational or financial authority", and §11.3 states "Instructor scope does not automatically grant finance or operational administration authority". Shift documents contain a `cashReconciliation` object (`expectedCash`, `expectedQris`, `countedCash`, `countedQris`, `discrepancy`, `threshold`, `exceedsThreshold`) plus `punctualityStatus` / `minutesEarlyOrLate`.

**Firestore security rules cannot restrict which fields a read returns.** A read grant returns the whole document. The plan's own §11 precondition — a "field-level exposure decision (no cash/financial fields)" — is therefore **not implementable on the `shifts` collection**. Widening it would have disclosed cash-reconciliation data to the Instructor Leader, contradicting §6.11 and §11.3. The owner selected the option to leave shifts closed and document the gap.

**What a safe future fix requires:** a separate non-financial projection (for example a `dutyPresence` document written on clock-in/out carrying only `userId`, `displayName`, `role`, `branchId`, `division`, `clockIn`, `clockOut`, `punctualityStatus`, `status`), plus a backfill for existing shifts, an explicit staleness/derivation contract, and emulator security tests proving the financial fields remain unreadable. That is a separate scoped task, not part of Phase 1.

---

## 4. Implemented

### 4.1 Backend authorization (owner-approved, read-only)

`firestore.rules`:

- **New helper `isInstructorLeader()`** (`firestore.rules:88–100`) accepting both the canonical `instructorleader` role and the legacy `instructor_leader` alias, and rejecting resigned/terminated accounts — mirroring the existing `isApproverForDoc` alias handling.
- **`progressReports`** (`firestore.rules:686`): added `isInstructorLeader() && isSameBranch(resource.data)` to `allow get` (line 696) and `isInstructorLeader() && isSameBranchStrict(resource.data)` to `allow list` (line 701). No division filter — the leader's academic scope spans both divisions within the branch. `create` remains instructor-of-record gated; `update` / `delete` remain executive / Division Manager / Front Office only.
- **`classAttendance`** (`firestore.rules:554`): added `isInstructorLeader() && isSameBranch(classDoc(resource.data.classId))` to the existing single `allow read` (lines 570–579). Matched against the **real class document** rather than the attendance document, because `classDoc()` always resolves an actual document — this keeps the branch comparison sound for `list`, where the lenient `isSameBranch()` fieldless fallback documented at `firestore.rules:115–121` would otherwise treat a synthetic list document as Kota Gorontalo and leak every branch. All write paths are untouched.

`firestore.indexes.json` (lines 44–51): added the composite index `progressReports(branchId ASC, examDate DESC)`, required by the bounded branch window query.

### 4.2 Test-mirror synchronization

`src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` — the hand-mirrored rule simulator carries a "keep in sync" contract with `firestore.rules`, so it was updated in the same change:

- new `isInstructorLeader(user)` helper;
- `canGetProgressReport`, `canListProgressReports`, and `canGetClassAttendance` now model the new clauses.

### 4.3 Dashboard

- **`src/features/dashboard/InstructorLeaderDashboard.jsx`** — rebuilt in place (170 → 308 lines). Title changed to **"Instructor Leader Portal"** with a "Branch Academic Leadership" sidebar badge. `ApprovalInbox` and the pending-count hook canonicalized from the frozen alias `"instructor_leader"` to `"instructorleader"`.
- **`src/features/dashboard/instructor/instructorLeaderRepository.js`** (new) — data-access layer, no React, per `docs/ARCHITECTURE.md` §4. Two bounded branch listeners plus a one-shot chunked attendance read.
- **`src/features/dashboard/instructor/useInstructorLeaderWorkspace.js`** (new) — composes the existing `useInstructorWorkspace` (leader's own teaching roster, the single branch active-classes listener, the directive inbox) and adds exactly two branch-scoped listeners. No listener is duplicated.
- **`src/features/dashboard/instructor/leaderUtils.js`** (new) — pure derivation helpers: division resolution with legacy `programId` fallback, schedule-day resolution, coverage exceptions, coverage summary, instructor workload, progress recency, attendance completion, and the exception-first attention list.
- **`src/features/dashboard/instructor/leader/`** (new) — `LeaderOverview`, `InstructorTeam`, `ClassesCoverage`, `AttendanceActivity`, `AcademicProgressLeader`, plus a small `leaderUi.jsx` presentation layer and a barrel.

### 4.4 Target layout achieved

```text
Instructor Leader Portal          Branch: <branch>      4 clickable KPIs
┌────────────────────────────────────────────────────────────┐
│ TODAY        Classes today · Teaching team ·               │
│              Students served · Pending approvals           │
├────────────────────────────────────────────────────────────┤
│ NEEDS ATTENTION   (exception-first, severity-ordered)       │
│   classes without an assigned instructor                    │
│   instructor double-bookings                                │
│   room double-bookings · classes over capacity              │
│   approvals awaiting your decision                          │
│   instructors with no progress report in 30 days            │
├────────────────────────────────────────────────────────────┤
│ TODAY'S CLASSES   time · class · division · instructor ·    │
│                   substitute · room · enrolment · coverage  │
├────────────────────────────────────────────────────────────┤
│ ACADEMIC HEALTH   coverage % · coverage gaps · substitutes  │
│                   conflicts · over-capacity · progress       │
└────────────────────────────────────────────────────────────┘
Tabs: Overview · Instructor Team · Classes & Coverage · Academic Progress ·
      Attendance (Branch Monitoring | My Classes) · My Classes · Directives ·
      Lesson Materials · Reports · Academic Approvals · AI Assistant
```

The design deliberately avoids the "ten KPI cards that communicate little" failure mode the plan warns about (§20); the first screen leads with exceptions.

### 4.5 Preserved behaviour (no regression)

- `InstructorDashboard.jsx`, `InstructorDashboard.test.js`, `KidsInstructorDashboard.jsx`, `src/App.jsx` routing, and `instructor/index.js` were **not modified**.
- Bundle evidence: `dist/assets/InstructorDashboard-CKiJwrFZ.js` is **2,355 bytes**, versus **2.35 kB** recorded for Phase 0 — byte-equivalent, confirming the ordinary instructor experience is untouched.
- The leader retains every previous capability: own class roster, own attendance marking (via the "My Classes" attendance scope and the kiosk), progress evaluation form and history, lesson materials, reports, directives, AI assistant, and the dual-control approval queue.
- URL actions (`?action=attendance`, `kiosk`, `class-photo`) continue to work unchanged.

---

## 5. Deferred

| Capability | Reason deferred |
|---|---|
| Shift-adherence visibility | Blocked by the field-level read restriction explained in §3/G3. Needs a non-financial projection collection, backfill, and its own security tests. |
| Teacher evaluations | No evaluation subsystem, rubric, or data model exists. Per plan §7, inventing evaluation scores or a new collection purely to complete the UI is prohibited. The dashboard states plainly that the workflow is not implemented. |
| Instructor Leader shift/leave approval | G-011 escalation routes these to the Vice Director. Not Instructor Leader authority. |
| Role changes, account administration, termination, privilege changes, payroll editing, leave approval, unrestricted staff editing | Outside §6.11 authority. The Instructor Team view is read-only by construction. |
| Kindergarten-specific leader tooling | Carried over from Phase 0 §5.4. |
| `head_instructor` raw alias in `App.jsx` | Pre-existing Phase 0 observation, retained unedited. `roles.js` normalizes the value, but `App.jsx` matches raw literals. |
| Class/attendance/coverage mutation by the leader | Class creation/deletion is Admin-owned and roster mutation is Front Office-owned. `ClassesCoverage` therefore provides a governed escalation path instead of direct mutation. |

---

## 6. Security Verification

### 6.1 Emulator proof of the real rules — `npm run test:rules`

A new emulator suite, **"Instructor Leader branch-scope academic monitoring (owner-approved 2026-10-08)"**, runs the actual rules engine against the actual `firestore.rules`. Result: **72/72 tests passed** (suite total, including the 10 new tests).

Cases proven by the emulator:

| Case | Result |
|---|---|
| Leader reads same-branch progress reports from **both** divisions, including other instructors' reports | ✅ allowed |
| Legacy `instructor_leader` alias resolves identically | ✅ allowed |
| Leader lists branch progress reports **with** a `branchId` constraint | ✅ allowed, returns only same-branch docs |
| Leader lists progress reports **without** a branch constraint | ❌ denied (no fieldless fallback) |
| Leader reads another branch's progress report | ❌ denied |
| Leader reads branch attendance for a class they do **not** teach | ✅ allowed |
| Leader lists attendance for a same-branch class | ✅ allowed |
| Leader reads/lists another branch's attendance | ❌ denied |
| Leader updates or deletes another instructor's progress report | ❌ denied |
| Leader forges a progress report for another instructor | ❌ denied |
| Leader creates attendance for a class they do not teach | ❌ denied |
| Leader updates another class's attendance | ❌ denied |
| Leader reads own shift record | ✅ allowed |
| Leader reads/lists branch shift records (cash fields) | ❌ denied |
| Resigned Instructor Leader | ❌ denied on both collections |
| Plain Instructor reading a peer's progress report or unassigned attendance | ❌ denied (unchanged) |

### 6.2 Separation of duties

- Self-approval remains impossible at the rule level: `allow update` on `approvals` requires `request.auth.uid != resource.data.requestedByUid` (`firestore.rules:662`). This was existing behaviour; it is unchanged and re-covered by the emulator suite.
- `isApproverForDoc` accepts both `instructorleader` and `instructor_leader` spellings on both the document and the reader side, and enforces `approverBranchId == userBranch()`.
- The approval query stays constrained to `status == pending` + `approverRole in [...]` + `approverBranchId == branch`; the existing composite index `approvals(status, approverRole, approverBranchId)` already covers it — no new index needed.
- Canonicalization was safe because `approvalsRepository.listenToPendingApprovals` normalizes through `roles.js` and queries both spellings (`approverRole in ['instructorleader', 'instructor_leader', 'instructorleader']`).

### 6.3 Financial isolation

Emulator-proven: the Instructor Leader cannot read or list branch shift records, and holds no payment write path (no `payments` clause includes the role). `DISCOUNT_OR_REFUND` is genuinely closed at the rules layer, because the `approvals` create rule requires any ticket with that `actionId` to carry `approverRole in ['director','vice_director']`, and only a Director or Vice Director satisfies `isApproverForDoc`.

**Correction (2026-10-08, after Phase 1 was reported).** An earlier version of this section claimed emulator confirmation that the Instructor Leader "cannot approve cash discrepancies because the gate does not list the role in `eligibleApproverRoles`". That claim is **withdrawn**: no assertion in this task tested gate-level approval authority. It was read from the client-side registry in `approvalGates.js` rather than proven against `firestore.rules` — and a follow-up emulator probe proved the opposite. See §6.5.

### 6.4 Direct API bypass — partially withdrawn

The rule-level claims in §6.1 and §6.2 are genuine emulator assertions against the real rules engine, and the new read surfaces depend on no UI hiding. **However, the earlier statement that "every claim above is an emulator assertion" was not true of the approval-gate claims**, which were never tested at the rules layer. The read-path and self-approval claims stand; the gate-authority claim did not. See §6.5.

### 6.5 Confirmed pre-existing gap: `actionId → approverRole` is not bound by the rules

A follow-up emulator probe (temporary file, removed after use) seeded approval documents and attempted decisions against the real rules engine:

| Probe | Result |
|---|---|
| Instructor Leader decides a `CASH_DISCREPANCY` ticket whose `approverRole` is `instructorleader` | **ALLOWED** |
| Instructor Leader decides a `RETROACTIVE_STUDENT_ATTENDANCE` ticket whose `approverRole` is `instructor_leader` | **ALLOWED** |
| Division Manager decides a `CLASS_CANCELLATION_OR_RESCHEDULE` ticket whose `approverRole` is `manager` | **ALLOWED** |
| Self-approval (control) | correctly DENIED |

**Root cause.** `isApproverForDoc` validates only the document's own `approverRole` field plus branch matching. Nothing in `firestore.rules` links `actionId` to the permitted `approverRole`, so the ratified gate registry in `approvalGates.js` is enforced **client-side only** — which `AGENTS.md` states plainly is not the security boundary.

**Scope.** General, not Instructor-Leader-specific: it affects every gate except the two whose `approverRole` is constrained at create time (`STAFF_ROLE_ELEVATION`, `DISCOUNT_OR_REFUND`). It is **pre-existing** and not introduced by this task — neither the `approvals` create rule nor `isApproverForDoc` was modified.

**Impact on this task's own acceptance criteria.** The plan's §19 "Approval isolation → cannot approve another role's approval" is **NOT satisfied at the backend layer**, and was not covered by this task's tests. UI-level approval isolation holds; rule-level isolation does not.

**Downstream consumability — what the bypass can actually unlock.** Not every gate is consumed by the backend, so the practical impact varies sharply:

| Gate | Consumed by `firestore.rules`? | Approver role validated at the consumption point? | Net exposure |
|---|---|---|---|
| `STAFF_SHIFT_SELF_CORRECTION` | **Yes** — `isApprovedShiftCorrection()` (`firestore.rules:215`) gates the `shifts` update path | **No** — it checks `actionId`, `status`, not-yet-applied and `payload.shiftId`, but **never `approverRole`** | **Real backend bypass.** A self-correction that policy routes to the Operational Leader (per `getSelfCorrectionApprover`) can instead be addressed to and approved by the Instructor Leader, and the rules will apply it to the shift record. `shiftMatchesCorrectionPayload` limits *what* can be applied, not *who* authorised it. |
| `STAFF_ROLE_ELEVATION` | Yes — `isApprovedRoleElevation()` (`firestore.rules:225`) | **Yes** — line 236–237 requires `approval.approverRole in ['director','vice_director']`, and the `approvals` create rule enforces the same | **Protected.** |
| `DISCOUNT_OR_REFUND` | No | Create rule requires `approverRole in ['director','vice_director']` | **Protected at the boundary.** |
| All remaining gates | **No** — `isActionOperational()` is exported from `approvalGates.js` but has **no production caller** | n/a | Approval-record integrity only: a "blocking" ticket can be decided by a role the registry never authorised, producing a misleading audit trail (and "blocking" mode is advisory, not enforced). |

So the confirmed consequence is narrower than "any gate can be bypassed", but it is not merely cosmetic: at least one gate (`STAFF_SHIFT_SELF_CORRECTION`) is consumed by the rules and accepts a wrong-role approver.

**Status:** **CLOSED (2026-10-08)** — owner-authorized and fixed in Phase 2 step 1. `firestore.rules` now binds `(actionId, approverRole)` on all three paths: the `approvals` create rule, the decision rule (`allow update`), and consumption (`isApprovedShiftCorrection`). An emulator suite plus `securityRulesMatrix` regressions and a new [`instructorLeaderApprovalProbe.test.js`](../../../src/features/shared/instructorLeaderApprovalProbe.test.js) prove the three probed bypasses are denied while legitimate routing — including legacy alias spellings — still works. The fix also repaired `NEW_STAFF_ACCOUNT` onboarding routing, which was already undecidable because it was addressed to `admin`. Plan: [`docs/plans/active/2026-10-08-instructor-leader-dashboard-phase2-approval-gate-binding.md`](../../plans/active/2026-10-08-instructor-leader-dashboard-phase2-approval-gate-binding.md). Evidence: the resolution section of the Level 1 log. **Not deployed.**

---

## 7. Authorization / Rule Changes

`firestore.rules` **was modified** — a deliberate, owner-authorized deviation from the Phase 1 plan's non-goal.

- **Additive only.** One new helper plus three new `||` clauses. No existing clause was weakened, removed, or reordered in effect. No `allow create`, `allow update`, or `allow delete` was touched anywhere.
- **Read-only.** No new mutation authority of any kind.
- **Not deployed.** The rules and indexes are prepared and locally proven but not pushed to production. Until deployment the new leader tabs will report a permission error, which the dashboard surfaces honestly rather than showing an empty list.

---

## 8. Performance / Cost

- **New listeners: 2, both branch-bounded.** `users` (`role in [instructor family]` + `branchId ==`) and `progressReports` (`branchId ==` + `orderBy examDate desc` + `limit 100`). Neither is collection-wide or unbounded.
- **No duplicated listeners.** The leader dashboard reuses the single branch active-classes listener already opened by `useInstructorWorkspace`.
- **Attendance is on-demand only.** It is a one-shot chunked read (30 class ids per query, one date) triggered by an explicit user action, never a realtime listener. This matters because each evaluated attendance document costs a rules-level `classDoc()` lookup — the same cost the existing manager / front-office clause already pays.
- **No polling, no paid services, no new SaaS.** Spark / zero-budget constraint preserved.
- **New index cost:** one composite index on `progressReports`. Indexes are free to store; the ongoing cost is the write amplification on `progressReports` writes, which are low-volume (per evaluation).
- **Bundle cost:** the leader chunk grew from 2.68 kB to 54.6 kB because the workspace is now real. The ordinary instructor dashboard chunk is unchanged at 2,355 bytes, and `instructor/index.js` was deliberately left untouched so leader-only modules never enter the ordinary instructor bundle.

### Known limitation

The `progressReports` branch window depends on the composite index. If rules are deployed without indexes, the Progress view shows an explicit "index is not deployed yet" message (mapped from `failed-precondition`) rather than a misleading empty state.

---

## 9. Files Changed & Created

### Created

| File | Purpose |
|---|---|
| [`src/features/dashboard/instructor/instructorLeaderRepository.js`](../../../src/features/dashboard/instructor/instructorLeaderRepository.js) | Branch-scoped data access (no React) |
| [`src/features/dashboard/instructor/instructorLeaderRepository.test.js`](../../../src/features/dashboard/instructor/instructorLeaderRepository.test.js) | Pins query shape, branch normalization, chunking, error routing |
| [`src/features/dashboard/instructor/useInstructorLeaderWorkspace.js`](../../../src/features/dashboard/instructor/useInstructorLeaderWorkspace.js) | Composes own-teaching + branch leadership data |
| [`src/features/dashboard/instructor/leaderUtils.js`](../../../src/features/dashboard/instructor/leaderUtils.js) | Pure derivation + formatting helpers |
| [`src/features/dashboard/instructor/leaderUtils.test.js`](../../../src/features/dashboard/instructor/leaderUtils.test.js) | 34 unit tests |
| [`src/features/dashboard/instructor/leader/LeaderOverview.jsx`](../../../src/features/dashboard/instructor/leader/LeaderOverview.jsx) | Exception-first landing view |
| [`src/features/dashboard/instructor/leader/InstructorTeam.jsx`](../../../src/features/dashboard/instructor/leader/InstructorTeam.jsx) | Branch teaching-team monitor (both divisions) |
| [`src/features/dashboard/instructor/leader/ClassesCoverage.jsx`](../../../src/features/dashboard/instructor/leader/ClassesCoverage.jsx) | Classes & coverage across both divisions |
| [`src/features/dashboard/instructor/leader/AttendanceActivity.jsx`](../../../src/features/dashboard/instructor/leader/AttendanceActivity.jsx) | On-demand branch attendance monitoring |
| [`src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx`](../../../src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx) | Branch progress monitoring + own evaluations |
| [`src/features/dashboard/instructor/leader/leaderUi.jsx`](../../../src/features/dashboard/instructor/leader/leaderUi.jsx) | Shared leader presentation primitives |
| [`src/features/dashboard/instructor/leader/index.js`](../../../src/features/dashboard/instructor/leader/index.js) | Barrel |
| [`docs/reports/instructor-leader-dashboard/01-phase1-completion-report.md`](./01-phase1-completion-report.md) | This report |
| [`docs/audits/current/regression-log.md`](../../audits/current/regression-log.md) | Level 1 Light Regression Check evidence record (Playbook §§ 22–24) |

### Modified

| File | Change |
|---|---|
| [`firestore.rules`](../../../firestore.rules) | `isInstructorLeader()` helper + 3 read-only clauses (owner-approved) |
| [`firestore.indexes.json`](../../../firestore.indexes.json) | `progressReports(branchId, examDate DESC)` index |
| [`src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`](../../../src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js) | Test-mirror sync for the new clauses |
| [`src/features/shared/securityRulesMatrix/divisionIsolation.test.js`](../../../src/features/shared/securityRulesMatrix/divisionIsolation.test.js) | New §3.2 leader read-scope suite (8 tests) |
| [`src/features/shared/firestoreRules.emulator.test.js`](../../../src/features/shared/firestoreRules.emulator.test.js) | New emulator suite (10 tests) + 4 test actors |
| [`src/features/dashboard/InstructorLeaderDashboard.jsx`](../../../src/features/dashboard/InstructorLeaderDashboard.jsx) | Rebuilt leadership workspace |
| [`src/features/dashboard/InstructorLeaderDashboard.test.js`](../../../src/features/dashboard/InstructorLeaderDashboard.test.js) | Rewritten for the leadership portal (4 tests) |
| [`docs/specs/authorization-contract.md`](../../specs/authorization-contract.md) | New §6.6 recording the read authority, the financial-isolation exclusion, and a divergence note |

### Modified in the follow-up documentation pass (2026-10-08, separate owner-authorized task)

| File | Change |
|---|---|
| [`AGENTS.md`](../../../AGENTS.md) | (a) Removed the reference to a non-existent shared `ResponsiveTable` primitive and stated plainly that no generic shared table exists; the real `MobileDashboardShell` was added to the preferred-primitives list. (b) Rule 12 no longer describes the Executive Dual-Control Model as "pending formal owner ratification". |
| [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) | §41 Owner Approval Record completed (approval recorded with the 2026-10-07 decision document as the cited basis — **no fabricated signature**); stale "proposed" markers at §0 and §39 aligned to the ratified G-004; stale Instructor Leader reporting-line text at §5.3 and §6.11 aligned to the ratified G-003; §18 reconciliation note marked satisfied by the ratified G-009. No new governance rule was invented. |
| [`docs/README.md`](../../README.md) | Decision index entry for `G-009-DECISION-01` now records Point 4 as superseded by G-009 (Blueprint v3.3, 2026-10-07) with the materiality tiers, replacing "pending owner reassignment". |
| [`docs/decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md`](../../decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md) | Front-matter Status split into Points 1–3 (ACTIVE) and Point 4 (`SUPERSEDED BY G-009 — Blueprint v3.3 (2026-10-07)`, per the G-010 tagging convention); the stale "OPEN GOVERNANCE QUESTION (G-009)" notice bullet and the `ManagerDashboard` note now record the resolved tiered authority. Points 1–3 are untouched. |

### Explicitly NOT modified during the Phase 1 dashboard change

`src/App.jsx` · `src/features/dashboard/InstructorDashboard.jsx` · `src/features/dashboard/instructor/index.js` · `src/features/dashboard/instructor/InstructorOverview.jsx` · `InstructorClasses.jsx` · `InstructorProgress.jsx` · `instructorUtils.js` · `useInstructorWorkspace.js` · `KidsInstructorDashboard.jsx` · `docs/ARCHITECTURE.md`

(`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` was also untouched by the Phase 1 change itself; it was modified only in the follow-up documentation pass above.)

---

## 10. Verification Evidence (exact commands and results)

| Command | Result |
|---|---|
| `npm run test:rules` | **PASSED** — 1 file, **72/72 tests**, emulator suite (includes the 10 new leader cases) |
| `npm test` | **PASSED** — **99 files passed / 1 skipped**, **1,225 tests passed**, 0 failures (the skipped file is the emulator suite, excluded by design outside `test:rules`) |
| `npm run lint` | **PASSED** — 0 errors, 0 warnings |
| `npm run typecheck` | **PASSED** — 0 errors |
| `npm run build` | **PASSED** — clean Vite build; `InstructorLeaderDashboard` 54.61 kB, `InstructorDashboard` 2,355 B (unchanged), PWA service worker generated |
| `npx vitest run …/leaderUtils.test.js` | **PASSED** — 34/34 |
| `npx vitest run …/instructorLeaderRepository.test.js` | **PASSED** — 5/5 |
| `npx vitest run …/InstructorLeaderDashboard.test.js` | **PASSED** — 4/4 |
| `npx vitest run …/divisionIsolation.test.js` | **PASSED** — 71/71 |
| `npx vitest run …/instructorRouting.test.js` | **PASSED** — 10/10, unchanged |
| `npm run test:e2e` | **FLAKY / ENVIRONMENT-LIMITED — see limitation below.** Run 1 (3 projects parallel): 12 passed / 9 failed. Run 2 (`--project=webkit --project=firefox` only): **14 passed / 0 failed**. Run 3 (`--workers=1`, all projects): 19 passed / 2 failed. The failing set changes between runs and never included a leader spec → shared-dev-server load flakiness, not a regression. |
| `npm run knip` | **Pre-existing failures only** — knip reports unused exports across the repo (e.g. `MobileDashboardShell`, `StatCard`, `finance/index.js`, `pwa/index.js`). After trimming my own barrel re-exports, **zero** leader/instructor entries remain. |
| Level 1 Light Regression Check | **PASS** — recorded in [`docs/audits/current/regression-log.md`](../../audits/current/regression-log.md) |

### Defects found and fixed during verification

1. `tsc` caught a real bug: `unscheduledToday` was passed the *array* of unscheduled classes where a count was expected. Fixed by passing `unscheduledClasses.length`.
2. ESLint flagged three `react-hooks/exhaustive-deps` warnings from derived values with unstable identity. Fixed by wrapping them in `useMemo`.
3. Three of my own initial `leaderUtils` test expectations were wrong (fixtures also tripped the below-quorum and shared-room rules). The tests were corrected, not the logic.
4. **`AGENTS.md` referenced a non-existent shared `ResponsiveTable` primitive** — fixed in the follow-up pass (reference removed; `MobileDashboardShell` added; the real feature-specific tables named).
5. **The blueprint's §41 approval record contradicted its own header**, and the Executive Dual-Control Model was still called "proposed" at §0/§39. Fixed in the follow-up pass after the owner confirmed v3.3 is ratified.

### Limitations (stated honestly)

- **Production deployment was not performed** by explicit owner instruction. `firestore.rules` and `firestore.indexes.json` are proven locally only. Production behaviour is therefore **unverified** until deployment.
- **Playwright E2E is flaky in this environment and does not cover the leader workspace.** Three runs produced three different outcomes (12/9, 14/0, 19/2 passed/failed), all confined to `tests/portal.spec.ts` (login view, password-reset modal, password visibility) and `tests/pwa.spec.ts` (manifest, icons, deep links). None of those specs renders the Instructor Leader dashboard. Re-running the two projects that failed in run 1 produced **14 passed / 0 failed** on the identical tests, which identifies the cause as load/timing against the single shared Vite dev server (`fullyParallel` × 3 projects) rather than a code defect. **The leader workspace interaction flows — attendance scope toggle, mobile layout, kiosk modal, and the live Firestore-backed views — remain NOT browser-verified.** Only static render tests and emulator rule tests cover them.
- **`docs/ARCHITECTURE.md` was not modified.** The new files live under the already-listed `dashboard/instructor` directory and add no new architectural boundary, collection, or routing, so no architecture statement changed. The security-rules widening is recorded in `docs/specs/authorization-contract.md` §6.6 (the behavioural spec) rather than in the architecture guide.
- **`firestore.indexes.json` is not validated by the emulator.** The emulator serves queries without enforcing composite indexes, so the new index entry is verified as well-formed JSON with the correct field shapes, but its sufficiency is only confirmed once deployed.

---

## 11. Governance Items: Reconciled and Outstanding

Per `AGENTS.md` rule 1 ("Flag Conflicts, Do Not Invent Reconciliations"), conflicts were reported rather than silently resolved. Three were subsequently fixed under explicit owner authorization on 2026-10-08; the rest remain outstanding.

### Reconciled (owner-authorized 2026-10-08, separate follow-up task)

1. **Instructor Leader reporting line — body text aligned to the ratified register.** §6.11 and §5.3 read as an open governance gap, while §26 recorded **G-003** as RESOLVED. Both stale passages now state the resolved line directly (operationally to the **Vice Director**; strategically to the **Director**; all branch Instructors report to the Instructor Leader) and cite G-003. §26 was the governing source; the body text was the stale part. No new rule was invented.
2. **Blueprint approval status — §41 completed.** The header declared owner approval while §41 was an unsigned "PENDING OWNER APPROVAL" template, and the Executive Dual-Control Model was still described as "proposed" at §0, §39 and its "not yet finalized" list even though §26 records **G-004** as RESOLVED. After the owner confirmed v3.3 is ratified, §41 now records the approval (Owner / Director (Kifry), 2026-10-07) with the 2026-10-07 decision document cited as the **recorded basis** — no signature was fabricated — and the stale "proposed" markers at §0, §39 and the matching line in `AGENTS.md` (rule 12) were aligned. `AGENTS.md` no longer contradicts the blueprint on this point.
3. **G-009 cash-reconciliation staleness — reconciled.** [`docs/README.md`](../../README.md) and [`docs/decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md`](../../decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md) still described the former Branch Manager cash-drawer reconciliation authority as "pending owner reassignment", even though §26 records **G-009** as RESOLVED with materiality tiers and the 2026-10-07 decision document's own §3 Supersession Notice explicitly names that file. Both now tag Point 4 `SUPERSEDED BY G-009 — Blueprint v3.3 (2026-10-07)` following the **G-010** tagging convention, and the blueprint's §18 reconciliation note — the passage that *required* this supersession — now records it as satisfied. Point 4's authority was **not** transferred to any role without the ratified decision; it followed the tiered resolution (Operational Leader / Vice Director / Director).

### Outstanding (flagged, not reconciled)

3. **"Shift adherence" is assigned to the Vice Director, not the Instructor Leader.** G-003 places "day-to-day instructor scheduling, class coverage, shift adherence, and substitute assignments" under Vice Director operational control, while §6.11 gives the Instructor Leader "teacher schedule assignments" and G-007 gives them the `SUBSTITUTE_INSTRUCTOR` gate. Reconcilable as task-ownership versus operational-control, but no canonical text resolves it explicitly — and it is precisely why widening shift read access was refused rather than assumed.
4. **`isDivisionAllowedForBranchStaff` diverges from the authorization contract's Layer 3 description.** The contract describes the gate as `!(isManager() || isFrontOffice())`; the implemented helper uses the narrower role list `['manager', 'branch_manager', 'frontoffice', 'opslead', 'ops_lead', 'frontofficelead', 'marketing']`, so `instructor` / `instructorleader` / `instructor_leader` are not division-gated on division-scoped collections. Recorded in `authorization-contract.md` §6.6 as a reconciliation item; the helper was **not** changed.
5. **No Instructor Leader role card or workflow card exists**, although blueprint §1305 requires branch-scope leadership roles to receive separate role cards and §1337 requires workflow cards to record unresolved owner decisions. Recorded as a governance artifact gap.
6. **The blueprint's §39 "does not claim to have finalized" list retains blanket wording that the ratified register partly supersedes.** Most bullets are deliberately blanket claims ("every role capability", "every field-level permission", "every workflow", "every dashboard menu") and are still genuinely unclaimed. Two are now doubtful because the ratified register addressed them specifically: *"every approval threshold"* (G-006/G-009 ratified the gated-action levels and cash tiers) and *"emergency/delegation procedure"* (G-008 ratified the limited-staff, absence, and Acting Director procedure). The clearly-resolved bullet naming owner approval of the Director/Vice Director split was already removed in the previous pass. **Flagged, not edited** — rewriting a self-limiting disclaimer list is a broader editorial judgement than the scope the owner authorized, so it is left for an explicit decision.

---

## 12. Final Verification Report

1. **Files changed** — 8 modified for the Phase 1 change, plus 4 in the follow-up documentation pass (`AGENTS.md`, the blueprint, `docs/README.md`, and the 2026-10-05 G-009 decision record) — see §9.
2. **Files created** — 14 (see §9).
3. **Governance requirements implemented** — §6.11 branch-scope academic delivery oversight across both divisions; G-003 direct reporting of all branch instructors; G-011 peer-leadership model preserved; G-007 approval gates retained and not expanded.
4. **Existing behaviour preserved** — ordinary and kindergarten instructor dashboards untouched and byte-identical in bundle; routing untouched; all nine original leader tabs retained plus leadership surfaces; dual-control queue contract preserved with the alias canonicalized.
5. **New Instructor Leader capabilities** — branch teaching-team monitoring across both divisions; classes & coverage view with conflict detection and escalation path; branch-wide progress-report monitoring; on-demand branch attendance completion monitoring; exception-first overview.
6. **Authorization / rule changes** — yes, read-only and additive, owner-approved, **not deployed**.
7. **Security tests performed** — 10 new emulator tests against the real rules engine plus 8 new rule-mirror tests; branch isolation, division coverage, no-new-write-authority, self-approval, and financial isolation all asserted.
8. **Performance / cost considerations** — 2 new bounded listeners, on-demand attendance, one new composite index, no polling, no paid services.
9. **Deferred capabilities and why** — shift visibility (field-level restriction impossible; financial leakage risk), teacher evaluations (no subsystem exists), kindergarten leader tooling, leave/HR/financial authority (not in role authority).
10. **Exact test results** — see §10. `npm run test:rules` 72/72; `npm test` 1,225 passed; lint 0 errors / 0 warnings; typecheck 0 errors; build clean; Playwright E2E flaky and environment-limited (three runs, three different failure sets, none touching a leader spec).

**Success condition assessment.** The Instructor Leader is now a real academic leadership workspace covering both divisions, ordinary Instructor behaviour is stable and demonstrably unregressed, and the backend authority boundary is both widened (by explicit owner decision, read-only, academic-only) and better documented with the remaining gaps stated precisely. It is **not** claimed to be fully compliant: shift adherence, teacher evaluations, and kindergarten leader tooling remain open, and nothing is deployed.

---

## 13. Deployment Requirements (for Kifry)

Nothing below has been run. When you are ready:

```bash
# 1. Firestore rules + indexes (required for the new tabs to work at all)
firebase deploy --only firestore:rules,firestore:indexes

# 2. Web app
npm run build
firebase deploy --only hosting
```

Then verify with an Instructor Leader test account (`instructorleader.test@myliberty.id` via the Dev Quick Switcher):

1. **Overview** loads with real classes, instructors and attention items.
2. **Instructor Team** lists instructors from both divisions.
3. **Classes & Coverage** shows both divisions and any conflicts.
4. **Academic Progress** lists branch reports (this is the piece that needs the index — if you see "index is not deployed yet", step 1's indexes did not land).
5. **Attendance → Branch Monitoring** loads completion for today, then try **My Classes**.
6. **Academic Approvals** shows the pending count and still refuses a request you submitted yourself.

If anything in step 4 fails with a permissions error rather than an index error, the rules did not deploy.
