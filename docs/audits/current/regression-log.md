# Lightweight Regression Log

> **Authority Level:** Level 1 verification evidence (`docs/audits/current/`)
> **Playbook:** [`../Light Regression Check Playbook/00-README.md`](../Light%20Regression%20Check%20Playbook/00-README.md) (§§ 22–24)
> **Scope:** Chronological evidence for targeted post-change regression checks. This is **not** a bug ledger
> (the canonical master ledger is [`bug-ledger.md`](bug-ledger.md); format defined in [`../Comprehensive Hidden-Bug Audit Strategy/05-bug-tracking.md`](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/05-bug-tracking.md))
> and does not override source code, `firestore.rules`, or the Authoritative Blueprint.

---

## Log

| Date | Change Summary | Section / Module | Result Status | Escalated? | Notes / Bug ID |
|---|---|---|---|---|---|
| 2026-10-08 | Instructor Leader dashboard Phase 1 refinement + owner-approved read-only widening of `firestore.rules` for `progressReports` / `classAttendance` | Dashboard / Instructor Leader · Firestore Rules | **PASS** for the change itself (browser verification partial — see record) | No | Targeted checks passed; see the evidence record below |
| 2026-10-08 | Follow-up boundary probe of the approval-gate contract (during Phase 2 scoping) | Approvals · Firestore Rules | **RESOLVED** (was `ESCALATE`) | **Yes** | `actionId → approverRole` binding was client-side only. Fixed under owner authorization the same day on the create, decision and consumption paths. See the escalation record and its resolution below |
| 2026-10-10 | Actions 1–5 Directives hardening: Admin business-authority removal, supervisor reconciliation, attribution display name binding & emulator suite | Office Boy · Facilities · Firestore Rules · Todos | **PASS** | No | Live deployed to `mylibertyies-f2f38` by operator at commit `19fd280`; 121/121 emulator tests pass |
| 2026-10-10 | Directives timestamp integrity (`serverTimestamp` enforcement), reopening contract formalization & expanded security suite | Office Boy · Facilities · Firestore Rules · Todos | **PASS** | No | Strict `req.completedAt == request.time`; forged times blocked; Layer 4 spec formalized; 121/121 emulator tests pass; pending live deploy |
| 2026-10-10 | Office Boy dashboard polish: surface directive-list failure state & de-duplicate stat cards to Urgent/Overdue | Office Boy · Facilities · Dashboard · Staff Directives | **PASS** | No | All quality gates pass (1,289 unit tests, 0 lint, 0 typecheck, build clean). No rules changed. Browser smoke attempted (driver CDN 404 logged). |
| 2026-10-12 | Parent Portal refinement (Items 1–3): P-04 payment status fix, P-05 attendance metrics formula & P-06 inline retry errors | Parent Portal · Students · Dashboard · Repository | **PASS** | No | 1,292 passed (3 new tests); lint, typecheck, build 0 errors; no rules changed |
| 2026-10-12 | Parent Portal Change Set 2: P-03 progressReports list branch isolation, P-08 emulator security tests & P-01/P-02 residual risks | Parent Portal · Security Rules · Firestore Emulator | **PASS** | No | 122/122 emulator tests pass; 1,292 unit tests pass; P-01 & P-02 accepted residual risks; rules pending live deploy |
| 2026-10-12 | Domain 6 Remediation: DOM06-SEC-01 (class deletion), DOM06-SEC-02 (maxCapacity parity), DOM06-SEC-03 (admissions report scoping), DOM06-COR-01 (substitute collision), DOM06-GOV-01 (transfer dual-control) | Classes · Scheduling · Reports · Security Rules | **PASS** | No | 1,332 passed, 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 7 Remediation: DOM07-SEC-01 (staff leave manager write), DOM07-SEC-02 (manager leave role tracking), DOM07-COR-01 (overnight event schema), DOM07-SEC-03 (worker event audience boundary), DOM07-COR-02 (office boy WITA due date), DOM07-COR-03 (shift self-correction userId) | Corporate Events · Staff Shifts · Staff Leave · Facilities | **PASS** | No | 1,338 passed, 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 8 Remediation: DOM08-IDX-01 (classes index), DOM08-COR-01 (dynamic tuition health), DOM08-COR-02 (canonical branch resolution), DOM08-SEC-01 (worker branch normalization), DOM08-COR-03 (attendance note singular), DOM08-UX-01 (inactive child notice) | Parent Portal · Students · Dashboard · Repository | **PASS** | No | 1,341 passed (3 new tests), 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 9 Remediation: DOM09-SEC-01 (division isolation in approvals), DOM09-SEC-02 (single-use applied seal), DOM09-SEC-03 (updatedAt serverTimestamp integrity), DOM09-COR-01 (top-level division scoping), DOM09-SEC-04 (staff onboarding division selector), DOM09-SEC-05 (decidedByUid caller auth binding) | Approvals · Maker-Checker · Security Rules · Firestore | **PASS** | No | 1,344 passed, 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 10 Remediation: DOM10-SW-02 (kiosk/public routes banner mount & idle auto-apply), DOM10-SW-01 (swUpdateStore persistent update state), DOM10-COR-01 (favicon SVG link in index.html), DOM10-UX-01 (vite:preloadError reload cooldown order), DOM10-UX-02 (fullscreen/minimal-ui display mode detection), DOM10-PERF-01 (networkReachability 404-only fallback probe), DOM10-UX-03 (update banner fallback reload safety net) | PWA · Service Worker · Network Reachability · Kiosks | **PASS** | No | 1,356 passed (12 new tests), 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 11 Remediation: DOM11-COR-01 (financial date horizons), DOM11-COR-02 (branchId fallback), DOM11-COR-03 (maxCapacity parity), DOM11-PERF-01 (progressReports scan bound), DOM11-GOV-01 (manager division scope), DOM11-TECH-01 (audit diagnostic documentation) | Reports · Dashboards · Derived Data · Financial | **PASS** | No | 1,359 passed (3 new tests), 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 12 Remediation: DOM12-A11Y-01 (ConfirmProvider Escape/backdrop/ARIA), DOM12-A11Y-02 (useOverlayHistory Escape dismissal), DOM12-A11Y-03 (operational modals back-button & backdrop), DOM12-UX-01 (StudentPhotoCapture useToast alerts), DOM12-UX-02 (empty states in rosters and cohort mobile lists) | UX · Navigation · Mobile · Modals · Accessibility | **PASS** | No | 1,360 passed (1 new test), 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-12 | Domain 13 Remediation: DOM13-SEC-01 (executive AI assistant access), DOM13-COR-01 (shift division inheritance & all preservation), DOM13-COR-02 (branch normalization across clock-in/out/switch), DOM13-RES-01 (stale/deleted activeShifts lock cleanup), DOM13-INT-01 (FormSync.gs division, validation, attribution), DOM13-TECH-01 (_fix-irnawati.mjs safety gates) | Cloudflare Worker · External Integrations · Ops Tooling | **PASS** | No | 1,364 passed (4 new tests), 0 failed; lint, typecheck, build clean; see Evidence Record below |
| 2026-10-14 | Domain 9 Remediation: DOM09-COR-01 (unapplied ticket queue & retry), DOM09-SEC-01 (staff onboarding role allowlist & executive protection), DOM09-GOV-01 (strict Director role elevation), DOM09-GOV-02 (staff deactivation gate), DOM09-UX-01 (executive review copy), DOM09-LOG-01 (sealing logged envelopes), DOM09-DEB-01 (Admin dead code removal) | Approvals · Maker-Checker · Security Rules · Users · Dashboard | **PASS** | No | 1,381 passed, 0 failed; 139/139 emulator tests passed; lint, typecheck, build clean |
| 2026-10-13 | Bundle Code Splitting Step 1: Eliminated barrel import traps for ParentPortalPage and StandaloneKioskPage in App.jsx | Routing · Performance · Bundle Splitting | **PASS** | No | Parent portal chunk isolated to 11.99 kB (down from 467 kB); StandaloneKioskPage chunk isolated to 136 kB; 1,381 tests passed; lint, typecheck, build clean |
| 2026-10-13 | Code Splitting: Modularized 902-line approvalGates.js by extracting constants into approvalGates.constants.js | Architecture · Dual-Control Approvals | **PASS** | No | approvalGates.js reduced from 903 to 533 lines; constants file 394 lines; 100% backward compatible; 1,381 tests passed; lint, typecheck, build clean |
| 2026-10-14 | Test Suite Modularization: Split 3,993-line monolith firestoreRules.emulator.test.js into src/features/shared/firestoreRulesEmulator/ (7 domain suites + setup.js) | Test Architecture · Firestore Rules Emulator | **PASS** | No | 139/139 emulator tests passed (duration reduced 37% from 24.20s to 15.07s via per-suite project isolation); 1,381 unit tests passed; lint, typecheck, build clean |
| 2026-10-15 | BLRCA Slice 1: System Admin Technical-Only Boundary Audit — cataloged verified findings DOM11-GOV-02, DOM01-GOV-03, DOM01-REP-01, DOM01-PERF-01 across UI, repository, and rules layers | Auth · System Admin · Security Rules · Dashboard · Reports | **AUDIT COMPLETE** | Yes (4 Findings Logged) | Proven business data exposure (financial reports, payment list, application listener, approvals stream) under isExecutive rules helper; worker endpoints pass; 1,433 unit tests pass |
| 2026-10-16 | Post-Slice 1 CI Remediation: Synchronized security rules matrix unit assertions to match Admin branch/division isolation and restored isExecutive() on corporateEvents calendar read | Security Rules · Test Matrix · Firestore Emulator | **PASS** | No | 1,433/1,433 unit tests pass; 139/139 emulator tests pass; 0 lint, 0 typecheck, build clean |


