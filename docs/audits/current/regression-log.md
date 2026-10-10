# Lightweight Regression Log

> **Authority Level:** Level 1 verification evidence (`docs/audits/current/`)
> **Playbook:** [`../Light Regression Check Playbook/00-README.md`](../Light%20Regression%20Check%20Playbook/00-README.md) (§§ 22–24)
> **Scope:** Chronological evidence for targeted post-change regression checks. This is **not** a bug ledger
> (see [`../Comprehensive Hidden-Bug Audit Strategy/05-bug-tracking.md`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/05-bug-tracking.md))
> and does not override source code, `firestore.rules`, or the Authoritative Blueprint.

---

## Log

| Date | Change Summary | Section / Module | Result Status | Escalated? | Notes / Bug ID |
|---|---|---|---|---|---|
| 2026-10-08 | Instructor Leader dashboard Phase 1 refinement + owner-approved read-only widening of `firestore.rules` for `progressReports` / `classAttendance` | Dashboard / Instructor Leader · Firestore Rules | **PASS** for the change itself (browser verification partial — see record) | No | Targeted checks passed; see the evidence record below |
| 2026-10-08 | Follow-up boundary probe of the approval-gate contract (during Phase 2 scoping) | Approvals · Firestore Rules | **RESOLVED** (was `ESCALATE`) | **Yes** | `actionId → approverRole` binding was client-side only. Fixed under owner authorization the same day on the create, decision and consumption paths. See the escalation record and its resolution below |

---

## Evidence Record — 2026-10-08

