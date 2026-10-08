# MyLiberty Portal — Instructor Leader Dashboard Refinement
## Executor Implementation Brief — Phase 1

You are the implementation agent. Work from the **current repository state**, not from assumptions or historical plans.

**Phase 0 (file split) is complete** (commit `096b53a`, report: `docs/reports/instructor-leader-dashboard/00-phase0-file-split.md`). The ordinary Instructor experience and the Instructor Leader experience now live in separate files with separate routing. This task refines the Instructor Leader experience into a proper **branch-scope academic leadership dashboard**, while preserving the existing Instructor experience and without silently expanding Instructor Leader authority.

---

# 1. Governing Baseline — READ FIRST

Before editing code, read these files in this order:

1. `README.md`
2. `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`
3. `docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`
4. `docs/ARCHITECTURE.md`
5. `docs/specs/authorization-contract.md`
6. `docs/plans/active/2026-10-08-instructor-leader-dashboard-phase0-file-split.md` (Phase 0 plan)
7. `docs/reports/instructor-leader-dashboard/00-phase0-file-split.md` (Phase 0 outcome)
8. `src/features/shared/roles.js`
9. `src/features/shared/approvalGates.js`
10. `firestore.rules`
11. `src/App.jsx`
12. `src/features/dashboard/InstructorLeaderDashboard.jsx` (current structural twin — your refinement target)
13. `src/features/dashboard/InstructorDashboard.jsx` (ordinary instructor — DO NOT MODIFY except genuinely shared pieces)
14. `src/features/dashboard/instructor/` (shared components + `useInstructorWorkspace.js`)
15. `src/features/dashboard/useInstructorRoster.js`
16. relevant Instructor/approval/security tests, including `instructorRouting.test.js`, `InstructorLeaderDashboard.test.js`.

### Important governance facts

The current blueprint is:

- **Version:** 3.3
- **Status:** RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER
- **Date:** 2026-10-07

Do not use older "G-003/G-011 unresolved" assumptions. Those decisions are now ratified.

### Instructor Leader governance

Per Blueprint §6.11 and ratified G-003/G-011:

**Instructor Leader is a branch-scope academic leadership role covering BOTH divisions (Courses and Kindergarten).**

Established responsibilities include:

- curriculum standardization;
- academic quality control;
- teacher schedule assignments;
- teacher evaluations;
- branch-scope academic delivery.

Reporting/accountability:

- **Vice Director — Operational Control**
  - day-to-day instructor scheduling;
  - class coverage;
  - shift adherence;
  - substitute assignments;
  - operational exception coordination.
- **Director — Strategic Control**
  - curriculum standards;
  - pedagogical standards;
  - placement-testing criteria;
  - academic excellence;
  - strategic academic matters / major policy escalation.
- **All branch Instructors report directly to the Instructor Leader** — instructors of both divisions (G-003, owner-confirmed 2026-10-08).

**Division coverage (owner-confirmed 2026-10-08, implemented in Phase 0):**

- The Instructor Leader route is **division-independent** (courses / kindergarten / all all land on `InstructorLeaderDashboard`) — mirroring the Operational Leader pattern.
- Consequently, this dashboard's data views (classes, instructors, coverage, progress) are **branch-scope across both divisions**. Kindergarten classes and kindergarten instructors are inside the leader's monitoring scope.
- Ordinary instructors remain division-bound (G-005): `kindergarten` → `KidsInstructorDashboard`; `courses` / `all` → `InstructorDashboard`. Do not change that.

The four branch leadership functions remain peers:

- Course Division Manager
- Kindergarten Division Manager
- Operational Leader
- Instructor Leader

Do **not** recreate a Branch Manager role or silently transfer Branch Manager authority to Instructor Leader.

---

# 2. Current-State Finding (post Phase 0)

Phase 0 delivered exactly this (verify against the repository; commit `096b53a`):