---

## Evidence Record — 2026-10-15 (BLRCA Slice 1)

```text
Change: Role & Business Logic Conformance Audit (BLRCA) — Slice 1: System Admin Technical-Only Boundary Audit
Date: 2026-10-15
Section: Authentication / System Administration / Firestore Rules / Reports / Navigation
Workflow: System Admin role boundary verification against Blueprint §7, §8, OD-2, and INV-02/03
Tester / Agent: Primary Coding Agent, authorized by Kifry
Risk classification: HIGH-RISK (Security boundary, role segregation, financial isolation)

Verification Evidence:
  - Admin UI Navigation: AdminDashboard.jsx mounts StaffDirectory, InvitesPanel, TasksPanel, KioskProvisioningPanel, and ReportsDashboard (with isAdminView={true}).
  - Financial Report Exposure: In ReportsDashboard.jsx (lines 24-27, 266), isAdminView={true} enables isActualAdmin, granting full province-wide Financial & Tuition report access. Logged as DOM11-GOV-02.
  - Rules Bundling: In firestore.rules (line 43), helper isExecutive() bundles isAdmin(), exposing list/read on /payments, /applications, /approvals, /progressReports, /deskInquiries. Logged as DOM01-GOV-03.
  - Helper Collapse: In src/features/shared/roles.js (line 77), isExecutiveRole() treats admin as executive, lacking an isOrgExecutiveRole() counterpart. Logged as DOM01-REP-01.
  - Performance Leak: useDashboardData.js (lines 315-325) sets up an unscoped onSnapshot listener on /applications for admin even though AdminDashboard never displays student applications. Logged as DOM01-PERF-01.
  - Findings Logged: DOM11-GOV-02, DOM01-GOV-03, DOM01-REP-01, DOM01-PERF-01 in bug-ledger.md.
```

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

---

## Evidence Record — 2026-10-10 (FO-02 & FO-03 Remediation)

```text
Change: 1) firestore.rules deskInquiries create rule hardened to reject graded course levels;
        2) deskInquiriesRepository.js createDeskInquiry sanitizes currentLevel to empty string;
        3) deskInquiriesRepository.js enforces required canonical/alias branch (FO-02);
        4) StudentAcademicFields.jsx locks academic level picker for enrolled students (editId);
        5) firestoreRules.emulator.test.js expanded with negative authorization assertions.

Date: 2026-10-10
Section: Front Office Dashboard / Firestore Security Rules / Academic Level Authority
Workflow: Walk-in inquiry logging, prospective student placement, student enrollment & profile updates
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): HIGH-RISK — Firestore security rules + authorization boundaries.

Normal Test:
  - Firestore rules emulator suite: npm run test:rules -> 117 passed, 0 failed.
  - Workspace test suite: npm test -> 1,285 passed, 117 skipped, 0 failed (102 test files).
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 656ms.

Negative Authorization / Failure Tests:
  - Front Office / Manager updating currentLevel ("elite", "master", "q") on student doc -> DENIED (assertFails).
  - Front Office updating legacy level ("Advanced") on student doc -> DENIED (assertFails).
  - Class-level sync fan-out write updating student level -> DENIED (assertFails).
  - Front Office / Manager creating course inquiry with pre-assigned currentLevel ("master") -> DENIED (assertFails).
  - Placement level override attempted without envelope, with score mismatch, with invalid approver role,
    with cross-branch approver, with pending envelope, or self-approved -> DENIED (assertFails).
  - createDeskInquiry with missing or invalid branch -> throws explicit Error (FO-02).

Deployment Parity Verification:
  - Working tree: clean on origin/main at commit 777a5a0.
  - Dry run compilation: npx firebase deploy --only firestore:rules --dry-run passed cleanly against
    production project mylibertyies-f2f38.
  - Production live rules status: Not deployed by agent (requires manual operator execution:
    firebase deploy --only firestore:rules).
```