```text
Change: Instructor Leader dashboard Phase 1 refinement (src/features/dashboard/InstructorLeaderDashboard.jsx
        + src/features/dashboard/instructor/{instructorLeaderRepository.js, useInstructorLeaderWorkspace.js,
        leaderUtils.js, leader/}) plus an OWNER-APPROVED, READ-ONLY widening of firestore.rules adding
        isInstructorLeader() clauses to progressReports (get/list) and classAttendance (read), and the
        composite index progressReports(branchId ASC, examDate DESC).

Date: 2026-10-08
Section: Academic Leadership Dashboard / Firestore Rules / Branch Isolation
Workflow: Instructor Leader branch-scope academic monitoring; dual-control academic approval queue
Tester / Agent: DSH coding agent (deepseek-flash), under Kifry's authorization

Risk classification (Playbook §9): HIGH-RISK — Firestore security rules + branch isolation.

Normal Test:
  - progressReports: instructorleader reads a same-branch report written by ANOTHER instructor, in BOTH
    divisions → allowed. (emulator)
  - classAttendance: instructorleader reads branch attendance for a class they do NOT teach → allowed. (emulator)
  - Branch progress-report LIST with a branchId constraint → allowed, returns only same-branch documents. (emulator)
  - Legacy alias "instructor_leader" resolves identically to canonical "instructorleader". (emulator)
  - Dashboard renders the leadership portal and all leader surfaces. (static render, 4 tests)

Duplicate Test:
  - The only new data operations are READS. No create/update/delete was added by this change, so no
    duplicate-write path exists to test.
  - Repeated attendance loads are idempotent: fetchClassAttendanceForDate issues getDocs only; re-clicking
    re-reads the same bounded set and writes nothing. (repository test asserts getDocs-only behaviour)
  - Repository test asserts empty/absent inputs short-circuit WITHOUT issuing a read (no wasted reads).

Failure Test:
  - Listener failure (permission-denied) routes to the caller's error handler instead of throwing. (repository test)
  - Component error branches render an explicit LeaderErrorNote rather than a misleading empty list.
  - progressReports failed-precondition (index not deployed) renders an explicit "index is not deployed"
    message instead of an empty state.

Boundary Test (Playbook §17 four-part suite):
  1. ALLOW    — authorized Instructor Leader reads permitted branch academic records. (emulator, PASS)
  2. DENY     — resigned Instructor Leader denied on both collections; Instructor Leader updates/deletes
                another instructor's progress report → denied; forges a report for another instructor → denied;
                creates/updates attendance for a class they do not teach → denied. (emulator, PASS)
  3. WRONG BRANCH — Branch A Instructor Leader reading/listing Branch B progress reports and attendance
                → denied; branchless progress-report list → denied (isSameBranchStrict has no fieldless
                fallback). (emulator, PASS)
  4. WRONG ROLE — plain `instructor` reading a peer's progress report or unassigned attendance → denied
                (unchanged behaviour). (emulator, PASS)
  Check Availability — every pre-existing emulator test still passes, so no legitimate application query
                regressed into an index or permission error. (72/72 emulator suite, PASS)
  Separation of duties — self-approval remains rule-blocked
                (request.auth.uid != resource.data.requestedByUid). (pre-existing emulator tests, PASS)
  Financial isolation — Instructor Leader cannot read/list branch shift records (cashReconciliation),
                and holds no payment write path. (emulator, PASS)
  Approval gate binding — NOT ENFORCED. A follow-up probe proved that the actionId -> approverRole mapping
                exists only client-side (approvalGates.js) and is never bound by firestore.rules. An
                Instructor Leader could therefore decide a CASH_DISCREPANCY ticket, and a Division Manager an
                Ops-Lead-only class cancellation, by addressing the envelope to their own role. Self-approval
                stayed blocked throughout (control probe DENIED). (emulator, ESCALATE)

Result Verification:
  - Assertions run against the REAL rules engine via the Firestore emulator, not against a UI projection.
  - The hand-mirrored rule simulator (securityRulesMatrix) was updated in the same change and by the same
    semantics (8 new tests), so simulator and real rules cannot silently drift.
  - No database WRITE was introduced, so there is no new persisted state to inspect for this change.
  - No regression to the ordinary instructor surface: InstructorDashboard bundle chunk is 2,355 bytes
    (Phase 0 recorded 2.35 kB) and InstructorDashboard.test.js, instructorRouting.test.js (10/10),
    InstructorDashboard.jsx and App.jsx routing are all unmodified.

Findings:
  - FIXED during verification: tsc caught `unscheduledToday` receiving the ARRAY of unscheduled classes
    where a count was expected. Now passes `unscheduledClasses.length`.
  - FIXED during verification: 3 react-hooks/exhaustive-deps warnings from derived values with unstable
    identity; wrapped in useMemo. Lint is now 0 errors / 0 warnings.
  - FIXED (follow-up, owner-authorized 2026-10-08): AGENTS.md referenced a shared `ResponsiveTable` primitive
    that existed nowhere in the repository. Reference removed and replaced with `MobileDashboardShell` plus an
    explicit note that no generic shared table exists (tables are feature-specific: CohortRosterTable,
    StudentRosterTable, WalkInTable, RecentVisitsTable; printTable is a print utility).
  - FIXED (follow-up, owner-authorized 2026-10-08): Blueprint §6.11 / §5.3 described the Instructor Leader
    reporting line as an open governance gap while §26 (G-003, ratified 2026-10-07) recorded it RESOLVED.
    Both stale passages now cite the resolved G-003 line. No new rule was invented.
  - FIXED (follow-up, owner-authorized 2026-10-08): Blueprint §41 was an unsigned "PENDING OWNER APPROVAL"
    template while the header declared owner approval, and the Executive Dual-Control Model was still called
    "proposed" at §0/§39 though §26 (G-004) records it RESOLVED. After the owner confirmed v3.3 is ratified,
    §41 records the approval (Owner / Director (Kifry), 2026-10-07) citing the 2026-10-07 decision document as
    the recorded basis (no fabricated signature), and the stale "proposed" markers at §0, §39 and AGENTS.md
    rule 12 were aligned.
  - RECORDED (governance, not a defect): Blueprint G-003 assigns "shift adherence" to the Vice Director,
    while §6.11 gives the Instructor Leader "teacher schedule assignments". Unresolved in canon; this is
    why shift read access was NOT widened.
  - RECORDED (pre-existing divergence): isDivisionAllowedForBranchStaff's implemented role list is narrower
    than authorization-contract.md Layer 3 describes, so instructor-family roles are not division-gated.
    Recorded in authorization-contract.md §6.6; the helper was not changed.
  - FIXED (follow-up, owner-authorized 2026-10-08): docs/README.md and
    docs/decisions/2026-10-05-delegation-of-discounts-and-refunds-to-executives.md described the former Branch
    Manager cash-reconciliation authority as "pending owner reassignment" although §26 records G-009 as RESOLVED
    with materiality tiers and the 2026-10-07 decision's own §3 Supersession Notice names that file. Both now tag
    Point 4 "SUPERSEDED BY G-009 — Blueprint v3.3 (2026-10-07)" per the G-010 tagging convention, and the
    blueprint's §18 reconciliation note (which required that supersession) now records it as satisfied.
  - RECORDED (outstanding, not edited): the blueprint's §39 "does not claim to have finalized" list keeps blanket
    wording that is now doubtful for two entries — "every approval threshold" (G-006/G-009 ratified them) and
    "emergency/delegation procedure" (G-008 ratified it). Rewriting a self-limiting disclaimer list is a broader
    editorial judgement; left for an explicit owner decision.

Escalation Required: Yes
Status: ESCALATE
  (The Phase 1 change itself passed every targeted check listed above. The escalation comes from a
   follow-up approval-boundary probe that revealed a severe PRE-EXISTING bypass of the dual-control gate
   contract — see the escalation record below. Per Playbook §23, "ESCALATE" takes precedence over "PASS"
   for the overall check status because the finding requires a Level 2 Section Deep Audit.
   Production deployment was NOT performed by explicit owner instruction, so production behaviour is
   unverified. Browser-level verification was partial: see the E2E note below.)

E2E note (honest limitation):
  Three Playwright runs produced three different outcomes, all confined to tests/portal.spec.ts (login view,
  password-reset modal, password visibility) and tests/pwa.spec.ts (manifest, icons, deep links):
    Run 1 (3 projects, fullyParallel): 12 passed / 9 failed  — failures in webkit + firefox
    Run 2 (--project=webkit --project=firefox only): 14 passed / 0 failed  — the SAME tests that failed in Run 1
    Run 3 (--workers=1, all projects): 19 passed / 2 failed  — failures now in chromium, different tests
  The failing set changes between runs, and re-running Run 1's failures in isolation produced zero failures.
  Cause: load/timing against the single shared Vite dev server (fullyParallel x 3 browser projects), not a
  code defect. No failing spec renders the Instructor Leader dashboard.
  NOT TESTED (with rationale): leader workspace interaction flows — attendance scope toggle, mobile layout,
  kiosk modal, and the live Firestore-backed views — are not browser-verified. They are covered only by
  static render tests plus the emulator rule suite. Browser verification requires a deployed rules set and a
  signed-in Instructor Leader account.
```

---

## Escalation Record — Approval Gate Binding (2026-10-08)

**Finding:** `firestore.rules` never binds an approval's `actionId` to its permitted `approverRole`.
`isApproverForDoc` validates only the document's own `approverRole` field plus branch matching, so whoever
writes the envelope chooses who may approve it.

**Evidence:** temporary emulator probe against the real `firestore.rules` (probe file removed after use):

| Probe | Outcome |
|---|---|
| Instructor Leader decides `actionId: CASH_DISCREPANCY`, `approverRole: instructorleader` | **ALLOWED** |
| Instructor Leader decides `actionId: RETROACTIVE_STUDENT_ATTENDANCE`, `approverRole: instructor_leader` | **ALLOWED** |
| Division Manager decides `actionId: CLASS_CANCELLATION_OR_RESCHEDULE`, `approverRole: manager` | **ALLOWED** |
| Self-approval (control) | DENIED (correct) |