```text
src/features/dashboard/
├── InstructorDashboard.jsx        (ordinary instructor, 8 tabs, no leader code)
├── InstructorDashboard.test.js
├── InstructorLeaderDashboard.jsx  (structural twin: 9 tabs incl. Academic Approvals,
├── InstructorLeaderDashboard.test.js   title "Instructor Portal", frozen alias strings)
├── instructor/
│   ├── InstructorOverview.jsx / InstructorClasses.jsx / InstructorProgress.jsx
│   ├── instructorUtils.js
│   ├── useInstructorWorkspace.js  (shared roster + branch class listener + directives)
│   └── index.js
└── (instructorRouting.test.js pins the routing split)
```

Routing (`src/App.jsx`): `instructor` splits by division (kindergarten → `KidsInstructorDashboard`, else → `InstructorDashboard`); `instructorleader` / `instructor_leader` → `InstructorLeaderDashboard` regardless of division.

`InstructorLeaderDashboard.jsx` is currently a **structural twin** of the old leader view: same 9 tabs, same title, `ApprovalInbox userRole="instructor_leader"` (alias string intentionally frozen in Phase 0), one branch-wide active-classes listener via `useInstructorWorkspace`.

This is the correct scaffolding but insufficient as a leadership workspace. This task rebuilds the inside of `InstructorLeaderDashboard.jsx` (and adds leader components) **without touching the ordinary Instructor dashboards**.

Do not turn the existing Instructor dashboard into an overloaded mixed-role screen.

---

# 3. Implementation Objective

Transform the structural twin into a proper Instructor Leader experience.

Target mental model:

> **Instructor = delivers assigned teaching.**

> **Instructor Leader = leads and monitors academic delivery across the assigned branch (both divisions), while still being able to operate as an instructor where applicable.**

The dashboard should become an:

> **Academic Delivery Control Tower**

focused on:

```text
Classes
   ↓
Instructor Coverage
   ↓
Attendance
   ↓
Progress Reports
   ↓
Academic Exceptions
   ↓
Approvals / Follow-up
```

It must NOT become:

```text
Branch Manager Lite
```

---

# 4. Architecture

The split already exists. Do not create parallel files or re-split anything.

- Refine `src/features/dashboard/InstructorLeaderDashboard.jsx` in place.
- Put leader-specific components under `src/features/dashboard/instructor/` (e.g. `LeaderOverview.jsx`, `InstructorTeam.jsx`, `InstructorAcademicHealth.jsx`, `InstructorCoverage.jsx`) — flat or in a `leader/` subfolder per your judgment, consistent with the existing repo layout; avoid unnecessary component fragmentation.
- Reuse existing Instructor components (`InstructorOverview`, `InstructorClasses`, `InstructorProgress`) and `useInstructorWorkspace.js` where they already represent valid functionality.
- `InstructorDashboard.jsx`, `InstructorDashboard.test.js`, and `KidsInstructorDashboard.jsx` must not be modified in this task except if a genuinely shared piece requires a compatible extension (prefer additive props with defaults; state any such change in the report).
- Routing: no routing changes are expected. `instructorRouting.test.js` must continue to pass untouched.

Rebranding is now allowed and expected: the leader shell title should change from the frozen `"Instructor Portal"` to an appropriate leadership title (e.g. "Instructor Leader Portal"). Rebrand applies to the leader dashboard only.

Canonicalization: Phase 0 froze the alias string `"instructor_leader"` in the `ApprovalInbox` `userRole` prop and the pending-count hook argument. In this task you MAY canonicalize these to `instructorleader`, but only after verifying that `approvalGates.js` / `approvalsRepository.js` normalize both forms identically (they normalize via `roles.js`), and with tests proving the approval queue and pending-count behavior are unchanged for both approver-role spellings.

---

# 5. Tab 1 — Academic Overview (default landing)

It should answer:

1. What is happening today?
2. What requires my attention?
3. Are classes adequately covered?
4. Are instructors completing their required academic work?
5. Are there student/progress exceptions?
6. Are there approvals waiting for me?

Suggested sections:

### Today's Classes