---

## Evidence Record — 2026-10-10 (OB Directives Actions 1–5 Hardening)

```text
Change: 1) firestore.rules canUpdateTodo() & match /todos/{todoId}:
           - Action 1 (Admin Business-Authority Removal): Removed 'admin' from isSupervisor and
             staff directive roles. Admin is strictly technical-only: cannot reopen, edit, or
             delete business directives.
           - Action 2 (Supervisor Role Reconciliation): Reconciled isSupervisor strictly to
             authorized organizational roles from Blueprint §5.4, §6.8, §6.10:
             ['director', 'vice_director', 'manager', 'opslead', 'ops_lead']. Removed legacy 'frontofficelead'.
             Cross-branch directive update restricted strictly to Executive tier (Director & Vice Director).
             Directives create and delete restricted to Director, Vice Director, Manager, Ops Lead, and creator.
           - Action 3 (Attribution Integrity & Display Name Binding):
             - Bound completedByName to user profile's displayName:
               (pName != '' ? req.completedByName == pName : req.completedByName is string && req.completedByName.size() > 0).
               Direct write with spoofed display name (e.g. "Managing Director") is strictly denied.
             - Supported serverTimestamp() (req.completedAt == request.time) alongside valid non-empty ISO strings;
               empty timestamp strings are rejected.
           - 8 Local Variables: canUpdateTodo() uses exactly 8 let variables (well below the 10-variable limit).
        2) useStaffDirectives.js:
           - Updated completedDirectives sorting to handle both Firestore Timestamp objects and ISO strings.
           - Passed profile?.displayName to toggleTodoComplete so UI completions automatically supply the authoritative profile name.
        3) Verification Suite (Action 4):
           - firestoreRules.emulator.test.js: Added tests asserting:
             - Admin cannot reopen directives -> DENIED (assertFails).
             - Admin cannot edit directive content -> DENIED (assertFails).
             - Admin cannot delete directives -> DENIED (assertFails).
             - Direct write with spoofed display name -> DENIED (assertFails).
             - Direct write with empty display name or empty timestamp -> DENIED (assertFails).
             - Operational Leader, Division Manager, Vice Director, and Director reopening -> ALLOWED (assertSucceeds).
             - Assignee completing with matching profile display name -> ALLOWED (assertSucceeds).
             Results: 121 passed, 0 failed on real emulator.
           - Full Vitest suite: 1,288 passed, 0 failed (102 test files).
           - ESLint: 0 errors, 0 warnings.
           - TypeScript: 0 errors.
           - Build: Built cleanly in 688ms.
        4) Separate Deployment Verification (Action 5):
           - Local verification complete and clean across all suites.
           - Live production deployment held pending operator approval: `firebase deploy --only firestore:rules`.

Date: 2026-10-10
Section: Office Boy & Facilities / Firestore Security Rules / Operational Directives
Workflow: Directives supervisory authority, attribution binding, technical-only admin, branch isolation
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): HIGH-RISK — Firestore security rules + role authorization boundaries.

Normal Test:
  - Firestore rules emulator suite: npm run test:rules -> 121 passed, 0 failed.
  - Workspace test suite: npm test -> 1,288 passed, 121 skipped, 0 failed (102 test files).
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 688ms.

Negative Authorization / Boundary Tests:
  - System Admin attempting to reopen completed directive (Action 1) -> DENIED (assertFails).
  - System Admin attempting to edit directive content (Action 1) -> DENIED (assertFails).
  - System Admin attempting to delete directive (Action 1) -> DENIED (assertFails).
  - Direct write with spoofed display name (not matching profile displayName) (Action 3) -> DENIED (assertFails).
  - Direct write with empty display name string or empty timestamp string (Action 3) -> DENIED (assertFails).
  - Front office attempting to reopen Manager-issued directive (OB-SEC-03) -> DENIED (assertFails).
  - Staff completing directive missing assignee field (OB-SEC-02) -> DENIED (assertFails).
  - Front office completing directive assigned to office boy (OB-SEC-03) -> DENIED (assertFails).
  - Staff completing with forged completedBy UID -> DENIED (assertFails).
  - Cross-branch directive modification -> DENIED (assertFails).
  - Authorized supervisors (Ops Lead, Manager, Vice Director, Director) reopening -> ALLOWED (assertSucceeds).
  - Directive creator (Front Office) deleting/reopening their own directive -> ALLOWED (assertSucceeds).

Readiness & Governance Alignment:
  - System Admin business authority conflict completely eliminated: Admin is technical-only.
  - Supervisor list reconciled with Authoritative Blueprint §5.4, §6.8, §6.10: Ops Lead, Division Managers, Director, Vice Director.
  - Attribution integrity bound to Firestore user profile identity.
  - Deployment separation maintained: live rules deployment held pending operator execution.
```

---

## Evidence Record — 2026-10-10 (OB Dashboard Polish: Failure State & Stat Cards Deduplication)