**Why it matters:** it defeats the ratified gate registry (Blueprint §26, G-006 / G-007) and the
"capabilities are not interchangeable" principle. It also means Phase 1's acceptance criterion
"cannot approve another role's approval" is **not** satisfied at the backend layer. `AGENTS.md` is explicit:
"Client-side role checks are not the security boundary."

**Pre-existing:** neither the `approvals` create rule nor `isApproverForDoc` was modified by Phase 1. The gap
affects every gate except `STAFF_ROLE_ELEVATION` and `DISCOUNT_OR_REFUND`, whose `approverRole` is constrained
at create time.

**Actual exposure (checked, not assumed).** Only two gates are consumed by the backend, and their handling
differs:
- `STAFF_SHIFT_SELF_CORRECTION` — consumed by `isApprovedShiftCorrection()` (`firestore.rules:215`), which does
  **not** validate `approverRole`. A self-correction that policy routes to the Operational Leader can be
  addressed to and approved by the Instructor Leader, and the rules will apply it to the shift record.
  **Real backend bypass (HIGH).**
- `STAFF_ROLE_ELEVATION` — consumed by `isApprovedRoleElevation()` (`firestore.rules:225`), which *does* require
  `approverRole in ['director','vice_director']` at line 236–237. **Protected.**
- All remaining gates are not consumed at all: `isActionOperational()` is exported from `approvalGates.js` but
  has no production caller, so "blocking" mode is advisory. Impact is audit-trail integrity (MEDIUM).

**Not fixed here.** Closing it changes the security boundary and needs owner authorization plus its own
verification (securityRulesMatrix sync, emulator tests, and review of how envelopes are created). Recommended as
the opening task of Phase 2.

**Escalation target:** Level 2 Section Deep Audit
([`../Comprehensive Hidden-Bug Audit Strategy/00-README.md`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md)),
Approvals / Dual-Control domain, and the Master Bug Ledger
([`../Comprehensive Hidden-Bug Audit Strategy/05-bug-tracking.md`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/05-bug-tracking.md)).

### Resolution (2026-10-08, owner-authorized)

Closed as Phase 2 step 1. Plan: [`../../plans/active/2026-10-08-instructor-leader-dashboard-phase2-approval-gate-binding.md`](../../plans/active/2026-10-08-instructor-leader-dashboard-phase2-approval-gate-binding.md).

- `firestore.rules` gained `gateAllowsApprover(actionId, approverRole)`, enforced on the `approvals` **create**
  rule, the **decision** rule (`allow update`), and **consumption** (`isApprovedShiftCorrection`). It fails
  closed for unknown `actionId` values, and accepts legacy alias spellings so existing documents keep working.
- The shift-correction consumption path uses an **inlined** permitted set because its actionId is already
  pinned, keeping that rule inside the rules engine's expression budget.
- `securityRulesMatrix.helpers.js` mirrors the binding (`GATE_APPROVER_ROLES`, `gateAllowsApprover`) and
  `canDecideApproval` now enforces the pair.
- New `src/features/shared/instructorLeaderApprovalProbe.test.js` asserts the hardened boundary and carries a
  **drift guard** proving the rules-side binding table equals `GATED_ACTIONS[*].eligibleApproverRoles`.
- Five emulator tests prove the three probed bypasses are now denied, legitimate pairs still succeed, invalid
  pairs cannot be created, and a wrong-role approval cannot be applied to a shift record.
- **Incidental repair:** `submitStaffOnboardingRequest` addressed `NEW_STAFF_ACCOUNT` to `admin`, which no
  `isApproverForDoc` branch matches and `canApproveGate` also rejects — so staff onboarding approval could
  never be decided. It now addresses the Director, matching ratified G-007.
- **Four existing test fixtures were corrected deliberately**, because they encoded the vulnerable
  expectation: `APPROVAL_KOTA` and `pendingApproval` used `DISCOUNT_OR_REFUND` + `manager` as a generic
  manager ticket (retargeted to `TUITION_PLAN_CHANGE`); `approvedCorrection` omitted `approverRole` (now
  `ops_lead`); and `approvalsRepository.test.js` asserted `approverRole === "admin"` for onboarding (now
  `"director"`).
- **Verification:** `npm run test:rules` 77/77; `npm test` 1,235 passed; lint 0 errors / 0 warnings;
  typecheck 0 errors; build clean.
- **New residual risk recorded:** the rules engine's 1000-expression ceiling is already reached on
  `approvals` deny paths at HEAD (69 log lines, rising to 101 with this change). It is pre-existing, affects
  deny paths only, and no allow-path test fails — but it warrants a dedicated slim-down task. **Not deployed.**

**Escalation status: RESOLVED.** Retained here as the permanent record; the underlying expression-budget
observation is carried forward as a separate risk, not as this finding.

---

## Cross-references

- Phase 1 completion report: [`../../reports/instructor-leader-dashboard/01-phase1-completion-report.md`](../../reports/instructor-leader-dashboard/01-phase1-completion-report.md) — see §6.5 for the same finding in context
- Behavioural authorization spec (updated): [`../../specs/authorization-contract.md`](../../specs/authorization-contract.md) §6.6
- Playbook §17 (Firestore rule change validation): [`../Light Regression Check Playbook/04-domain-playbooks-branch-data-rules-worker.md`](../Light%20Regression%20Check%20Playbook/04-domain-playbooks-branch-data-rules-worker.md)

---

## 2026-10-09 — Phase 3 approval enforcement (ENF1 / ENF2 / ENF3)