Branch classes for the Instructor Leader's authorized scope — **both divisions**. Where data supports it, indicate division (Courses vs Kindergarten) so cross-division coverage is visible.

Useful fields:

- time
- class
- level / program
- division indicator
- instructor
- substitute instructor if applicable
- room
- enrollment/capacity
- attendance status
- coverage status

### Coverage Exceptions

Surface things such as:

- missing instructor;
- substitute assignment;
- class without expected coverage;
- schedule conflicts where the underlying data can reliably establish one.

Do not invent exceptions from incomplete data.

### Academic Work Queue

Examples:

- overdue/missing progress reports;
- classes with attendance issues;
- students requiring academic follow-up;
- pending placement-level overrides;
- pending substitute-instructor approvals.

### Academic Health

Use existing data where possible.

Potential metrics:

- active classes (per division and total);
- active instructors;
- students served;
- attendance completion;
- progress-report completion;
- classes with unresolved coverage issues.

Do not manufacture a numeric "academic quality score" unless a real governed calculation exists.

---

# 6. Tab 2 — Instructor Team

Create a branch-scoped instructor monitoring view covering instructors of **both divisions**.

Purpose:

> "How is my teaching team doing operationally?"

Show, where data supports it:

- instructor name;
- division;
- assigned classes;
- number of active classes;
- substitute assignments;
- attendance activity;
- progress-report completion;
- current teaching load;
- relevant exceptions.

This should be primarily a **read/monitor** surface.

Data access note (verified): `firestore.rules` allows staff to read same-branch `users` documents whose role is in `['student', 'instructor', 'instructorleader', 'instructor_leader', 'parent']` (around lines 305–309), and the division filter does not constrain instructor-family readers. Queries must be server-side constrained (`where('role', 'in', [...])` + `where('branchId', '==', branch)`) — never download the whole `users` collection and filter client-side. Review composite-index needs (`branchId` + `role`) in `firestore.indexes.json` before shipping.

Do not add:

- role changes;
- account administration;
- termination;
- privilege changes;
- payroll editing;
- leave approval;
- unrestricted staff editing.

Those are outside the Instructor Leader dashboard authority unless explicitly governed elsewhere.

---

# 7. Teacher Evaluation Boundary

The blueprint establishes **teacher evaluations** as an Instructor Leader responsibility.

However, the current repository does not contain a dedicated teacher-evaluation subsystem.

### Do NOT invent a new evaluation workflow in this task.

Do not create:

- arbitrary evaluation scores;
- fake evaluation records;
- new approval semantics;
- new Firestore collections solely to make the dashboard look complete.

Instead:

1. document the missing evaluation data source;
2. identify whether existing progress/academic records can safely support any evaluation-related indicators;
3. if not, show an appropriate "Evaluation workflow not yet implemented" state only if useful;
4. record the missing capability as a follow-up implementation item.

The dashboard should not pretend that teacher evaluations exist when they do not.

---

# 8. Tab 3 — Classes & Coverage

Create a leadership-oriented class view covering both divisions.

Show:

- active classes;
- division;
- instructor;
- substitute instructor;
- schedule;
- room;
- enrollment;
- capacity;
- batch type where available;
- attendance/coverage status.

Use existing canonical class data.

Do not allow Instructor Leader to modify class records directly unless the current authorization contract explicitly permits that action.

The existing Firestore rules restrict class creation/deletion to Admin and class roster mutations primarily to Front Office.

Do not bypass those backend rules merely to make the dashboard interactive.

If an action requires another role/workflow, provide a governed request/escalation path instead of direct mutation.

---

# 9. Tab 4 — Academic Progress

Reuse `InstructorProgress` concepts where appropriate, but change the scope.

The ordinary Instructor sees students attached to their assigned classes.

The Instructor Leader should be able to monitor academic progress across the authorized branch teaching scope (both divisions).

Useful views:

- students with recent progress reports;
- missing/overdue progress reports;
- recent assessment activity;
- class-level progress indicators;
- students requiring attention.

Do not expose unnecessary parent/private information.