```text
Change: 1) useStaffDirectives.js:
           - Additive exposure of `error` state from onSnapshot error callback.
           - Cleared error on snapshot receipt.
           - Existing return shape and consumers preserved without regressions.
        2) OfficeBoyDashboard.jsx:
           - Destructured `error` from `useStaffDirectives`.
           - Explicit failure state card rendered when error occurs (render order: loading -> error -> empty -> list),
             preventing misleading "All caught up!" display on listener failures or permission-denied.
           - De-duplicated WelcomeBanner stat cards: replaced duplicate "Active Tasks" with "Urgent / Overdue",
             counting tasks with priority === "urgent" or formatDueDate(dueDate)?.label === "Overdue" (renders "..." while loading).
        3) OfficeBoyDashboard.test.js:
           - Added unit tests verifying error card rendering on hook failure without showing "All caught up!".
           - Added unit tests verifying Urgent / Overdue count calculation in stat card.
           - Verified clean TypeScript conformance (error: null in mock).

Date: 2026-10-10
Section: Office Boy & Facilities Dashboard / UI Polish
Workflow: Directive status tracking, failure state surfacing, stat card accuracy
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): LOW-RISK — Pure frontend UI polish; zero security-rule or schema changes.

Normal Test:
  - Workspace test suite: npm test -> 1,289 passed, 121 skipped, 0 failed (102 test files).
  - Component unit tests: npm test src/features/dashboard/OfficeBoyDashboard.test.js -> 4 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 659ms (PWA precache 66 entries).

Failure Test:
  - useStaffDirectives returning Error("Permission denied to read directives") renders explicit
    "Unable to load assigned directives" card with error message; "All caught up! No tasks right now."
    is NOT displayed (OfficeBoyDashboard.test.js, PASS).
  - Empty tasks list with error: null renders "All caught up! No tasks right now." and does NOT display
    error card (OfficeBoyDashboard.test.js, PASS).

Not Run / Limitations:
  - firestore.rules emulator suite (npm run test:rules): NOT RUN — no firestore.rules or backend permissions were modified.
  - Automated browser smoke walkthrough (browser subagent): ATTEMPTED on localhost:3000 but halted due to external
    Playwright driver CDN 404 (playwright-1.57.0-win32_x64.zip). Proceeded per user authorization; visual rendering verified
    via renderToStaticMarkup tests.
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

---

## Evidence Record — 2026-10-12 (Parent Portal Refinement: Items 1–3)

```text
Change: 1) parentPortalRepository.js & ParentDashboard.jsx (P-04):
           - In buildPaymentSummary, explicitly honors "paid", "pending", and "unpaid" paymentStatus values.
             Falls back to historical inference (hasRecords ? "paid" : "none") strictly for legacy docs lacking status.
             Prevents students marked "unpaid" by staff from falsely displaying as "Lunas".
           - In ParentDashboard.jsx, added "Belum Lunas" badge (tone: rose) for unpaid status.
        2) ParentDashboard.jsx (P-05):
           - Aligned attendance statistics formula: LATE counts as attended; EXCUSED excluded from denominator;
             rate = effectiveTotal > 0 ? Math.round((attended / effectiveTotal) * 100) : null.
           - If no attendance records exist, Tingkat Kehadiran displays "Belum ada data" instead of misleading 100%.
           - Card 1 (Total Sesi Hadir) renders stats.attended / stats.total; Card 3 (Sesi Izin) displays stats.excused independently.
        3) parentPortalRepository.js & ParentDashboard.jsx (P-06):
           - In getChildAttendanceAndClasses, query errors for classes and attendance are captured and returned
             (errorClasses, errorAttendance) rather than silently swallowed into empty arrays.
           - In ParentDashboard.jsx, subsections display explicit inline error banners with "Coba Lagi" (retry)
             buttons rather than misrepresenting failures as "Belum terdaftar" / "Belum ada riwayat".
           - Quick metrics grid displays "-" for failed sections instead of false zeros.

Date: 2026-10-12
Section: Parent Portal / Students Repository / Attendance & Payment UI
Workflow: Parent student monitoring, attendance metrics veracity, payment status transparency
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): LOW-RISK — Pure frontend and repository data-flow refinement; zero rules or schema changes.

Normal Test:
  - Workspace test suite: npm test -> 1,292 passed, 121 skipped, 0 failed (102 test files).
  - Repository unit tests: npm test src/features/students/parentPortalRepository.test.js -> 12 passed, 0 failed (3 new tests).
  - Component unit tests: npm test src/features/dashboard/ParentDashboard.test.js -> 1 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 4.00s (PWA precache 66 entries).

Failure Test:
  - buildPaymentSummary({ paymentStatus: "unpaid", lastPaymentPeriod: "Sept 2026" }) returns status: "unpaid" (PASS).
  - getChildAttendanceAndClasses propagates network/permission rejection to errorClasses without masking (PASS).
  - ParentDashboard renders inline error card with retry button when errorClasses or errorAttendance is present.

Not Run / Limitations:
  - firestore.rules emulator suite (npm run test:rules): NOT RUN — no firestore.rules modified in Items 1–3 (P-03 rules fix slated for Change Set 2).
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

---

## Evidence Record — 2026-10-12 (Parent Portal Change Set 2: Security Rules & Residual Risks)

```text
Change: 1) firestore.rules (P-03):
           - In match /progressReports/{reportId} allow list: added isSameBranchStrict(resource.data)
             to the parent clause:
             || (isParent() && isSameBranchStrict(resource.data) && ('childStudentIds' in userProfile()) && userProfile().childStudentIds.hasAny([resource.data.studentId]))
           - Closes list query asymmetry: parents can now only list progress reports for their linked children
             within their own branch. Unconstrained and cross-branch list queries are denied.
        2) firestoreRules.emulator.test.js (P-08):
           - Added 4 test cases for parent progressReports list queries:
             * parent1 listing progress reports with branchId constraint for student1 -> ALLOWED
             * parent1 listing progress reports without branchId constraint -> DENIED
             * parent1 listing progress reports with mismatched branchId -> DENIED
             * parent1 listing progress reports for unlinked child -> DENIED
           - Added INT-013-ATT verifying parent classAttendance permissions:
             * parent1 reads attendance record for own child (student1) -> ALLOWED
             * parent1 reads attendance record for another student -> DENIED
             * parent1 lists attendance for own child (student1) -> ALLOWED
             * parent1 lists attendance for another student -> DENIED
        3) Accepted Residual Risks Documented (P-01 & P-02):
           - P-01: Document-level exposure of child's profile (including staff notes if present).
             Mitigated by isParentOf; financial/shift data isolated in separate collections;
             field-splitting into subcollections rejected under zero-budget constraints.
           - P-02: Exposure of classmate UIDs in classes.studentIds array.
             Mitigated because security rules strictly prevent parents from reading peer profiles,
             attendance, or progress reports using those UIDs. No sensitive data leaked.

Date: 2026-10-12
Section: Parent Portal / Firestore Security Rules / Emulator Test Suite / Governance Residual Risks
Workflow: Parent progress report listing, attendance query security, cross-branch data isolation
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): HIGH-RISK — Firestore security rules + branch isolation.

Normal Test:
  - Real Firestore Emulator suite (npm run test:rules) -> 122 passed, 0 failed (1 test file, 122 tests).
  - Full Vitest suite (npm test) -> 1,292 passed, 121 skipped, 0 failed (102 test files).
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 3.23s (PWA precache 66 entries).
  - Rules dry-run deploy: npx firebase deploy --only firestore:rules --dry-run -> rules file compiled successfully.

Failure Test (Boundary Test per Playbook §17):
  1. ALLOW: Authorized parent reading & listing linked child's same-branch progress reports and attendance -> ALLOWED.
  2. DENY (Missing constraint): Parent listing progress reports without branch constraint -> DENIED.
  3. DENY (Wrong branch): Parent listing progress reports for a different branch -> DENIED.
  4. DENY (Wrong child): Parent reading or listing progress reports/attendance for an unlinked student -> DENIED.

Deployment Parity Evidence:
  - Rules compiled and validated on local emulator and dry-run against live project mylibertyies-f2f38.
  - In accordance with AGENTS.md, live production deployment is NOT performed by the agent.
  - Production deployment remains operator-controlled: firebase deploy --only firestore:rules.
```