**Level 1 Light Regression Check** for the Phase 3 changes described in
[`../../reports/instructor-leader-dashboard/owner-decisions.md`](../../reports/instructor-leader-dashboard/owner-decisions.md) §A1.

### 1. What changed (blast radius)

- **Registry/UI (ENF1, already landed):** `approvalGates.js` `DISCOUNT_OR_REFUND.mode` = `LOGGED`; the rose
  "blocking" badge became `logged`. No rule change.
- **Rules (ENF2):** `firestore.rules` gained `scoreImpliedLevel`, `isApprovedPlacementLevelOverride`,
  `placementLevelAllowed`, and the `deskInquiries` **update** rule now requires
  `placementLevelAllowed(inquiryId, request.resource.data, resource.data)`. The role disjunction in that same
  rule was collapsed to `isStaff()` (provably identical: `isExecutive() || isManager() || isFrontOffice()`
  are all subsets of `isStaff()`), because the original form left no headroom under the engine's
  1000-expression ceiling.
- **Client (ENF2):** `deskInquiriesRepository.js` (override parked as `pendingPlacementOverride`, new
  `applyApprovedPlacementOverride` + `clearPendingPlacementOverride`, ordinary writes now also stamp
  `latestPlacementScore`), `WalkInInquiryTab.jsx` (abort visibly on ticket failure), `ApprovalInbox.jsx`
  (apply branch on approve, release on reject), `FrontOfficeDashboard.jsx` (enrollment blocked while an
  override is pending), `WalkInTable.jsx` (pending badge instead of showing an unapplied level),
  `PlacementTestModal.jsx` + `src/constants/levels.js` (one shared rubric).
- **Rules (ENF3):** `classAttendance` **create** now requires `attendanceDateTs` and routes a day that has
  already ended in WITA through an approved `RETROACTIVE_STUDENT_ATTENDANCE` envelope.
- **Client (ENF3):** `classAttendanceRepository.js` (all three create paths stamp `attendanceDateTs`),
  `src/utils/dateWita.js` (`witaDayStart`), `classAttendanceSchema.js` (field added).

### 2. Adjacent-workflow checks

| Invariant | Check | Result |
|---|---|---|
| Ordinary placement test still works | emulator: score-implied `currentLevel` write by Front Office, and on a legacy inquiry with no `currentLevel` field | PASS |
| Enrollment level is not degraded | read paths (`FrontOfficeDashboard`, `KidsFrontOfficeDashboard`, `WalkInTable`, `PlacementTestModal`) were **not** modified | PASS (unchanged by design) |
| Kindergarten placement untouched | emulator: kindergarten inquiry level write with no score | PASS |
| Unrelated inquiry updates unaffected | emulator: `status` + parked-override update on a doc that already has a level | PASS |
| Same-day attendance mark untouched | emulator: assigned instructor creates today's record | PASS |
| Attendance update path untouched | emulator: SCAN update denied, MANUAL update allowed, `hasOnly` list unchanged | PASS |
| Branch isolation / division scope | emulator: cross-branch leader cannot apply an override; kindergarten Front Office cannot write a course inquiry | PASS |
| Maker-checker (no self-approval) | emulator: self-approved envelope denied for both gates | PASS |
| Legacy alias spellings | `instructor_leader`, `ops_lead` accepted in both new helpers | PASS |
| Role boundary not widened | `deskInquiries` update is still `isStaff()`-and-branch-and-division gated; the collapse removes three redundant `userProfile()` reads without changing who passes | PASS |
| Spark free-tier | no new collection, index, listener or scheduled work; rules `get()` only on the override/backfill paths | PASS |

### 3. Commands

- `npm run test:rules` (emulator at `127.0.0.1`, `firebase emulators:exec` itself cannot run under the agent
  sandbox, so the emulator jar was started directly and `FIRESTORE_EMULATOR_HOST` was set) → **98 passed**
  (was 77).
