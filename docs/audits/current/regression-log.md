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
| 2026-10-08 | Instructor Leader dashboard Phase 1 refinement + owner-approved read-only widening of `firestore.rules` for `progressReports` / `classAttendance` | Dashboard / Instructor Leader · Firestore Rules | **PASS** (browser verification partial — see record) | No | See full evidence record below |

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
  - RECORDED (not fixed, out of scope): AGENTS.md references a shared `ResponsiveTable` primitive that does
    not exist anywhere in the repository. Leader views use existing card/row layout patterns instead.
  - RECORDED (governance, not a defect): Blueprint §6.11 / §5.3 still describe the Instructor Leader
    reporting line as an open governance gap while §26 (G-003, ratified 2026-10-07) records it as RESOLVED.
    Flagged, not reconciled; the blueprint was not edited.
  - RECORDED (governance, not a defect): Blueprint G-003 assigns "shift adherence" to the Vice Director,
    while §6.11 gives the Instructor Leader "teacher schedule assignments". Unresolved in canon; this is
    why shift read access was NOT widened.
  - RECORDED (pre-existing divergence): isDivisionAllowedForBranchStaff's implemented role list is narrower
    than authorization-contract.md Layer 3 describes, so instructor-family roles are not division-gated.
    Recorded in authorization-contract.md §6.6; the helper was not changed.

Escalation Required: No
Status: PASS
  (Production deployment NOT performed by explicit owner instruction, so production behaviour is unverified.
   Browser-level verification was partial: see the E2E note below.)

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

## Cross-references

- Phase 1 completion report: [`../../reports/instructor-leader-dashboard/01-phase1-completion-report.md`](../../reports/instructor-leader-dashboard/01-phase1-completion-report.md)
- Behavioural authorization spec (updated): [`../../specs/authorization-contract.md`](../../specs/authorization-contract.md) §6.6
- Playbook §17 (Firestore rule change validation): [`../Light Regression Check Playbook/04-domain-playbooks-branch-data-rules-worker.md`](../Light%20Regression%20Check%20Playbook/04-domain-playbooks-branch-data-rules-worker.md)