---

## Evidence Record — 2026-10-12 (Domain 5 Remediations: Students / Admissions / Profiles)

```text
Change: 1) DOM05-SEC-01: In StudentRoster.jsx, guarded loadPendingPromotions and useEffect to skip
           fetchPendingPromotions when readOnly is true or userRole === "instructor". In InstructorClasses.jsx,
           passed branchId={classes[0]?.branchId || null} to <StudentRoster>.
        2) DOM05-COR-01: In parentPortalRepository.js, removed hardcoded where("status", "==", "open") from
           qClasses and applied client-side filtering for non-cancelled and non-archived cohorts.
           Eliminates missing composite index requirement and unmasks in-progress/full classes.
        3) DOM05-GOV-01: In levels.js, implemented isHigherLevel supporting standard and program ladders.
           In StudentRoster.jsx, sorted pending promotions descending by submittedAt/examDate.
           In StudentRosterTable.jsx & StudentRosterMobileList.jsx, guarded Promote button with active status
           and isHigherLevel check. In progressReportsRepository.js, added clearStudentPendingPromotions.
        4) DOM05-RES-01: In usersRepository.js, switched createParentAccount to linkChildInternal with direct
           Firestore fallback and added deleteDoc cleanup on failure alongside deleteUser.

Date: 2026-10-12
Section: Domain 5: Students / Admissions / Applications / Roster / Profiles / Parent Linkage / Progress Reports / Promotions
Workflow: Student roster loading, instructor class view, parent portal class visibility, level promotions, parent account creation
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): MEDIUM-RISK — Roster components, levels comparison, repository queries, secondary Auth rollback.

Normal Test:
  - Workspace test suite: npm test -> 1,325 passed, 122 skipped, 0 failed across 103 test files.
  - levels.test.js: 19 passed, 0 failed.
  - StudentRosterTable.test.js: 9 passed, 0 failed.
  - parentPortalRepository.test.js: 12 passed, 0 failed.
  - usersRepository.test.js: 26 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 684ms (PWA precache 66 entries).

Failure Test:
  - Instructor opening StudentRoster: fetchPendingPromotions is skipped, pendingPromotions is empty, 0 permission-denied queries.
  - Parent classes query: in-progress and full classes returned; cancelled cohorts filtered out without composite index error.
  - Level promotion: Promote button hidden for inactive students and students already at or above recommended level; promoting clears pending promotion flags.
  - Secondary Auth failure: Parent doc in Firestore is deleted and secondary Auth user deleted when child linking fails.

Not Run / Limitations:
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

---

## Evidence Record — 2026-10-12 (Domain 6 Remediations: Classes / Rosters / Scheduling)

```text
Change: 1) DOM06-SEC-01: In firestore.rules:698, added allow delete: if isDirector() || isViceDirector();
           System Admin remains denied per emulator test 2380 and Blueprint separation of duties.
           In classesRepository.js:60-67, deleteClass verified active enrollments (classData.studentIds > 0)
           and throws an explanatory error. In ClassManager.jsx:86-99 and AvailableBatches.jsx:202-214,
           delete handlers check studentIds.length > 0 and toast an error, preventing accidental deletion.
        2) DOM06-SEC-02: In firestore.rules:695-697, updated Front Office class capacity update rule
           to enforce maxCapacity parity alongside legacy aliases:
           (!('maxCapacity' in resource.data) || request.resource.data.studentIds.size() <= resource.data.maxCapacity).
        3) DOM06-SEC-03: In reportsRepository.js:240-277, fetchAdmissionsReportData accepts callerContext.
           For non-executives with branchFilter === "all" or omitted, automatically scopes queries to
           callerContext.userBranch, or fails closed returning empty results if unresolvable.
           In AdmissionsTab.jsx and ReportsDashboard.jsx, passed caller props and added error retry banner.
        4) DOM06-COR-01: In scheduleConflict.js:98-125, expanded findScheduleConflicts to detect double-booking
           collisions across both primary (instructorId) and substitute (substituteInstructorId) instructors.
           In BatchModal.jsx:157-181, included substituteInstructorId in draft conflict checks.
        5) DOM06-GOV-01: In TransferModal.jsx:56-78, filtered candidateClasses by branchScope, preventing
           cross-branch classes from appearing. In TransferModal.jsx:131-175, submitted STUDENT_CLASS_TRANSFER
           dual-control approval envelope via createApprovalEnvelope and submitApprovalRequest.
           In approvalGates.js:734, preserved context payload for non-reason context fields.

Date: 2026-10-12
Section: Domain 6: Classes / Batches / Rosters / Timetables / Scheduling Conflicts / Lateral Transfers / Capacity / Attendance Linkage
Workflow: Class deletion safety, capacity limit enforcement, admissions report scoping, schedule collision engine, lateral student transfer dual-control
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): HIGH-RISK — Firestore security rules (/classes), capacity enforcement, admissions report scoping, schedule collision engine.

Normal Test:
  - Workspace test suite: npm test -> 1,332 passed, 122 skipped, 0 failed across 103 test files.
  - classesRepository.test.js: 30 passed, 0 failed.
  - scheduleConflict.test.js: 42 passed, 0 failed.
  - batchAvailability.test.js: 23 passed, 0 failed.
  - reportsRepository.test.js: 22 passed, 0 failed.
  - approvalGates.test.js: 24 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 2.56s (PWA precache 66 entries).

Failure Test:
  - deleteClass: Deletion rejected with error if class has enrolled students (active enrollments protected).
  - deleteClass: Deletion succeeds for empty classes without active enrollments.
  - firestore.rules: Direct client writes exceeding maxCapacity rejected at database layer.
  - fetchAdmissionsReportData: Non-executive with no branch fails closed and returns empty results without permission crash.
  - findScheduleConflicts: Double-booked substitute instructor flagged when overlapping primary or substitute teacher.
  - TransferModal: Cross-branch classes filtered out from candidate targets.
  - createApprovalEnvelope: STUDENT_CLASS_TRANSFER envelope routes to Ops Lead with branchId and transfer payload.

Not Run / Limitations:
  - Live Firestore rules deploy: NOT PERFORMED — strictly operator-controlled (firebase deploy --only firestore:rules).
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

---