- `npm test` → **1,251 passed, 98 skipped, 0 failed** (was 1,235 passed).
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm run build` → clean (PWA precache 68 entries).
- **Expression budget:** exhaustion mentions measured over one full suite run: **212 before → 187 after**
  (test count rose 77 → 98). The new `classAttendance` create rule is never named in an exhaustion message.
  Exhaustion still occurs on the pre-existing `/users` update rule and on *deny* paths of the new
  `deskInquiries` gate; two allow-path false denials were observed and fixed during implementation by the
  `isStaff()` collapse.

### 4. Not run / not verified

- **No deployment.** `firebase deploy --only firestore:rules` was not run; production rule state is
  unverified from the repository.
- No manual browser walkthrough of the front-desk → leader → enrollment flow (no running app instance was
  used); the flow is covered by repository-level and emulator tests plus code inspection only.
- The retroactive-attendance gate has **no UI producer**, so its end-to-end user path was not exercised —
  only the rules path, with the approval document seeded.
- `npm run test:e2e` (Playwright) was not run.

---

## 2026-10-09 (later) — OD-IL-ENF4: cash relabel + new staff account enforcement

Level 1 check for the two owner decisions made after the Phase 3 report.

### 1. What changed

- [approvalGates.js](../../../src/features/shared/approvalGates.js) — `CASH_DISCREPANCY.mode` `BLOCKING` →
  `LOGGED`. Nothing branches on `mode` except the inbox badge, so no write behaviour changed.
- [firestore.rules](../../../firestore.rules) — new `isApprovedNewStaffAccount()`; the `users` **create** rule
  requires an approved envelope for staff roles (anything outside `student`/`parent`).
- [ApprovalInbox.jsx](../../../src/features/shared/ApprovalInbox.jsx) — the onboarding provisioning write now
  carries `appliedFromApproval`.
- [approvalEnforcement.test.js](../../../src/features/shared/approvalEnforcement.test.js) — lists updated;
  `BLOCKING_AWAITING_DECISION` is now empty.
- Two test assertions corrected because they encoded the old claims: `approvalGates.test.js` (mode) and
  `shiftsRepository.test.js` (envelope mode snapshot).

### 2. Adjacent-workflow checks

| Invariant | Check | Result |
|---|---|---|
| Shift cannot close without submitting the escalation | `shiftsRepository.test.js` — unchanged test still passes | PASS |
| Staff onboarding still works end to end | emulator: Director provisions against an approved envelope | PASS |
| Student intake unaffected | emulator: executive **and** Front Office create student accounts with no ticket | PASS |
| Front Office cannot create staff accounts | emulator | PASS |
| Maker-checker / replay / wrong role / wrong account | emulator: pending, `applied: true`, `manager`-addressed, and mismatched-uid envelopes all denied | PASS |
| Invite-based self-registration unaffected | create rule's invite branch untouched (still authorised by `isInviteValid`) | PASS by inspection |
| Registry no longer overstates control | guard: every `blocking` gate is enforced or recorded; no gate unclassified | PASS |

### 3. Commands

- `npm run test:rules` → **106 passed** (was 98; 8 new staff-account tests).
- `npm test` → **1,257 passed, 106 skipped, 0 failed**.
- `npm run lint` → 0 errors, 0 warnings. `npm run typecheck` → 0 errors. `npm run build` → clean.

### 4. Not run / not verified

- **No deployment.** `firebase deploy --only firestore:rules` was not run.
- No manual UI walkthrough of the staff-onboarding or shift-close flows.
- `npm run test:e2e` not run.

---

## 2026-10-09 — Marketing Dashboard Phase 1 Refinement & Security Hardening (Tasks 0–6)

Level 1 regression check for Marketing Dashboard Phase 1 implementation under Authoritative Blueprint v3.3 and ratified Owner Decisions OD-MKT-1 through OD-MKT-13.

### 1. What changed

- [MarketingDashboard.jsx](../../../src/features/dashboard/MarketingDashboard.jsx):
  - Task 1: Replaced hardcoded `"Kota Gorontalo"` with dynamic `marketingBranchId` and `marketingBranchLabel`. Added fail-closed branch-assignment banner with `AlertCircle` icon when user profile lacks a branch.
  - Task 2: Split Overview into two accurate metrics: "Walk-In Inquiries" (`deskInquiries` with `status == "inquired"`, routing to Guestbook) and "Online Applications" (`applications` with `status == "pending"`, routing to Applications tab). Added Online Applications tab rendering read-only `<StudentApplications />`.
  - Task 3: Excluded `cancelled` and `completed` batches from `openSeats` calculation.
  - Task 4: Added dynamic division support and division toggle pill ("English Courses" / "Kindergarten") when profile `division === "all"`.
- [AddSchoolModal.jsx](../../../src/features/dashboard/marketing/AddSchoolModal.jsx) & [SchoolOutreachTab.jsx](../../../src/features/dashboard/marketing/SchoolOutreachTab.jsx):
  - Passed dynamic `branchId` to `AddSchoolModal`. Resolved default municipality and district dynamically based on branch instead of hardcoding Kota Gorontalo/Kota Tengah.
- [AvailableBatches.jsx](../../../src/features/classes/AvailableBatches.jsx):
  - Excluded `cancelled` and `completed` batches from `totalCapacity` and `totalEnrolled` aggregates.
- [App.jsx](../../../src/App.jsx):
  - Passed `branch={branch} division={effectiveDivision}` to `<MarketingDashboard />`.
- [firestore.rules](../../../firestore.rules):
  - Revoked `isAdmin()` delete on business collections (`users` :521, `classes` :615, `attendance` :682, `corporateEvents` :719, `classAttendance` :797, `payments` :821, `shifts` :960, `schoolOutreach` :1023, `visits` :1038, :1054) per Principle 13.
  - Restricted `invites` create (:587) to require `isDirector()` when inviting `admin`, `director`, or `vice_director` (G-002).
  - Restricted `applications` (:594) and `deskInquiries` (:840) delete strictly to `isViceDirector() || isDirector()` (OD-MKT-8).
  - Removed `branch_manager` role across all rule predicates (`isManager`, `isStaff`, `isDivisionAllowedForBranchStaff`, `gateAllowsApprover`, `isApproverForDoc`, `isApprovedShiftCorrection`).
- Repo-Wide `branch_manager` Removal (OD-MKT-10):
  - [worker.js](../../../cloudflare-worker/worker.js:474): Removed `branch_manager: "manager"`.
  - [roles.js](../../../src/features/shared/roles.js:40): Removed `branch_manager: "manager"`.
  - [approvalGates.js](../../../src/features/shared/approvalGates.js): Removed `APPROVAL_ROLES.BRANCH_MANAGER` and case switch.
  - [approvalsRepository.js](../../../src/features/shared/approvalsRepository.js:61): Updated manager pending approvals query to equality `where("approverRole", "==", APPROVAL_ROLES.DIVISION_MANAGER)`.
  - [securityRulesMatrix.helpers.js](../../../src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js): Removed `branch_manager` across helpers, approver sets, and removed `isAdmin()` user deletion grant.
- Test Suite Updates:
  - Updated [roles.test.js](../../../src/features/shared/roles.test.js), [useUserProfile.test.js](../../../src/features/shared/useUserProfile.test.js), [operationalResources.test.js](../../../src/features/shared/securityRulesMatrix/operationalResources.test.js), [approvalGates.test.js](../../../src/features/shared/approvalGates.test.js), [devPresets.test.js](../../../src/features/auth/devPresets.test.js), and [userAuthorization.test.js](../../../src/features/shared/securityRulesMatrix/userAuthorization.test.js) to assert rejection of `branch_manager` and revocation of admin deletions.
  - Added 4 new emulator test suites in [firestoreRules.emulator.test.js](../../../src/features/shared/firestoreRules.emulator.test.js).
- Documentation:
  - [MYLIBERTY-AUTHORITATIVE-BLUEPRINT-v3.md](../../../MYLIBERTY-AUTHORITATIVE-BLUEPRINT-v3.md): Status updated to `RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY)`.
  - [owner-decisions.md](../../reports/marketing-dashboard/owner-decisions.md): Updated with ratified decisions OD-MKT-1 through OD-MKT-13.
  - [00-phase0-audit.md](../../reports/marketing-dashboard/00-phase0-audit.md): Appended Errata E1–E9, MKT-P0-024, MKT-P0-025, and duplicate-inquiry gap.

### 2. Adjacent-workflow and Invariant Checks

| Invariant | Check | Result |
|---|---|---|
| Admin cannot delete business records | Emulator: `deleteDoc` on `payments`, `shifts`, `classes`, `attendance`, `classAttendance`, `schoolOutreach`, `corporateEvents`, `users` (staff) fails | PASS |
| `branch_manager` cannot decide gates | Emulator: `updateDoc` on `approvals` with `role: "branch_manager"` fails closed | PASS |
| Executive/Admin invites require Director | Emulator: `dirGto` creates `admin`/`vice_director` invites (PASS); `vdGto`/`admin` creating `admin`/`director` invites fails (PASS); `vdGto` creating `instructor` invite succeeds (PASS) | PASS |
| Admissions deletion restricted to dual-control | Emulator: Director & Vice Director can delete `applications`/`deskInquiries`; Front Office, Manager, Admin denied | PASS |
| Division isolation & fail-closed branch | Static renders: profile without branch displays clear configuration warning; division toggle switches view | PASS |
| Capacity aggregates exclude non-active batches | Metric unit test: cancelled/completed batches excluded from open seats and capacity sums | PASS |
| Expression evaluation budget preserved | Emulator stderr: budget sites remained at 6 baseline locations (`:521`, `:806`, `:833`, `:863`, `:935`, `:1075`), no new budget expansion | PASS |

### 3. Verification Suite Commands

- `npm run test:rules` → **110 passed, 0 failed** (4 new tests added).
- `npm test` → **1,257 passed, 110 skipped, 0 failed**.
- `npm run typecheck` → **0 errors**.
- `npm run lint` → **0 errors, 0 warnings**.
- `npm run build` → **Built cleanly in 664ms**.

### 4. Not run / not verified

- **Zero production deployment (OD-MKT-11).** Rules and code remain local/un-deployed until explicit human authorization.
- `npm run test:e2e` (Playwright) was not run.

---

## 2026-10-09 — Front Office Phase 1 (F-01 record-deletion boundary)

**Level 1 Light Regression Check** for the change described in
[`../../reports/front-office-dashboard/01-phase1-completion-report.md`](../../reports/front-office-dashboard/01-phase1-completion-report.md).
Closes Phase 0 finding **F-01** ([`00-phase0-audit.md`](../../reports/front-office-dashboard/00-phase0-audit.md) §5).
Owner-approved scope: remove Front Office delete, restore an Admin-only path, keep the
enrollment/parent cascade intact.

### 1. What changed (blast radius)

- **Rules (one clause):** `match /users/{userId}` `allow delete` replaced
  `isFrontDeskStaff() && role in ['student','parent'] && isSameBranch(...) && (...)`
  with `isAdmin() && !(resource.data.role in ['director','vice_director','admin'])`.
  Front Office is removed entirely; the guard is a role-exclusion list, so executive and Admin
  accounts stay undeletable. **The clause is restored to the exact form that existed before
  `7cf64a1`**, which had removed Admin while leaving Front Office — leaving `isFrontDeskStaff` as the
  only role able to delete user records, and silently breaking the Admin Staff Directory delete
  button (`AdminDashboard.jsx:228` → `StaffDirectory.jsx:201` → `deleteUserProfile`).
- **Client:** removed `handleDelete` from the `useDashboardData` destructuring and the
  `StudentRoster` prop in `FrontOfficeDashboard.jsx` (`:75`, `:419`) and
  `KidsFrontOfficeDashboard.jsx` (`:65`, `:331`). `StudentRoster` renders its delete control only
  when that prop is present (`StudentRoster.jsx:515`, `:539`), so the affordance disappears at both
  desks. Presentation only — the rules are the control.
- **Retained deliberately:** `useDashboardData.handleDelete`, `usersRepository.deleteUserProfile`
  and its cascade (class `studentIds`/`enrollments` strip, parent unlink, `usersRepository.js:227-251`)
  remain, because `AdminDashboard` still uses them for the staff directory. Record deletion
  therefore does **not** orphan enrolment references.
- **JS mirror:** `canDeleteUser` in `securityRulesMatrix.helpers.js` rewritten to mirror the rules.
  It previously encoded the Front Office branch and had drifted from the rules — that drift is what
  let a false assertion pass (below).
- **Tests corrected (drift, not caused by this change):**
  `userAuthorization.test.js` asserted `canDeleteUser(instructor, admin) === false` under the title
  *"prevents Admin from deleting user accounts (Principle 13: Admin deletion revoked)"*. That never
  matched `firestore.rules` (the pre-`7cf64a1` clause is a role-exclusion list) and conflated
  Principle 13 (branch authority) with OD-MKT-4 (business-record deletion). Split into two accurate
  assertions.
- **Emulator assertion corrected:** the existing *"users (staff profile delete forbidden to Admin)"*
  assertion asserted the broken behaviour and **passed** — a green test protecting a defect. Now
  inverted, with the reasoning inline.

### 2. Adjacent-workflow and Invariant Checks

| Invariant | Check | Result |
|---|---|---|
| Front Office cannot delete student or parent records | Emulator: `foGto`, `foKgGto`, `foBoba`, `foResigned` delete on `users` | PASS (all DENY) |
| Ops Lead still holds no delete | Emulator: `opsGto` delete on `users` | PASS (DENY) |
| Manager holds no record-deletion path | Emulator: `mgrGto` delete on `users` | PASS (DENY) |
| Admin retains the maintenance path | Emulator: `admin` deletes a student and a parent | PASS (ALLOW) |
| Executive/Admin accounts undeletable by Admin | Emulator: `admin` deletes `dirGto`, `vdGto`, `admin` | PASS (all DENY) |
| Staff Directory delete is functional again | Emulator: `admin` deletes `insGto` (instructor) | PASS (ALLOW) |
| Division is not the operative control | Reference only — both Kinders and Courses desks denied | PASS |
| JS mirror matches the rules | Static-matrix suite: 168 assertions across 5 files | PASS |
| Executive status protection untouched | Matrix: Admin still cannot set `terminated`/`resigned` on Director/VD | PASS |
| Expression budget not expanded | Emulator suite clean; the clause swaps one `userProfile()`-bearing helper for another (net zero) | PASS |
| No new collection/index/listener/cost | Permission-only change; no data migration required | PASS |

### 3. Commands

- `npm run test:rules` → **111 passed, 0 failed** (110 at HEAD; +1 new test, 1 assertion corrected).
- `npm test` → **1,259 passed, 111 skipped, 0 failed** (the 111 skipped are the emulator suite).
- `npm run lint` → **0 errors, 0 warnings**.
- `npm run build` → clean, PWA precache 66 entries.
- `npm run typecheck` → **3 errors, all pre-existing and unrelated.** Confirmed pre-existing by
  stashing every change in this entry and re-running at HEAD — identical three errors:
  `operationalResources.test.js(568–570) TS2554`, a local stub `function canDeletePayment()`
  (`:514`) declared with no parameters but called with one, in a file this change does not touch.
  **This contradicts the marketing entry above, which recorded `typecheck → 0 errors`**; the drift
  was introduced between that run and HEAD. Recorded as an open item, not fixed here (out of scope).
  **RESOLVED in the Front Office Phase 2 entry below** — the stub signature was corrected and
  `npm run typecheck` now reports 0 errors. The underlying lesson stands: a green test suite
  coexisted with a red typecheck, and nothing gated on it.

### 4. Not run / not verified

- **No deployment.** `firebase deploy --only firestore:rules` was not run; production rule state is
  unverified from the repository.
- **No browser walkthrough.** The absent delete control is proven by props, not by a running app.
- **The Admin Staff Directory path was not exercised end-to-end** (confirm modal → batch cascade →
  parent unlink). The emulator proves the *rule* now permits the write and that the clause matches
  the pre-`7cf64a1` form; the full UI path was not run.
- `npm run test:e2e` (Playwright) was not run.
- Still open from Phase 0: deferred F-07 (Courses division filter awaits R5 backfill) and F-09 / F-10.

---

## 2026-10-10 — Front Office Dashboard Phase 2: Owner Decisions OD-FO-1..3 Implementation & Finding Closures (F-02, F-03, F-04, F-08, F-12, F-13, F-14)

Level 1 regression check for Front Office Dashboard Phase 2 implementation under Authoritative Blueprint v3.3, ratified Owner Decisions OD-FO-1 through OD-FO-3, and Phase 0 audit finding closures.

### 1. What changed

- **Owner Decision Register:**
  - Created [`docs/reports/front-office-dashboard/owner-decisions.md`](../../reports/front-office-dashboard/owner-decisions.md) codifying ratified decisions OD-FO-1 (F-03 Option A: `opslead` only), OD-FO-2 (F-01: Remove Hard Delete from Front Office), and OD-FO-3 (F-11: Authoritative academic promotions vs gated placement overrides).
- **TypeScript & Matrix Test Hygiene:**
  - `src/features/shared/securityRulesMatrix/operationalResources.test.js`: Updated `canDeletePayment(actor = null)` to reference parameter, clearing all 3 pre-existing TS2554 errors without triggering ESLint `no-unused-vars`. `npm run typecheck` now exits cleanly (0 errors).
- **Gate Authority & Dead Tab Retirement (OD-FO-1, F-03, F-04, F-08):**
  - `FrontOfficeDashboard.jsx`: Removed unused `ApprovalInbox` and `usePendingApprovalsCount` imports. Removed unreachable `isLeader` role check and retired the dead `approvals` tab, confirming Front Office is reception/cashiering with no gate approval authority.
- **Cash Reconciliation Control Connection (F-02):**
  - `src/features/attendance/shiftsRepository.js`: Added `limit(1)` to `fetchOpenShiftFor(uid, branchId)` to bound query reads for zero-budget Spark plan compliance.
  - `PaymentCashierTab.jsx`: Added `activeShift` state fetched via `fetchOpenShiftFor`, passing `activeShift={activeShift}`, `currentUser={auth.currentUser}`, and `onShiftClosed={handleShiftClosed}` to `FrontDeskCashReconcile`.
  - `FrontOfficeReportsTab.jsx`: Added internal fallback resolution of `activeShift` via `fetchOpenShiftFor` when not passed as a prop, ensuring "End Shift & Count Drawer" is reachable.
- **Kindergarten Placement Override Guard & Dynamic Branch (F-12, F-06):**
  - `KidsFrontOfficeDashboard.jsx`: Added pending placement override guard to `handleEnrollProspect` (blocking direct enrollment while awaiting Instructor Leader approval). Replaced hard-coded `"Kota Gorontalo"` strings with dynamic `myBranch`.
- **Application Permanent Delete Affordance Gated (F-13):**
  - `ApplicantCard.jsx`: Guarded `Delete` button with `{onDelete && (...)}`.
  - `StudentApplications.jsx`: Added `canPermanentDelete = false` prop, passing `onDelete={canPermanentDelete ? handlePermanentDelete : null}` so unauthorized non-executive users are never shown dead delete buttons that rules deny.
  - `ApplicantCard.test.js`: Added 2 unit tests verifying Delete button is suppressed when `onDelete` is omitted/null and rendered when provided.
- **Unused Invites Listener Suppressed (F-14):**
  - `src/features/dashboard/useDashboardData.js`: Guarded realtime `invites` collection listener with `if (!restrictedRead)`, eliminating redundant Firestore snapshot subscriptions on Front Office dashboards.

### 2. Adjacent-workflow and Invariant Checks

| Invariant | Check | Result |
|---|---|---|
| Front Office has no gate approvals | Dead tab and `usePendingApprovalsCount` retired; rules enforce `opslead` only | PASS |
| Cash reconciliation drawer count reachable | `activeShift` resolved and passed; `ShiftReconciliationModal` renders on active shift | PASS |
| Kindergarten enrollment blocked on pending override | Guarded in `handleEnrollProspect`; surfaces descriptive toast | PASS |
| Admissions delete button suppressed for non-executives | `ApplicantCard.test.js` (5 tests pass); `canPermanentDelete` defaults false | PASS |
| Invites listener not opened for restrictedRead | Guarded with `!restrictedRead` in `useDashboardData.js` | PASS |
| TypeScript check completely clean | `npm run typecheck` exits 0 (0 errors) | PASS |
| ESLint check completely clean | `npm run lint` exits 0 (0 errors, 0 warnings) | PASS |
| Full Vitest suite passes | 102 test files passed, 1,261 tests passed | PASS |
| Production build succeeds | `npm run build` exits 0, PWA precache 66 entries | PASS |

### 3. Commands

- `npm run typecheck` → **0 errors**.
- `npm run lint` → **0 errors, 0 warnings**.
- `npm test` → **1,261 passed, 111 skipped, 0 failed**.
- `npm run build` → clean, PWA precache 66 entries.

### 4. Not run / not verified

- No deployment. Production rules and application code remain strictly un-deployed.
- No manual browser UI walkthrough.
- `npm run test:e2e` was not run.

---

## 2026-10-10 — Errata: F-11 status correction (no code change)

**Appended by a second verification pass over commit `da49d2d`. This entry changes no production code.**

### 1. What is being corrected

`02-phase2-completion-report.md` §4 marks **F-11 as "CLOSED (Clarified in OD-FO-3)"**. It is not
closed, and this entry does not rewrite that report — the correction is recorded here and in
[`00-phase0-audit.md` §11 E3](../../reports/front-office-dashboard/00-phase0-audit.md).

Note the internal inconsistency in the Phase 2 record itself: this regression entry's §1 and §2 do
**not** list F-11 or an F-11 invariant, while the Phase 2 completion report's findings table does.
The two documents disagree about whether F-11 was addressed.

### 2. Evidence

| Claim | Verified state | Evidence |
|---|---|---|
| F-11 closed | **NO** — the write path is unchanged | `firestore.rules:562-574` |
| FO immune to direct level writes | **NO** — `level` + `currentLevel` still in the `isFrontDeskStaff()` allow-list | `firestore.rules:567` |
| Promotion enforced as report-derived | **NO** — no rule references a report, `eligibleForPromotion`, `promotedAt`, or instructor approval | zero matches in `firestore.rules` |
| Roster promotes to the report's level | **NO** — level comes from a ladder; `report` only clears the eligibility flag | `StudentRoster.jsx:212`, `:224`; `progressReportsRepository.js:65-73` |

**Now emulator-confirmed** (added 2026-10-10). Three diagnostic tests in `firestoreRules.emulator.test.js`
pass, documenting current behaviour: Front Office can write `currentLevel: "elite"`, a non-canonical
`currentLevel: "q"`, and the legacy `level` field on a same-branch student; Manager can do the same; and
the `syncStudentsCurrentLevel` fan-out shape succeeds on two seeded records. Cross-branch and
division-boundary writes still fail, so the gap is authority over the *value*, not scope.

**Consequence for the fix:** because `syncStudentsCurrentLevel` (`classesRepository.js:34-38`) is
indistinguishable from the bypass at the rules layer, a rule keyed on a promotion marker alone would
block four legitimate class-management paths. Closing F-11 properly needs **two** markers — see
[`00-phase0-audit.md` §11 E5](../../reports/front-office-dashboard/00-phase0-audit.md) for the design and
the one question (is the in-app promotion workflow actually used?) that decides between it and the cheap
remedy.

OD-FO-3's substance is sound — a promotion is authoritative only *"upon issuance"* from an instructor's
progress-report evaluation. The gap is that the rules validate the *shape* of a student update, never
its *authority*. A crafted client can write any `currentLevel` with a Front Office token.

### 3. Confirmed sound (no action needed)

- **F-14 is safe.** `AdminDashboard.jsx` calls `useDashboardData({ setActiveTab: handleTabChange })`
  with no `restrictedRead`, so the `!restrictedRead` guard retains the Admin invites listener while
  suppressing it for Front Office. The fix is correct as reported.
- **The typecheck drift is resolved** (see the Phase 1 entry's §3).

### 4. Not verified

- F-11's remediation was **not** implemented. Only the diagnostic evidence was added — three green tests
  in `firestoreRules.emulator.test.js` that document the current capability. `npm run test:rules` →
  **114 passed, 0 failed**.
- F-02's end-to-end drawer-count path was not exercised; only its wiring was confirmed present.