Keep branch scope enforced by backend authorization, not merely client-side filtering.

---

# 10. Tab 5 — Attendance & Teaching Activity

Reuse the existing attendance capability where appropriate.

The Instructor Leader should be able to monitor academic attendance activity at branch scope.

Important distinction:

### Routine student attendance

Instructor Leader may have visibility and operational academic oversight.

### Retroactive attendance correction

Do not give direct mutation authority.

The current governance routes:

```text
RETROACTIVE_STUDENT_ATTENDANCE
→ Operational Leader / Front Office
→ Vice Director escalation
```

Therefore, do not add an Instructor Leader "edit attendance" shortcut.

If the dashboard encounters a correction need, expose the appropriate escalation/request path only if an existing governed workflow supports it.

---

# 11. Shift / Coverage Visibility — DOCUMENT THE GAP (no rule changes in this task)

G-003 gives the Instructor Leader operational responsibility for scheduling, class coverage, shift adherence, and substitute assignments.

The current Firestore rules do NOT support this for shift records (verified, around lines 668–676): shift `get`/`list` is allowed for Executives, for Manager/Front Office (branch + division scoped), and for a user's **own** shift only. An Instructor Leader cannot list branch shifts. Shift records also carry payroll/cash-reconciliation-adjacent fields, which makes widening access genuinely sensitive.

**This task does not change `firestore.rules`.** Instead:

1. build the dashboard without direct shift-record access (coverage monitoring via classes/substitutes — which the rules already permit — is sufficient for this phase);
2. document the shift-visibility gap precisely in the report: what G-003 requires, what the rules permit today, and what a minimal read-only authorization would need;
3. record "Instructor Leader shift adherence visibility" as a **separate future task** requiring its own scoped rule change, field-level exposure decision (no cash/financial fields), and emulator security tests.

The dashboard must not pretend shift data exists when the leader cannot read it.

---

# 12. Academic Approvals

Keep the existing approval functionality as a first-class leadership queue.

The current approval registry correctly identifies:

```text
PLACEMENT_LEVEL_OVERRIDE
SUBSTITUTE_INSTRUCTOR
```

as Instructor Leader-controlled gates, and `firestore.rules` `isApproverForDoc` already enforces approver-role + approver-branch matching (including both `instructorleader` and `instructor_leader` spellings).

Suggested tab label:

```text
Academic Approvals
```

Show:

- pending count;
- action type;
- requester;
- branch;
- requested time;
- reason;
- decision controls.

Do not expand the queue to unrelated approval domains.

Instructor Leader must NOT receive:

- tuition-plan approvals;
- refunds/discounts;
- cash discrepancies;
- class transfer approvals;
- retroactive attendance approvals;
- staff-role elevation;
- staff termination;
- executive approvals.

The approval query must remain constrained to:

```text
approverRole = instructorleader (normalized)
approverBranchId = current branch
```

with existing canonical alias compatibility.

---

# 13. Separation of Duties

Preserve maker-checker rules.

The Instructor Leader must not approve their own request.

For every approval mutation, verify the backend rule:

```text
request.auth.uid != requestedByUid
```

Do not rely only on hiding the Approve button.

Test direct Firestore access as well as UI behavior.

---

# 14. Instructor Directives

`useInstructorWorkspace.js` currently wires `useStaffDirectives("instructor")` for both dashboards.

Do not turn this into branch-wide leadership task creation.

- preserve directive behavior as the leader's own instructor-facing directive inbox;
- do not grant Instructor Leaders generic branch-wide task/directive creation;
- if a leadership follow-up mechanism is needed, use an existing governed mechanism or document it as a future capability.

Do not recreate Manager/Operational Leader command authority under a new UI label.

---

# 15. Data Scope

The Instructor Leader is branch-scope across **both divisions**.

Every new query must be examined for:

```text
branchId
role
authorization scope
listener bounds
```

Do not apply a division filter to leader-scope monitoring queries unless a specific view is deliberately division-scoped (e.g. a per-division breakdown); the leadership scope itself spans both divisions.