## Evidence Record — 2026-10-12 (Domain 7: Corporate Events / Staff Shifts / Leave)

```text
Change: 1) DOM07-SEC-01: In firestore.rules:1054-1056, updated match /staffLeave/{leaveId} allow create rule
           to allow Division Managers for their branch and division staff:
           (isExecutive() || (isManager() && isSameBranch(request.resource.data) && isDivisionAllowedForManager(request.resource.data))).
           In StaffDutyTab.jsx:400-430 and StaffLeaveModal.jsx:20-65, permitted Division Managers and Executives
           to open leave modal, passed division to logStaffLeave, and scoped staff selection.
           In shiftsRepository.js:705-725, updated logStaffLeave to accept and persist canonical division.
        2) DOM07-SEC-02: In firestore.rules:298, added 'manager' to isTrackedLeaveRole(r) array literal.
           Executive tier can now log approved leave records for Division Managers without database permission crash.
        3) DOM07-COR-01: In src/schemas/corporateEventSchema.js:46-60, added isOvernight boolean flag.
           In superRefine, permitted endMinutes < startMinutes when isOvernight is true, only rejecting
           identical start/end minutes. In CorporateEventModal.jsx and CorporateEventsPanel.jsx, added
           an overnight event toggle and helper indicator.
        4) DOM07-SEC-03: In cloudflare-worker/worker.js:765-778, added branch, role, and division audience
           validation against device.branchId and userDoc in the corporate event kiosk clock-in handler.
        5) DOM07-COR-02: Created src/features/dashboard/officeBoyUtils.js housing formatDueDate using
           todayWita() and calendar date comparisons. Imported in OfficeBoyDashboard.jsx and tests,
           eliminating timezone skew and satisfying react-refresh/only-export-components.
        6) DOM07-COR-03: In ShiftAdjustmentModal.jsx:60-70, updated self-correction detection to inspect
           both shift.userId and shift.uid (targetUserId = shift.userId || shift.uid). Staff self-corrections
           now route reliably to STAFF_SHIFT_SELF_CORRECTION approval envelopes.

Date: 2026-10-12
Section: Domain 7: Corporate Events / Staff Shifts / Leave / Cash Drawer Reconciliation / Auto-Close / Office Boy & Facilities Directives
Workflow: Corporate event scheduling, overnight time matching, kiosk challenge & audience check, shift mutual exclusion, cash reconciliation, shift self-correction, staff leave creation, office boy directives
Tester / Agent: Pair programming agent under Kifry's authorization

Risk classification (Playbook §9): HIGH-RISK — Firestore security rules (/staffLeave, isTrackedLeaveRole), Cloudflare Worker kiosk proof & audience validation, shift self-correction approval envelope.

Normal Test:
  - Workspace test suite: npm test -> 1,338 passed, 123 skipped, 0 failed across 104 test files.
  - shiftsRepository.test.js: 28 passed, 0 failed.
  - corporateEventsRepository.test.js: 11 passed, 0 failed.
  - corporateEvents.test.js: 26 passed, 0 failed.
  - schemas.test.js: 39 passed, 0 failed.
  - OfficeBoyDashboard.test.js: 8 passed, 0 failed.
  - kioskHardening.test.js: 24 passed, 0 failed.
  - securityRulesMatrix: 170 passed, 0 failed across 5 suites.
  - ESLint: npm run lint -> 0 errors, 0 warnings across entire codebase.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 709ms (PWA precache 66 entries).

Failure Test:
  - corporateEventSchema: Overnight event with identical start/end time (e.g. 22:00 to 22:00) rejected with validation error.
  - shiftsRepository: logStaffLeave verifies canonical branchId and division stored on approved record.
  - ShiftAdjustmentModal: Self-correction envelope contains canonical targetUserId and shiftId.
  - OfficeBoyDashboard:formatDueDate: Correctly returns Overdue for past dates, Due Today for todayWita(), and Due <Month Day> for future dates without skew.
  - cloudflare-worker: Corporate event clock-in rejects external branch kiosk or incompatible role/division audience.

Not Run / Limitations:
  - Live Firestore rules deploy: NOT PERFORMED — strictly operator-controlled (firebase deploy --only firestore:rules).
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

---

## Evidence Record — 2026-10-12 (Domain 8 Remediation)

```text
Change: Level 2 Deep Conformance Audit Remediation for Domain 8 (Parent Portal):
        1. firestore.indexes.json: Added composite index (branchId ASC, studentIds CONTAINS) for classes collection (DOM08-IDX-01).
        2. parentPortalRepository.js & ParentDashboard.jsx: Integrated getPaymentHealthStatus dynamic expiry evaluation into buildPaymentSummary; added status badge tones for expired and due_soon (DOM08-COR-01).
        3. ParentDashboard.jsx: Resolved canonical branchId from selectedChild or parentProfile to prevent portal hangs on legacy string accounts (DOM08-COR-02).
        4. cloudflare-worker/worker.js: Added normalizeBranchId helper and normalized actor, parent, and student branches in handleParentLink (DOM08-SEC-01).
        5. ParentDashboard.jsx: Attendance table remarks column changed to att.note || att.notes || "-" to align with schema (DOM08-COR-03).
        6. parentPortalRepository.js & ParentDashboard.jsx: Tracked linkedStudentCount and inactiveChildCount in getAuthenticatedParentBundle; displayed dedicated inactive student notice when enrolled children are frozen/inactive (DOM08-UX-01).

Date: 2026-10-12
Section: Domain 8: Parent Portal
Authority: Authoritative Blueprint v3.3, Technical Architecture (docs/ARCHITECTURE.md), Zero-Budget Spark Tier
Tester / Agent: Antigravity Agent, under operator authorization

Commits / Verification:
  - Automated test suite: 103 passed, 1 skipped (emulator tests), 0 failed across 1,341 tests.
  - parentPortalRepository.test.js: 15 passed, 0 failed (3 new unit tests for expired/due_soon payment health & inactive child counting).
  - ParentDashboard.test.js: 1 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 694ms (PWA precache 66 entries).

Not Run / Limitations:
  - Firestore indexes deploy: NOT PERFORMED — strictly operator-controlled (firebase deploy --only firestore:indexes).
  - Production deployment: NOT PERFORMED — strictly operator-controlled.

---

## Evidence Record — 2026-10-12 (Domain 9 Remediation)

```text
Change: Level 2 Deep Conformance Audit Remediation for Domain 9 (Approvals / Maker-Checker / Audit Logs):
        1. firestore.rules: Updated isApproverForDoc (targetRole == 'manager') to require isDivisionAllowedForManager(data) (DOM09-SEC-01).
        2. firestore.rules: Enforced request.resource.data.updatedAt == request.time on /approvals update rule (DOM09-SEC-03).
        3. firestore.rules: Enforced single-use applied sealing (!('applied' in resource.data) || resource.data.applied != true) and caller attribution request.resource.data.appliedByUid == request.auth.uid (DOM09-SEC-02).
        4. securityRulesMatrix.helpers.js & approvals.test.js: Mirrored division isolation on manager gate and single-use/caller-attribution checks in JS test helper; added 3 new unit tests (DOM09-SEC-01, DOM09-SEC-02).
        5. approvalGates.js: In createApprovalEnvelope, extracted division from requester, context, or payload and attached to envelope; added 4 new unit tests (DOM09-COR-01).
        6. approvalsRepository.js: In listenToPendingApprovals, defaulted item.division to 'courses' so legacy tickets do not leak into Kindergarten manager queues; bound decidedByUid and appliedByUid strictly to auth.currentUser?.uid; added 2 new unit tests (DOM09-COR-01, DOM09-SEC-05).
        7. ApprovalInbox.jsx & ApprovalInbox.test.js: Removed Admin from NEW_STAFF_ACCOUNT role dropdown (Blueprint Principle 3), added instructorleader and opslead, added division selector (courses, kindergarten, all), rendered applicant name/email, and passed division to updateStaffRecord; added unit test (DOM09-SEC-04).

Date: 2026-10-12
Section: Domain 9: Approvals / Maker-Checker / Audit Logs
Authority: Authoritative Blueprint v3.3, Technical Architecture (docs/ARCHITECTURE.md), Zero-Budget Spark Tier
Tester / Agent: Antigravity Agent, under operator authorization

Commits / Verification:
  - Automated test suite: 103 passed, 1 skipped (emulator tests), 0 failed across 1,344 tests.
  - approvalGates.test.js: 24 passed, 0 failed.
  - approvalsRepository.test.js: 7 passed, 0 failed.
  - ApprovalInbox.test.js: 3 passed, 0 failed.
  - securityRulesMatrix/approvals.test.js: 34 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 706ms (PWA precache 66 entries).

Not Run / Limitations:
  - Firestore rules deploy: NOT PERFORMED — strictly operator-controlled (firebase deploy --only firestore:rules).
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

---

## Evidence Record — 2026-10-12 (Domain 10: PWA / Network / Service Worker / Updates)

```text
Change: Domain 10 Level 2 conformance remediation across 7 verified findings:
        1. src/features/pwa/swUpdateStore.js: Module-level pending update store to prevent dropped updates (DOM10-SW-01).
        2. src/features/pwa/autoUpdatePolicy.js & src/utils/kioskActivity.js: Kiosk idle auto-apply policy (5 min inactivity, no active scan/dialog/busy flow, reachable network) per operator approval (DOM10-SW-02).
        3. src/App.jsx: Mounted PwaUpdateBanner and ConnectivityBanner across /register, /join/*, /kiosk*, and /parent* early-return routes (DOM10-SW-02).
        4. src/features/attendance/useKioskScanner.js: Wired markKioskActivity to report scanning and modal busy states (DOM10-SW-02).
        5. src/main.jsx: Connected swUpdateStore to onNeedRefresh; moved sessionStorage.setItem("pwa_preload_reload") to immediately precede window.location.reload() (DOM10-UX-01).
        6. src/utils/networkReachability.js: Restricted fallback probe to HTTP 404 only, eliminating redundant 2.5s timeouts on stalled connections (DOM10-PERF-01).
        7. src/features/pwa/usePwaInstall.js: Expanded isRunningAsInstalledApp to recognize fullscreen and minimal-ui display modes (DOM10-UX-02).
        8. src/features/pwa/PwaUpdateBanner.jsx: Integrated swUpdateStore via useSyncExternalStore; added UPDATE_FALLBACK_RELOAD_MS (4s) timeout safety net (DOM10-UX-03).
        9. index.html: Added <link rel="icon" type="image/svg+xml" href="/favicon.svg" /> (DOM10-COR-01).
        10. src/features/pwa/PwaUpdateBanner.test.js & src/utils/networkReachability.test.js: Added 12 new regression tests covering store notification, auto-update policy, display-mode matrix, and 404-only fallback.

Date: 2026-10-12
Section: Domain 10: PWA / Network / Service Worker / Updates
Authority: Authoritative Blueprint v3.3, Technical Architecture (docs/ARCHITECTURE.md), Zero-Budget Spark Tier
Tester / Agent: Antigravity Agent, under operator authorization

Commits / Verification:
  - Automated test suite: 103 passed, 1 skipped (emulator tests), 0 failed across 1,356 tests (+12 tests).
  - PwaUpdateBanner.test.js: 12 passed, 0 failed.
  - networkReachability.test.js: 7 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 771ms (PWA precache 66 entries).

Not Run / Limitations:

---

## Evidence Record — 2026-10-12 (Domain 11: Reports / Dashboards / Derived Data)

```text
Change: Domain 11 Level 2 conformance remediation across 6 verified findings:
        1. src/features/reports/reportsUtils.js & src/features/reports/tabs/FinancialReportsTab.jsx:
           Implemented filterPayments enforcing strict date horizon filtering (since = rangeToSince(rangeDays)),
           eliminating multi-month revenue contamination when selecting 7d/30d/90d horizons (DOM11-COR-01).
        2. src/features/reports/tabs/TodayTab.jsx, src/features/reports/tabs/AdmissionsTab.jsx, &
           src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:
           Standardized branch isolation filter checks and normalizers to inspect item.branchId || item.branch,
           preventing silent record loss for modern documents lacking legacy string fields (DOM11-COR-02).
        3. src/features/dashboard/DirectorDashboard.jsx & src/features/dashboard/ViceDirectorDashboard.jsx:
           Aligned classroom seat capacity calculation with canonical schema Number(cls.maxCapacity || cls.capacity || cls.maxStudents) || 12,
           fixing occupancy gauge distortions for custom VIP/workshop classes (DOM11-COR-03).
        4. src/features/reports/reportsRepository.js:
           Added limit(200) constraint to progressReports query in fetchStudentProgressData,
           preventing unbounded historical scans and memory bloat on zero-budget Spark tier (DOM11-PERF-01).
        5. src/features/dashboard/ManagerDashboard.jsx:
           Made division filtering dynamic based on managerDivision = managerProfile?.division || "courses".
           When a Kindergarten Division Manager logs in, scopes all listeners, daily cash intake,
           ApprovalInbox, and ReportsDashboard to kindergarten instead of blinding them (DOM11-GOV-01).
        6. src/features/dashboard/branchAuditRepository.js:
           Documented diagnostic scope and backfill limitations for BranchHealthAuditCard (DOM11-TECH-01).
        7. src/features/reports/tabs/FinancialReportsTab.test.js:
           Added 3 automated regression tests verifying date horizon isolation, branchId fallback, and markup render.

Date: 2026-10-12
Section: Domain 11: Reports / Dashboards / Derived Data
Authority: Authoritative Blueprint v3.3 (Principle 10, 15, 16), Technical Architecture (docs/ARCHITECTURE.md), Zero-Budget Spark Tier
Tester / Agent: Antigravity Agent, under operator authorization

Commits / Verification:
  - Automated test suite: 104 passed, 1 skipped (emulator tests), 0 failed across 1,359 tests (+3 tests).
  - FinancialReportsTab.test.js: 3 passed, 0 failed.
  - reportsRepository.test.js: 22 passed, 0 failed.
  - ExecutiveDashboard.test.js: 5 passed, 0 failed.
  - ManagerDashboard.test.js: 5 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 4.35s (PWA precache 66 entries).

Not Run / Limitations:
  - Firestore rules deploy: NOT PERFORMED — strictly operator-controlled (firebase deploy --only firestore:rules).
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

## Evidence Record — 2026-10-12 (Domain 12 Remediation)

```text
Change: Domain 12 (UX / Navigation / Mobile) Remediations
        1. src/features/shared/ConfirmProvider.jsx:
           Added window keydown Escape listener, backdrop click dismissal, and proper ARIA dialog
           semantics (role="dialog", aria-modal="true", aria-labelledby, aria-describedby) (DOM12-A11Y-01).
        2. src/features/shared/useOverlayHistory.js:
           Added keydown Escape listener invoking onCloseRef.current?.(), delivering documented Escape dismissal
           with symmetric window.history.back() unwind on unmount (DOM12-A11Y-02).
        3. Operational Modals:
           Integrated useOverlayHistory back-button trapping, backdrop click dismiss, and close button aria-label="Close"
           across BatchModal, EnrollModal, TransferModal, CorporateEventModal, ShiftAdjustmentModal, StaffLeaveModal,
           WalkInModal, PlacementTestModal, ApplicationPlacementModal, ApplicationRejectModal, and AddSchoolModal (DOM12-A11Y-03).
        4. src/features/students/StudentPhotoCapture.jsx:
           Replaced native blocking alert() dialogs on camera/upload failure with non-blocking useToast() errors (DOM12-UX-01).
        5. Empty States:
           Added accessible empty state row in StudentRosterTable (colSpan={10}) and empty state card in
           CohortRosterMobileList, completing feedback parity with StudentRosterMobileList (DOM12-UX-02).
        6. src/features/shared/useOverlayHistory.test.js:
           Added unit test verifying Escape key invokes onClose and handles history cleanup.

Date: 2026-10-12
Section: Domain 12: UX / Navigation / Mobile
Authority: Technical Architecture (docs/ARCHITECTURE.md), Working Style (AGENTS.md UI & Accessibility basics), Zero-Budget Spark Tier
Tester / Agent: Antigravity Agent, under operator authorization

Commits / Verification:
  - Automated test suite: 104 passed, 1 skipped (emulator tests), 0 failed across 1,360 tests (+1 test).
  - useOverlayHistory.test.js: 3 passed, 0 failed.
  - StudentRosterTable.test.js: 2 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 3.77s (PWA precache 66 entries).

Not Run / Limitations:
  - Hardware physical back-button on real mobile devices: requires field device testing.
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```

## Evidence Record — 2026-10-12 (Domain 13 Remediation)

```text
Change: Domain 13 (Cloudflare Worker / External Integrations & Ops Tooling) Remediations
        1. cloudflare-worker/worker.js:
           Added "director" and "vice_director" to staffRoles in handleAIAssistant, restoring executive
           access to AI assistance tools from ViceDirectorDashboard and DirectorDashboard (DOM13-SEC-01).
        2. cloudflare-worker/worker.js:
           Updated handleShiftClockIn and handleShiftClassSwitch to derive shift division with classDoc.division
           precedence while preserving division="all" for cross-divisional staff (Ops Lead, Instructor Leader,
           Office Boy), preventing division clobbering to "courses" (DOM13-COR-01).
        3. cloudflare-worker/worker.js:
           Applied normalizeBranchId across handleShiftClockIn, handleShiftClockOut, and handleShiftClassSwitch,
           preventing false 403 Forbidden rejections for staff with legacy unslugged branch names (DOM13-COR-02).
        4. cloudflare-worker/worker.js:
           Updated activeShifts concurrency lock recovery in handleShiftClockIn: when the referenced shift
           has been deleted or closed (!shiftCheck || shiftCheck.clockOut), safely deletes the orphaned lock
           via version-precondition rather than permanently locking the employee out with 409 (DOM13-RES-01).
        5. FormSync.gs:
           Added defensive event null-safety (if (!e || !e.namedValues)), required non-empty displayName,
           derived division dynamically from program string (deriveDivisionFromProgram_), and attached
           intakeSource: "google_forms_sync" audit metadata (DOM13-INT-01).
        6. scripts/_fix-irnawati.mjs:
           Added explicit --projectId requirement and --dry-run / --commit safety gates per AGENTS.md (DOM13-TECH-01).
        7. src/features/attendance/kioskHardening.test.js:
           Added 4 automated regression tests verifying AI assistant executive roles, division resolution precedence,
           branch normalization matching, and deleted/closed lock staleness detection.

Date: 2026-10-12
Section: Domain 13: Cloudflare Worker / External Integrations & Ops Tooling
Authority: Technical Architecture (docs/ARCHITECTURE.md), Authoritative Blueprint v3.3 (Dual-Control Model), Zero-Budget Spark Tier
Tester / Agent: Antigravity Agent, under operator authorization

Commits / Verification:
  - Automated test suite: 104 passed, 1 skipped (emulator tests), 0 failed across 1,364 tests (+4 tests).
  - kioskHardening.test.js: 18 passed, 0 failed.
  - ESLint: npm run lint -> 0 errors, 0 warnings.
  - TypeScript: npm run typecheck (tsc --noEmit) -> 0 errors.
  - Build: npm run build -> built cleanly in 964ms (PWA precache 66 entries).

Not Run / Limitations:
  - Cloudflare Worker deployment: NOT PERFORMED — operator-controlled (npm run deploy:worker).
  - Google Apps Script copy-paste: manual operator step to update onFormSubmit in Google Form project script editor.
  - Production deployment: NOT PERFORMED — strictly operator-controlled.
```