Do not rely on:

```js
array.filter(...)
```

as the security boundary.

Client-side filtering is a presentation optimization only.

Backend rules must enforce the actual boundary. (Verified: the `classes` read path permits staff to list same-branch classes via `isStaff() && isSameBranchStrict(...)`, and the division filter does not constrain instructor-family roles — around lines 402–417 and 146–156.)

Do not create broader province-wide listeners.

---

# 16. Performance / Zero-Budget Constraint

The project is Firebase Spark / zero-budget oriented.

Do not introduce paid services.

Do not introduce:

- paid analytics;
- external dashboards;
- new SaaS;
- unnecessary APIs;
- unbounded listeners;
- whole-collection student or user listeners;
- duplicate listeners;
- polling;
- expensive client-side aggregation when a bounded query can provide the data.

Reuse the existing optimized pattern in `useInstructorWorkspace.js` / `useInstructorRoster.js` where appropriate; extend rather than duplicate.

For new dashboard queries:

- bound large datasets;
- use branch constraints;
- prefer targeted queries;
- review composite-index needs before shipping;
- if a metric requires a large aggregation, measure its cost before implementing it.

---

# 17. Do Not Rewrite Existing Instructor Functionality

The following must continue working unchanged:

- ordinary Instructor dashboard (`InstructorDashboard.jsx`);
- kindergarten instructor dashboard (`KidsInstructorDashboard.jsx`);
- assigned class views;
- student roster;
- attendance;
- progress reports;
- lesson materials;
- kiosk;
- class photo sharing;
- directives;
- reports;
- AI Assistant.

Do not create a regression by making Instructor Leader-specific logic the default Instructor behavior.

Prefer shared components with explicit props where practical.

---

# 18. Backend Authorization Review

Before adding any new Instructor Leader capability, inspect:

```text
firestore.rules
src/features/shared/roles.js
src/features/shared/approvalGates.js
src/features/shared/approvalsRepository.js
src/features/shared/securityRulesMatrix/
```

For every new capability classify it:

```text
READ
CREATE
UPDATE
DELETE
APPROVAL
REQUEST / ESCALATION
```

Then verify the backend supports exactly that operation.

Verified starting points (re-verify before relying on them):

- classes read: same-branch listing permitted for instructor-family staff, both divisions (~lines 402–417);
- users read: same-branch, role-restricted to student/instructor/instructorleader/parent (~lines 305–309);
- approvals: `isApproverForDoc` enforces approver role + branch (~lines 163–175);
- shifts: NOT readable by Instructor Leader beyond own records (~lines 668–676) — gap documented only (section 11).

Never treat:

```text
button hidden
```

as authorization.

---

# 19. Security Tests Required

Add or update tests for the new role behavior.

At minimum verify:

### Branch isolation

Instructor Leader A:

- can read permitted academic records in Branch A;
- cannot read Branch B academic records.

### Division coverage (new)

Instructor Leader:

- sees both Courses and Kindergarten classes/instructors within their branch;
- ordinary instructor division routing is unchanged (kindergarten → Kids dashboard).

### Approval isolation

Instructor Leader A:

- sees Branch A Instructor Leader approvals;
- does not see Branch B Instructor Leader approvals;
- cannot approve another role's approval;
- cannot approve their own request;
- both `instructorleader` and `instructor_leader` approver spellings resolve identically (if canonicalization was applied per section 4).

### Financial isolation

Instructor Leader:

- cannot approve discounts/refunds;
- cannot approve cash discrepancies;
- cannot modify payment records;
- cannot read shift records beyond their own.

### Staff authority isolation

Instructor Leader:

- cannot change staff roles;
- cannot create/disable accounts;
- cannot grant themselves authority;
- cannot modify their own role.

### Operational isolation

Instructor Leader:

- cannot perform Ops Lead-only class cancellation/reschedule approval;
- cannot perform student class transfer approval;
- cannot perform retroactive attendance approval.

### Academic authority

Instructor Leader:

- can perform the existing authorized academic approval workflow;
- can access branch-scope academic data permitted by the rules.

---

# 20. UI Requirements

Use the existing MyLiberty visual language.

The dashboard should feel like a leadership workspace, not a completely separate application.

Prioritize:

- clear hierarchy;
- compact operational cards;
- exception-first presentation;
- meaningful empty states;
- mobile usability (reuse `MobileDashboardShell` patterns where appropriate);
- readable branch identity;
- clear approval counts;
- no excessive decorative charts.

Avoid creating ten separate KPI cards that communicate little.

The first screen should make the most important problems visible immediately.

---

# 21. Suggested Target Layout (illustrative only — do not hard-code fake metrics)

```text
Instructor Leader Portal
Branch: Kota Gorontalo

┌─────────────────────────────────────────────┐
│ TODAY                                       │
│ 18 Classes   11 Instructors   142 Students │
│ (12 Courses · 6 Kindergarten)              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ NEEDS ATTENTION                             │
│                                             │
│ ⚠ 2 classes need coverage                  │
│ ⚠ 4 progress reports overdue               │
│ ⚠ 1 placement override pending             │
│ ⚠ 1 substitute request pending             │
└─────────────────────────────────────────────┘

Today's Classes
──────────────────────────────────────────────
09:00  Warrior A (Courses)   Sarah    Covered   12/15
10:00  TK Bunga (Kids)      Maria    Covered   14/16
11:00  Elite B (Courses)    John     ⚠ Coverage 8/12

Academic Health
──────────────────────────────────────────────
Attendance
Progress Reports
Coverage
Instructor Workload

Quick Access
──────────────────────────────────────────────
Instructor Team
Classes & Coverage
Academic Progress
Academic Approvals
```

---

# 22. File Strategy

Likely files to create/modify:

### Dashboard

```text
src/features/dashboard/InstructorLeaderDashboard.jsx   (modify)
src/features/dashboard/InstructorLeaderDashboard.test.js (update)
```

### Leader components (new)

Potentially:

```text
src/features/dashboard/instructor/LeaderOverview.jsx
src/features/dashboard/instructor/InstructorTeam.jsx
src/features/dashboard/instructor/InstructorAcademicHealth.jsx
src/features/dashboard/instructor/InstructorCoverage.jsx
```

Use your architectural judgment; do not create unnecessary component fragmentation.

### Data layer

If queries become substantial, follow the repository pattern documented in `docs/ARCHITECTURE.md`. Do not put direct Firestore logic into presentation components if the architecture requires a repository. Review `firestore.indexes.json` if any new composite query needs an index.

### Authorization

**Do not modify `firestore.rules` in this task.** The shift-visibility gap is documented (section 11), not solved. If you conclude a capability is impossible without a rule change, document it as a gap and stop short of that capability.

### Routing

No routing changes expected; `instructorRouting.test.js` must pass unchanged.

### Tests

Add focused tests alongside the affected modules and security-rule matrix tests where behavior changes.

---

# 23. Documentation Requirement

Create the Phase 1 report:

```text
docs/reports/instructor-leader-dashboard/01-phase1-completion-report.md
```

(following the per-dashboard report series format — see `docs/reports/operational-leader-dashboard/`).

It should record:

### Established

Governance responsibilities from Blueprint v3.3 and G-003/G-011, including the owner-confirmed both-divisions coverage.

### Observed

Post-Phase-0 implementation behavior.

### Gap

Where current software does not satisfy the Instructor Leader role (including the shift-visibility gap from section 11, stated precisely).

### Implemented

What this task changed.

### Deferred

Capabilities not implemented because the underlying workflow/data model does not yet exist (teacher evaluations, shift visibility, kindergarten teaching tools for leaders, etc.).

### Security verification

What direct backend tests were run.

Do not call a capability "implemented" merely because a UI card exists.

---

# 24. Acceptance Criteria

The task is complete only when all of the following are true.

## Role separation

- [ ] Ordinary Instructor still receives `InstructorDashboard` (and `KidsInstructorDashboard` for kindergarten division), untouched.
- [ ] Instructor Leader receives the refined leadership experience in `InstructorLeaderDashboard.jsx`.
- [ ] `instructorRouting.test.js` passes unchanged.
- [ ] Legacy Instructor Leader aliases continue to normalize correctly.
- [ ] No Branch Manager authority is recreated.

## Division coverage

- [ ] Leader route remains division-independent (all divisions → leader dashboard).
- [ ] Leader data views cover both Courses and Kindergarten within the branch, where the rules permit.

## Dashboard usefulness

- [ ] Overview is exception-driven.
- [ ] Branch class coverage is visible (both divisions).
- [ ] Instructor team visibility is available where authorized.
- [ ] Academic progress monitoring is available.
- [ ] Academic approvals are clearly surfaced.
- [ ] Existing instructor functions remain accessible where appropriate.

## Governance

- [ ] G-003 reporting responsibilities are reflected.
- [ ] G-011 peer leadership model is respected.
- [ ] Instructor Leader is not treated as Admin.
- [ ] Instructor Leader is not treated as Branch Manager.
- [ ] Instructor Leader does not inherit financial authority.
- [ ] Instructor Leader does not inherit general operational authority.

## Security

- [ ] Branch isolation is backend enforced.
- [ ] Approval isolation is backend enforced.
- [ ] Self-approval remains impossible.
- [ ] Financial approval boundaries remain intact.
- [ ] Shift records remain unreadable to Instructor Leaders (gap documented, not widened).
- [ ] Staff privilege changes remain executive-controlled.
- [ ] Direct API/Firestore calls cannot bypass the UI boundary.
- [ ] `firestore.rules` is unchanged in this task.

## Performance

- [ ] No unbounded new listeners.
- [ ] No whole-school user download.
- [ ] Queries are branch/scoped where appropriate.
- [ ] Firebase Spark / zero-budget constraint remains satisfied.

## Quality gates — run these explicitly and report exact results

- [ ] Existing Instructor tests pass (`npm test`).
- [ ] New Instructor Leader tests pass.
- [ ] Security rules tests pass (`npm run test:rules` if environment supports the emulator; otherwise state it was not run and why).
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:e2e` runs (if the Playwright environment is unavailable in this environment, report that explicitly instead of skipping silently).
- [ ] **Level 1 Light Regression Check** executed per [`docs/audits/Light Regression Check Playbook/00-README.md`](../../audits/Light%20Regression%20Check%20Playbook/00-README.md), covering at minimum: ordinary instructor flows (roster, attendance, progress), leader routing for all divisions, and the approval queue.

---

# 25. Important Non-Goals

Do NOT use this task to:

- redesign the entire academic data model;
- create a new teacher-evaluation system;
- redesign the approval architecture;
- give Instructor Leader general HR authority;
- give Instructor Leader financial authority;
- give Instructor Leader Ops Lead authority;
- give Instructor Leader Manager authority;
- create a new Branch Manager under another name;
- rewrite the Instructor dashboard from scratch;
- introduce paid services;
- **modify `firestore.rules`** (the shift gap is documented, not solved);
- change ordinary-instructor or kindergarten routing.

If one of these capabilities is genuinely required to satisfy a governance responsibility, stop and document the architectural/governance gap instead of silently implementing it.

---

# 26. Final Verification Report

At the end, report:

1. Files changed.
2. Files created.
3. Governance requirements implemented.
4. Existing behavior preserved.
5. New Instructor Leader capabilities.
6. Authorization/rule changes, if any (expected: none).
7. Security tests performed.
8. Performance/cost considerations.
9. Deferred capabilities and why.
10. Exact test results, including the Level 1 Light Regression Check outcome.

Do not claim "fully compliant" unless the evidence actually demonstrates it.

The success condition is:

> **Instructor Leader becomes a real academic leadership workspace covering both divisions, while ordinary Instructor behavior remains stable and the backend authority boundary is unchanged and better documented.**
