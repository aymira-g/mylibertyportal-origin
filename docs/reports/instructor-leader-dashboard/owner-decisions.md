# Instructor Leader Dashboard — Owner Decision Register (OD-IL)

> **Document Type:** Binding Owner Decision Register for Instructor Leader scope AND the cross-cutting approval-enforcement decisions it surfaced
> **Audited By:** Coding / Executor Agent
> **Companion Documents:** [`00-phase0-file-split.md`](./00-phase0-file-split.md) · [`01-phase1-completion-report.md`](./01-phase1-completion-report.md)
> **Cross-cutting origin:** audit-ledger finding **H5** in [`docs/audits/audit-log.md`](../../audits/audit-log.md) — *"'Blocking' approval gates never block"* — recorded there as **still open** and *"open for debate, not decided here"*
> **Date:** 2026-10-08
> **Status:** PENDING OWNER (KIFRY) REVIEW

---

## Why this register exists

Three sibling dashboards (Operational Leader, Course Manager, Kindergarten Manager) each received a Phase 0 conformance audit **and** an `owner-decisions.md` register whose options were ratified **before** implementation. The Instructor Leader never got either — its "Phase 0" was only a file split.

Phase 1 built the dashboard and Phase 2 hardened the approval boundary. Both are now blocked on governance questions that no code change can answer. This register collects them so they can be decided once, in one place.

**Nothing here has been implemented. No gate mode has been changed and no rule has been weakened.**

---

## Part A — Gate enforcement (cross-cutting; affects every role)

### A0. The finding, stated plainly

The ratified registry (`src/features/shared/approvalGates.js`, mirroring Blueprint §26 G-006/G-007) marks **11 of 14 gates as `mode: "blocking"`** — meaning the guarded action "must not take effect until approved".

In practice, only **two** gates are genuinely enforced. Of the 11 blocking gates:

| Verdict | Count | Meaning |
|---|---|---|
| **ENFORCED** | 2 | `firestore.rules` refuses the guarded write without an approved envelope |
| **ADVISORY** | 4 | A producer exists and the envelope is recorded, but the guarded write happens anyway |
| **NOT WIRED** | 5 | **Nothing in the codebase creates an envelope for this gate at all** — there is no approval path, and no record |

Evidence (verified by direct inspection, not inference):

- `isActionOperational()` — the helper designed to make blocking mode real — is exported at `approvalGates.js:819`, re-exported at `shared/index.js:55`, and referenced **only by tests**. It has **no production caller**.
- The only rules helpers that consume an approval are `isApprovedRoleElevation` (`firestore.rules:268`) and `isApprovedShiftCorrection` (`firestore.rules:252`).
- Only **five** client call sites create envelopes via `createApprovalEnvelope`: `PaymentModal.jsx:232`, `ShiftAdjustmentModal.jsx:64`, `BatchModal.jsx:251` and `:275`, `WalkInInquiryTab.jsx:91` — plus `submitStaffOnboardingRequest` and one elevation path in `useDashboardData.js:473`.
- The Cloudflare Worker contains **no** approval or retroactive-attendance logic.

### Per-gate status

**Current tally (2026-10-09, after ENF1–ENF4).** Of the 9 gates still declared `blocking`: **5 ENFORCED**
(`STAFF_ROLE_ELEVATION`, `STAFF_SHIFT_SELF_CORRECTION`, `PLACEMENT_LEVEL_OVERRIDE`, `NEW_STAFF_ACCOUNT`, and
`RETROACTIVE_STUDENT_ATTENDANCE` — the last has rules enforcement but **no producer**, so nothing can create
its ticket yet), **4 TRACKED** (`STAFF_DEACTIVATION`, `TUITION_PLAN_CHANGE`, `STUDENT_CLASS_TRANSFER`,
`STAFF_STATUS_CHANGE`), and **0 awaiting a decision**. `DISCOUNT_OR_REFUND` and `CASH_DISCREPANCY` are
`logged`. No `blocking` gate is left advertising a block it does not deliver. The table below is the original
audit snapshot; **the machine-checked source of truth is now
[`approvalEnforcement.test.js`](../../../src/features/shared/approvalEnforcement.test.js)**, which fails the
suite if any of those lists stops being true.

Scope note: the counts below are over the **11 blocking** gates. Counting all 14 registry gates the totals become **2 ENFORCED, 6 ADVISORY, 6 NOT WIRED** — the extra two ADVISORY rows are the `logged` gates `SUBSTITUTE_INSTRUCTOR` and `CLASS_CANCELLATION_OR_RESCHEDULE`, for which advisory behaviour is *correct*, and the extra NOT WIRED row is the `logged` gate `STUDENT_WITHDRAWAL_OR_FREEZE`.

| Gate | Declared mode | Status | Evidence |
|---|---|---|---|
| `STAFF_ROLE_ELEVATION` | blocking | **ENFORCED** | Maker never applies the role (`useDashboardData.js:488-489`); `isApprovedRoleElevation` gates the `users` role change at `firestore.rules:397-407` |
| `STAFF_SHIFT_SELF_CORRECTION` | blocking | **ENFORCED** | `ShiftAdjustmentModal.jsx:84` returns **before** applying; `isApprovedShiftCorrection` gates the `shifts` update at `firestore.rules:796-803` |
| `CASH_DISCREPANCY` | blocking | **ADVISORY — partially enforced by client code** | `shiftsRepository.js:479-492` **throws** if the envelope cannot be submitted, leaving the shift open — so *submission* is a hard precondition. But a merely `pending` envelope still lets the shift close, and `shifts` update rules (`:783-807`) only consult `isApprovedShiftCorrection`, pinned to a *different* `actionId`, so a CASH_DISCREPANCY envelope can never authorise the write |
| `NEW_STAFF_ACCOUNT` | blocking | **ADVISORY (flow-only)** | The account is provisioned inside `ApprovalInbox.handleApprove` (`:150-163`), so the client only writes on approval — but `users` create is `isExecutive()` only (`firestore.rules:381`) with no approval lookup, so nothing forces the envelope |
| `DISCOUNT_OR_REFUND` | blocking | **ADVISORY — deliberately** | `PaymentModal.jsx:260` records the payment **first**, flags `approvalStatus: "pending"`, then submits (`:262-272`); failure only warns. The code comment states the rationale: *"the cash/transfer already happened"* |
| `PLACEMENT_LEVEL_OVERRIDE` | blocking | **ADVISORY** | `WalkInInquiryTab.jsx:111` submits inside a try/catch that only `console.warn`s, then `:118` writes the override **unconditionally** — inverted order and a swallowed failure |
| `STAFF_DEACTIVATION` | blocking | **NOT WIRED** | No producer; no `ApprovalInbox` apply branch; `users` update rule (`:397-415`) gates only `role` |
| `TUITION_PLAN_CHANGE` | blocking | **NOT WIRED** | No producer. The `paymentPlan` write happens through the ordinary student update path |
| `RETROACTIVE_STUDENT_ATTENDANCE` | blocking | **NOT WIRED** | No producer. `classAttendance` update rule (`:645-654`) checks identity and method only |
| `STUDENT_CLASS_TRANSFER` | blocking | **NOT WIRED** | `TransferModal.jsx:113` calls `transferStudentBetweenClasses` directly; no envelope anywhere in the file |
| `STAFF_STATUS_CHANGE` | blocking | **NOT WIRED** | No producer. The dynamic resolver is wired into `createApprovalEnvelope` (`:696-701`) but nothing calls it |
| `SUBSTITUTE_INSTRUCTOR` | logged | **correct as designed** (but see A2.1) | `BatchModal.jsx:251-268` fire-and-forget; `logged` legitimately does not block |
| `CLASS_CANCELLATION_OR_RESCHEDULE` | logged | **correct as designed** (but see A2.1) | `BatchModal.jsx:275-290`; `logged` legitimately does not block |
| `STUDENT_WITHDRAWAL_OR_FREEZE` | logged | **NOT WIRED** | No producer, so not even the intended audit record is created |

### A2. Additional defects found by the same audit (not approval-enforcement, but adjacent)

These are recorded so they are not lost. **None is in scope for Phase 3** unless you say otherwise; each is a candidate for its own task.

1. **`SUBSTITUTE_INSTRUCTOR` / `CLASS_CANCELLATION_OR_RESCHEDULE` may be rejected outright for non-admins — needs emulator confirmation before it is called a defect.**
   *Verified:* the `classes` update rule (`firestore.rules:491-499`) permits Front Office only `hasOnly(['studentIds', 'enrollments', 'updatedAt'])`, and **no branch of that rule includes `manager`**. `BatchModal.jsx:294` calls `updateClass` with a payload carrying `substituteInstructorId` / `status`, so those writes are outside the Front Office allow-list.
   *Not yet verified:* whether a non-admin can actually reach that save. `ClassManager.jsx:296` forwards `canEdit={isAdmin}` to its inner batch list, and `BatchModal` is opened from `ClassManager` / `AvailableBatches`, so the mismatch may be latent (unreachable) rather than user-facing.
   *Next step:* an emulator test attempting the write as `manager` and as `frontoffice`. If it is reachable, this is a functional defect for Division Managers editing their own division's classes; if not, it is latent drift worth tidying.
2. **`NEW_STAFF_ACCOUNT` bypasses the registry.** Its envelope is a raw object literal (`approvalsRepository.js:205-229`) instead of `createApprovalEnvelope(...)`, so `mode`, `domain` and `approverRole` are duplicated outside `GATED_ACTIONS` and can drift — which is exactly how the `approverRole: "admin"` bug arose that Phase 2 repaired.
3. **Approving an unhandled gate silently does nothing.** `ApprovalInbox.jsx:179-181` falls through to a generic success toast for the six NOT WIRED gates plus DISCOUNT_OR_REFUND, CASH_DISCREPANCY, PLACEMENT_LEVEL_OVERRIDE, SUBSTITUTE_INSTRUCTOR and CLASS_CANCELLATION. For a discount, the payment keeps `approvalStatus: "pending"` **indefinitely** — nothing in the app ever clears it.
4. **Three manager dashboards advertise a queue that cannot be populated.** `ManagerDashboard.jsx:589`, `KidsManagerDashboard.jsx:511` and `ManagerOverview.jsx:151` tell Division Managers they will review "tuition plan modifications, student withdrawals" — both gates are NOT WIRED.
5. **A test gives false assurance.** `approvalGates.test.js:40` asserts `CASH_DISCREPANCY.approverRole === APPROVAL_ROLES.BRANCH_MANAGER`. It passes only because the deprecated alias is literally the string `"manager"`, so the assertion does not test what its name implies.
6. **A toast promises a recovery path that does not exist.** `ApprovalInbox.jsx:118` tells the approver a failed shift correction can be applied by "an admin … from Staff Duty Reports"; `applyApprovedShiftCorrection` is called from `ApprovalInbox.jsx:114` only, and there is no Staff Duty Reports call site.
7. **NEW (found while implementing ENF2, 2026-10-08) — `users.currentLevel` is still directly writable by Front Office and Managers, so level placement is not fully leader-gated.** The student-record allow-list at `firestore.rules` includes both `level` and `currentLevel` for `isFrontDeskStaff() || isManager()`. The same roles that must obtain the Leader's approval to override a placement level on a walk-in inquiry can set that student's level directly on the student record — at registration (`StudentAcademicFields.jsx`) or afterwards. Gating it is **not** a small additive change: legitimate writers include promotions (`StudentRoster`, `progressReportsRepository.js`), batch/class-level sync (`classesRepository.js:36`), and registration, so it needs a product decision about which level changes are *authoritative* (promotion) versus *overrides*. **Recorded, not silently closed.**
8. **NEW (same audit) — `deskInquiries` `create` accepts any `currentLevel`.** The walk-in intake form pre-fills a default level (`walkInUtils.getDefaultData` → `tierOptions[0].defaultLevel`), and the create rule does not gate the field, so a crafted client can create an inquiry at the level it wants and enroll from it without any approval. Closing this means either gating create (which would require dropping the intake default, since that default has no score behind it) or dropping the default and showing "Unassessed" until a real assessment exists. **Needs a product decision; ENF2 deliberately did not touch it.**

### The decision needed

For each blocking gate, one of two honest outcomes. Leaving the registry and the UI claiming a block that does not exist is the only indefensible option (the UI renders a rose "blocking" badge for these, which currently misleads staff).

- **Option A — Enforce at the write path.** Add a rules check requiring an approved envelope, in the same shape as `isApprovedRoleElevation` (`firestore.rules:268`): read the approval doc, assert `actionId`, `status == 'approved'`, not already applied, and that `approverRole` is permitted for that gate. Per-gate feasibility varies, and an independent systematic audit **corrected two of the estimates** originally written here:
  - *Cleanly enforceable:* `STAFF_DEACTIVATION` and `STAFF_STATUS_CHANGE` (both target `users.status`; the `users` update rule already branches on a field diff, so a status branch can require an approval id), `CASH_DISCREPANCY` (`shifts.cashReconciliation.exceedsThreshold`).
  - *Needs a marker field first:* `DISCOUNT_OR_REFUND` (rules cannot distinguish a discounted payment from a normal one), `PLACEMENT_LEVEL_OVERRIDE` (the override is an **array append** to `deskInquiries.placementTests`), `TUITION_PLAN_CHANGE` (the `paymentPlan` field sits inside a ~40-field student allow-list and needs its own branch), and **`RETROACTIVE_STUDENT_ATTENDANCE` — corrected: NOT cleanly enforceable.** `attendanceDate` is a `string`, and rules cannot compare it to `request.time`; it needs an explicit approved-backfill flag.
  - *Hard / needs a product decision:* `STUDENT_CLASS_TRANSFER` spans **two** class documents through a batch, which rules cannot correlate. Enforcing it would need a transfer approval id on both documents plus a helper validating the pair together, or a separate transfer record.
  - *Structural caution:* rules enforce a write, not an intention. Several gates share one write path — `STAFF_DEACTIVATION` and `STAFF_STATUS_CHANGE` both write `users.status`; `SUBSTITUTE_INSTRUCTOR` and `CLASS_CANCELLATION_OR_RESCHEDULE` both go through the same `updateClass` call, so a single save can emit two envelopes.
- **Option B — Relabel to `logged`.** Change `mode` in the registry so the UI badge, the governance docs and reality agree. Correct choice where notify-first is deliberate (see A1).

### A1. Specific decisions

**OD-IL-ENF1 — `DISCOUNT_OR_REFUND`: enforce or relabel?**
- **Already reasoned about.** `docs/audits/audit-log.md:139-145` records: *"the payment itself is still recorded immediately, before approval — money has already changed hands … so refusing to save the payment isn't a safe option … If a hard block is actually wanted (e.g. hold the receipt until a manager approves), that's a bigger redesign and should be scoped separately — open for debate, not decided here."*
- **Option A (Enforce):** hold the receipt / block the discount from taking effect until a Director or Vice Director approves. Bigger redesign; risks a front-desk deadlock while a parent waits.
- **Option B (Relabel to `logged`):** the behaviour is deliberate, visible (`approvalStatus: "pending"` badge in payment history and on the receipt) and auditable. Relabel so the UI stops claiming a block.
- **Suggested default:** **Option B**, while keeping the existing visibility fix. The money has already moved; a "blocking" label that cannot be honoured is a governance-accuracy problem, not a functional one.
- **Answer (Kifry fills in):** **OPTION B — RATIFIED BY OWNER 2026-10-08.**
- **Status: IMPLEMENTED 2026-10-08.** `GATED_ACTIONS.DISCOUNT_OR_REFUND.mode` changed from `BLOCKING` to `LOGGED` (`approvalGates.js`). The rose "blocking" badge in `ApprovalInbox` now reads `logged`, matching reality; the payment `approvalStatus: "pending"` badge and failure toast are unchanged, so visibility is preserved. Two `approvalGates.test.js` assertions updated to the new mode. No rule change; all gates green.

**OD-IL-ENF2 — `PLACEMENT_LEVEL_OVERRIDE`: enforce or relabel? (Instructor Leader's own gate)**
- **Why it matters most.** This is one of only two gates the Instructor Leader owns, and the only one declared blocking. Today a Front Office assessor's override goes live immediately; the leader's ticket arrives afterwards and **rejecting it changes nothing**.
- **Option A (Enforce):** require an approved envelope before the override is effective. Because the override is an array append on `deskInquiries`, this needs a small data-model change — an explicit field the approval flow sets (e.g. the placement test carrying an approved-override reference), which `firestore.rules` can then require.
- **Option B (Relabel to `logged`):** accept notify-first for placement overrides as well.
- **Suggested default:** **Option A.** Unlike a payment, this is an academic record that has not "already happened" anywhere physical — the student's level can be corrected before it is used, and this gate is the leader's core authority. Enforcing it is what makes the leader's approvals tab meaningful.
- **Answer (Kifry fills in):** **OPTION A — RATIFIED BY OWNER 2026-10-08.**
- **Status: IMPLEMENTED 2026-10-08 as design A′** (see `OD-IL-ENF2 — why design A was replaced` below; the plan in the next section is kept only as the reasoning trail and is **superseded**). Reading the write path showed that enforcement is *not* a rules-only change, and that design A as first written would not have gated the level at all.

  **The blocker.** `PlacementTestModal.jsx:52` decides `isOverride = Boolean(recLevel && assessedLevel !== recLevel)` **in the client**, and `addPlacementTestToInquiry` (`deskInquiriesRepository.js:142-186`) writes `currentLevel = assessedLevel` for **both** override and ordinary placement tests. The inquiry document never records `recommendedLevel`, so nothing in the stored data lets `firestore.rules` tell a gated override from an ungated normal assessment.

  Two ways to close it, and only one of them is real enforcement:
  - **Design A — split the field (genuinely enforceable).** The assessment writes only `placementTests[].assessedLevel` (ungated). `currentLevel` becomes the *approved effective level*, writable **only** with a valid `PLACEMENT_LEVEL_OVERRIDE` envelope, via an apply step in the leader's inbox — exactly the pattern `isApprovedShiftCorrection` already uses. Consequence: an ordinary (non-override) placement test no longer sets `currentLevel` immediately, so the enrollment/admission read path must take the level from the latest assessment. That is a **product-visible change touching enrollment**.
  - **Design B — record `recommendedLevel` and require approval when it differs (NOT enforceable).** A crafted client can simply write `recommendedLevel` equal to the level it wants, so the check is forgeable and would be advisory wearing a "blocking" label — the exact problem this phase exists to remove.
  - **Recommendation:** **Design A**, but it needs your sign-off because of the enrollment read-path change. I have not started it.

### OD-IL-ENF2 Design A — file-level implementation plan (**SUPERSEDED — see the A′ record below**)

Reading the write path surfaced one further detail that **refines** the design: `PlacementTestModal.jsx:22` derives its *recommended* level from `inquiry.currentLevel`, so simply not writing `currentLevel` would silently degrade the ordinary flow (wrong recommendation, "Unassigned" in the walk-in list). `WalkInTable.jsx:111` already prefers `latestTest.assessedLevel`, so only two readers need adjusting.

**Execute in this order — the tree stays functional at every step.**

*Client half (safe on its own; the app keeps working without the rules half):*
1. `deskInquiriesRepository.js` — in `addPlacementTestToInquiry`, stop writing `currentLevel` (record the assessment only). Add `applyApprovedPlacementOverride({ inquiryId, level, approvalId, actorUid })` which writes `currentLevel` + `appliedFromApproval`, and **throws** rather than falling back to local state, so a governed action cannot silently appear to succeed.
2. `WalkInInquiryTab.jsx` — for an override, `await submitApprovalRequest(...)` and **abort with a visible error** if it fails (today the failure is a `console.warn` and the override proceeds). Stop setting `currentLevel` in the local state updates at `:129` and `:140`.
3. `ApprovalInbox.jsx` — add a `PLACEMENT_LEVEL_OVERRIDE` apply branch calling `applyApprovedPlacementOverride`, then `markApprovalApplied` (mirroring the existing shift-correction branch at `:112-121`). Without it, approving currently falls through to a generic toast and does nothing.
4. `WalkInTable.jsx:124` — display the latest `placementTests[].assessedLevel` instead of `inquiry.currentLevel`.
5. `PlacementTestModal.jsx:22` — recommend from the latest assessment, falling back to `currentLevel`, then the existing default.

*Rules half (the enforcement):*
6. `firestore.rules` — add `isApprovedPlacementLevelOverride(inquiryId, approvalId)` mirroring `isApprovedShiftCorrection` (`:252`): assert `actionId`, `status == 'approved'`, not already applied, `gateAllowsApprover(actionId, approverRole)`, and `payload.inquiryId == inquiryId`.
7. `firestore.rules` — in the `deskInquiries` update rule (`:687`), require that condition whenever the write touches `currentLevel`. Place it **last** and mind the 1000-expression budget; measure and report before/after.
8. `securityRulesMatrix.helpers.js` + tests — mirror the helper; add emulator tests: allowed with an approved envelope, denied without one, denied with a wrong-role envelope, denied when the envelope names a different inquiry, denied on replay, and — critically — **an ordinary placement test (no `currentLevel` write) must still succeed**.
9. Re-run `npm run test:rules`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and a Level 1 regression check.

### OD-IL-ENF2 — why design A was replaced, and what A′ does

**Design A as written could not deliver the gate.** It moved the effective level out of `currentLevel`
and told the enrollment read path to take the level from the latest assessment. But the client appends an
override assessment to `placementTests` **immediately**, approval or not (`deskInquiriesRepository.js`).
So "latest assessment" would have fed the *unapproved* override level straight into enrollment, and the
rules would have been gating `currentLevel` — a field nobody enrolled from. It also caused the
product-visible enrollment change this register already flagged.

**The root constraint.** Rules cannot tell an override from an ordinary assessment unless they derive the
recommendation themselves. Design B failed because it trusted a client-supplied `recommendedLevel`. The
recommendation is a pure function of the score (`>=85 epic`, `>=65 master`, else `warrior`), and *that* is
computable in rules.

**Design A′ (ratified by the owner and implemented).**

- `currentLevel` stays the effective level and **no read path changed** — enrollment cannot regress.
- `firestore.rules` gains `scoreImpliedLevel()` + `placementLevelAllowed()`: a write may change
  `currentLevel` only if it equals the level the score written in the same update implies, or an approved
  `PLACEMENT_LEVEL_OVERRIDE` envelope (`appliedFromApproval`) authorises the exact inquiry and level, or the
  inquiry is kindergarten (tier/age based, never score based).
- The ordinary assessment path is unchanged and still sets `currentLevel` — it also writes
  `latestPlacementScore`, the score the rules derive from.
- An override is **not applied by the client at all**: `WalkInInquiryTab` submits the ticket and, if the
  submission fails, aborts with a visible error and leaves the level untouched (previously `console.warn`
  and the override proceeded). The request is parked on the inquiry as `pendingPlacementOverride`.
- The leader's inbox gains the apply branch (`applyApprovedPlacementOverride` → `currentLevel` +
  `appliedFromApproval` → `markApprovalApplied`); rejection clears the parked request
  (`clearPendingPlacementOverride`), so an inquiry cannot stay blocked on a decision that never comes.
- `recommendLevelFromScore()` in `src/constants/levels.js` is the single source of truth for the rubric,
  mirrored into the rules and pinned by a drift guard in `placementLevelGate.test.js`.
- **Owner decision recorded:** while an override is pending, front-desk enrollment is **blocked** with a
  clear message rather than defaulting to the fluency tier — admitting the student at the wrong level is
  worse than asking them to wait for the leader.
- A level chosen with **no score** is treated as an override, not an assessment; otherwise omitting the
  score would be a trivial way around the gate.

**Honest limits (recorded, not engineered away).**

- An assessor can **fabricate the score**, which makes their chosen level "recommended". A′ stops every
  honest-client override of a recorded assessment; it cannot stop falsified assessment content. That needs a
  server-side writer, which this project does not have.
- Two *other* write paths can still set a level without this gate — recorded as §A2.7 and §A2.8 rather than
  quietly left implied.

**Verification.** `npm test` 1,251 passed · `npm run test:rules` 98/98 (14 new gate tests: ordinary
assessment allowed, override denied without an envelope, wrong-role / cross-branch / wrong-inquiry /
wrong-level / replayed / self-approved / pending envelopes denied, kindergarten ungated, unrelated updates
unaffected) · lint 0 errors · typecheck 0 errors · build clean. **Not deployed.**
- **Status: IMPLEMENTED 2026-10-08 as design A′.** Reading the write path a third time showed that **design A as written does not gate the level at all** — see `OD-IL-ENF2 — why design A was replaced`. Design A′ is in the tree and green; the enrollment read path was **not** changed.

**OD-IL-ENF3 — the five NOT WIRED blocking gates: wire, enforce, or remove?**
(`STAFF_DEACTIVATION`, `TUITION_PLAN_CHANGE`, `RETROACTIVE_STUDENT_ATTENDANCE`, `STUDENT_CLASS_TRANSFER`, `STAFF_STATUS_CHANGE`)
- **Option A:** build the missing producers so the workflow exists, then enforce (or log) as declared. Largest scope; each needs its own UI entry point.
- **Option B:** remove the gates from the registry, since the organisation is evidently not running an approval workflow for them. Requires a governance amendment (the registry is ratified by G-006/G-007).
- **Option C:** keep them declared and out of scope for now, but add a roadmap line so the divergence is tracked rather than silently tolerated.
- **Suggested default:** **Option C for the four operational/HR gates** (`STAFF_DEACTIVATION`, `TUITION_PLAN_CHANGE`, `STUDENT_CLASS_TRANSFER`, `STAFF_STATUS_CHANGE`) — track the divergence rather than building five workflows at once. **Option A for `RETROACTIVE_STUDENT_ATTENDANCE`** remains my recommendation, because G-007 assigns it to the Operational Leader and attendance correction is a real recurring need — but note the **corrected** feasibility: it needs an explicit approved-backfill flag, since `attendanceDate` is a string that rules cannot compare to `request.time`. It is a two-part change (flag + helper), not a one-line rule. `STUDENT_CLASS_TRANSFER` additionally needs the product decision in A0 before either option is viable.
- **Answer (Kifry fills in):** **OPTION C for the four + Option A for `RETROACTIVE_STUDENT_ATTENDANCE` — RATIFIED BY OWNER 2026-10-08.**

**Tracked (Option C) — deliberately NOT implemented, recorded so the divergence stays visible:**

| Gate | Declared | Actual | Tracking note |
|---|---|---|---|
| `STAFF_DEACTIVATION` | blocking | no producer, no enforcement | The `users.status` branch is expressible when wanted; no approval path exists today |
| `TUITION_PLAN_CHANGE` | blocking | no producer, no enforcement | Three manager dashboards currently advertise a queue nothing can populate (see A2.4) |
| `STUDENT_CLASS_TRANSFER` | blocking | no producer, no enforcement | Needs the A0 product decision first (spans two class documents) |
| `STAFF_STATUS_CHANGE` | blocking | no producer, no enforcement | The dynamic resolver exists but nothing calls it |

**`RETROACTIVE_STUDENT_ATTENDANCE` (Option A) — Status: BLOCKED ON A DESIGN DECISION.** The same class of blocker as OD-IL-ENF2, in a different form:

- `classAttendance.attendanceDate` is a **client-supplied string** (`YYYY-MM-DD`), and Firestore rules cannot parse strings into dates. Rules therefore cannot distinguish a backfill from a same-day mark, and a client-supplied `isRetroactive` flag would be forgeable — advisory wearing a "blocking" label, which is the very problem this phase exists to remove.
- **Achievable enforcement:** add a machine-comparable `attendanceDateTs` (Timestamp) written alongside the string, then require an approved envelope whenever the declared instant is older than the write time (`request.time > attendanceDateTs + duration.value(...)`). This genuinely stops the **legitimate** client from backfilling without approval.
- **Honest limit:** a deliberately crafted client could still declare a false "today" timestamp. It would then write a record with a *wrong date* — a separate data-integrity problem, not the same gate bypass. Full prevention needs the date set server-side, and this project has no server path for that.
- **What it needs from you:** approval to add a Timestamp field to `classAttendance` (a schema addition, plus a backfill decision for existing records). **Not started.**

- **Answer (Kifry fills in) — approve the `attendanceDateTs` schema addition?:** **APPROVED — RATIFIED BY OWNER 2026-10-08, with the backfill UI deferred.**
- **Status: RULES ARMED 2026-10-08; no backfill UI built, and none was needed.** What was implemented:
  - `attendanceDateTs` (a Timestamp, written by `dateWita.witaDayStart()` as 00:00 WITA of the attendance
    day) is now **required on create** of a `classAttendance` record, in all three create paths (scan, manual,
    close-out).
  - `firestore.rules` gains `isRetroactiveAttendance()` — the record is a backfill once
    `request.time >= attendanceDateTs + 24h` — plus `isApprovedRetroactiveBackfill()`, which requires an
    approved `RETROACTIVE_STUDENT_ATTENDANCE` envelope naming exactly that class, student and date. A same-day
    mark behaves exactly as before.
  - **No backfill of existing records is needed**, which was the open migration question: the update rule
    already pins `attendanceDate` to the stored value, so old records cannot become retroactive by update,
    and legacy documents simply stay ungated (they can never be re-dated). The schema field is optional on
    read for that reason.
  - **No producer exists and none was invented.** No screen can mark a past date today
    (`InstructorAttendanceView.jsx:161` always passes today), so the registry verdict honestly remains
    **"gate armed, capability absent"** rather than ENFORCED. The Ops Lead apply path is rules-supported and
    emulator-tested, so a future backfill UI cannot bypass it by construction.
- **Contrast with the earlier `RETROACTIVE_STUDENT_ATTENDANCE` (Option A) note:** the honest limit stands
  unchanged — a crafted client can declare a false "today" timestamp and write a record with a wrong date.
  That is a data-integrity problem, not a bypass of this gate, and closing it needs a server-side writer this
  project does not have.
- **Verification:** 7 new emulator tests (retroactive without approval denied, missing `attendanceDateTs`
  denied, matching approved envelope applied by the Ops Lead allowed, wrong date / wrong gate / wrong role /
  pending / replayed envelopes denied) · 3 new repository tests proving all three create paths stamp the WITA
  day start. `npm run test:rules` 98/98, `npm test` 1,251 passed. **Not deployed.**
- **Deployment caveat (must be handled before the rules go live):** because `attendanceDateTs` is now
  **required** on create, any client still running a cached pre-change bundle will have its attendance writes
  refused with a permission error until the service worker picks up the new build. Deploy the rules only once
  clients have the new bundle, or accept a short window in which attendance marking fails visibly.

**OD-IL-ENF4 — the last two blocking gates nothing enforces: `CASH_DISCREPANCY` and `NEW_STAFF_ACCOUNT`.**
Surfaced on 2026-10-09 by the new drift guard, which refuses to let a `blocking` gate exist unless it is
enforced or recorded as a decision. ENF1–ENF3 decided every other gate; these two were left undecided.

- **`CASH_DISCREPANCY` (blocking, ADVISORY).** Submitting the ticket is already a *hard* precondition
  (`shiftsRepository.js` throws, leaving the shift open), but a merely **pending** ticket still lets the shift
  close, and no rule consults a `CASH_DISCREPANCY` envelope. The money has already been counted at the desk —
  the same reasoning that made `DISCOUNT_OR_REFUND` a relabel in ENF1.
  - *Option A (enforce):* the shift cannot close until an Ops Lead approves. This is cleanly enforceable
    (`shifts.cashReconciliation.exceedsThreshold`) but risks leaving the drawer record open overnight, and
    refusing to record a discrepancy does not remove it.
  - *Option B (relabel to `logged`):* keep the hard submission precondition and the visibility, drop the claim
    that it blocks. **Suggested default: Option B.**
- **`NEW_STAFF_ACCOUNT` (blocking, ADVISORY/flow-only).** The account is only provisioned inside
  `ApprovalInbox.handleApprove`, so the real flow is already approval-gated — but `users` create is
  `isExecutive()`-only with no approval lookup, so an executive can create a staff account with no ticket on
  record.
  - *Option A (enforce):* the `users` create rule requires `appliedFromApproval` plus an approved
    `NEW_STAFF_ACCOUNT` envelope. Cheap, because the flow already works that way; it closes direct creation.
  - *Option B (relabel to `logged`):* accept that the Director approves by *being* the Director.
    **Suggested default: Option A** — an account is access, and the decision is worth having on record.
- **Answer (Kifry fills in) — `CASH_DISCREPANCY`, and `NEW_STAFF_ACCOUNT`:** **`CASH_DISCREPANCY` → Option B (relabel to `logged`); `NEW_STAFF_ACCOUNT` → Option A (enforce). RATIFIED BY OWNER 2026-10-09.**
- **Status: IMPLEMENTED 2026-10-09.**
  - **`CASH_DISCREPANCY` → `logged`.** `GATED_ACTIONS.CASH_DISCREPANCY.mode` changed; the inbox badge that
    derives from `mode` stops claiming a block. **The real control is untouched:** the shift still cannot
    close unless the escalation is submitted (`shiftsRepository`) — verified by the sibling test
    *"refuses to close the shift when the escalation cannot be submitted"*, which passes before and after,
    confirming the submission precondition never depended on the mode.
  - **`NEW_STAFF_ACCOUNT` → enforced.** `firestore.rules` gains `isApprovedNewStaffAccount(targetUserId,
    approvalId)` (actionId, `status == 'approved'`, not already applied, maker ≠ checker, approver in the
    inlined Director/Vice-Director set, `payload.uid == targetUserId`), and the `users` **create** rule now
    requires an approved envelope for any role outside `student`/`parent`. `ApprovalInbox`'s provisioning
    path writes `appliedFromApproval`. Student and parent intake is unchanged, and the invite-based
    self-registration path is still authorised by the invite rather than a ticket.
  - **Two false starts worth recording, both caught by tests rather than by inspection:** the mode assertion
    in `approvalGates.test.js` and a `mode: "blocking"` snapshot inside `shiftsRepository.test.js` both had to
    be updated — the same "test encodes the old claim" pattern ENF1 hit. The second one is the useful
    signal: it proves the shift-close protection is independent of the label.
  - **Guard updated:** `NEW_STAFF_ACCOUNT` moved into the enforced list, `CASH_DISCREPANCY` into the `logged`
    list, and `BLOCKING_AWAITING_DECISION` is now **empty** — kept as the ratchet so a future `blocking` gate
    with nothing behind it must be added there deliberately, with a recorded decision, or the suite fails.
  - **Verification:** 8 new emulator tests for the staff-account gate (denied with no ticket, allowed against a
    matching approved envelope, denied for a wrong-role / wrong-account / pending / replayed envelope, and
    student intake by both an executive and Front Office still allowed) · `npm run test:rules` **106/106**
    (was 98) · `npm test` **1,257 passed** · lint 0 errors · typecheck 0 errors · build clean. **Not deployed.**

---

## Part B — Instructor Leader capability decisions

**OD-IL1 — Shift-adherence visibility.**
G-003 gives the Leader operational responsibility for "shift adherence" (reported upward to the Vice Director), but `firestore.rules` permits shift reads only for executives, Manager/Front Office, or the person's own record. Shift documents carry `cashReconciliation`, and **rules cannot hide individual fields**.
- **Option A:** build a non-financial projection (a small `dutyPresence` document written on clock-in/out with `userId`, `branchId`, `division`, `clockIn`, `clockOut`, `punctualityStatus`, `status`) and let the Leader read only that. Costs one extra write per kiosk clock action plus a backfill.
- **Option B:** leave the gap and keep it documented.
- **Suggested default:** **Option B for now.** Blueprint G-003 places shift adherence under the Vice Director's operational control; the Leader's §6.11 duty is *teacher schedule assignments*, which the existing classes/substitutes data already covers. Revisit only if the Leader genuinely cannot cover classes without shift data.
- **Answer (Kifry fills in):**

**OD-IL2 — Teacher evaluations.**
§6.11 establishes "teacher evaluations" as a Leader responsibility, but **no evaluation subsystem exists** — no rubric, no observation record, no collection.
- **Option A:** design and build a minimal governed model (rubric, observer, date, evidence, acknowledgement) as its own scoped task. This is the only item in this register with meaningful ongoing cost and a real data-model footprint.
- **Option B:** leave it explicitly unimplemented and state that plainly in the dashboard (current behaviour).
- **Suggested default:** **Option B**, unless teacher evaluation is an active business need today. The Phase 1 brief explicitly forbids inventing evaluation scores or a collection to make the dashboard look complete.
- **Answer (Kifry fills in):**

**OD-IL3 — Division gating divergence.**
`authorization-contract.md` Layer 3 describes the division gate as `!(isManager() || isFrontOffice())`, but the implemented helper uses a narrower role list, so instructor-family roles are **not** division-gated. The contract and the code disagree.
- **Option A (tighten the rule):** add instructor-family roles to the division-gated list so the code matches the contract. Risk: a kindergarten-bound Leader would lose read access to Course classes/students, contradicting the both-divisions mandate ratified in G-003.
- **Option B (correct the contract):** document that instructor-family roles are intentionally division-exempt.
- **Suggested default:** **Option B.** Tightening would break the both-divisions Leader scope the owner already ratified; the code reflects the intended behaviour and the documentation is what drifted.
- **Answer (Kifry fills in):**

**OD-IL4 — Kindergarten-specific leader tooling.**
Deferred since Phase 0. The Leader route is division-independent, so kindergarten classes and instructors are in scope, but kindergarten-specific tools (class photo share, developmental observation logs) are not adapted for leaders.
- **Option A:** adapt the kindergarten tools for the Leader role.
- **Option B:** leave the Leader with the cross-division monitoring they have today.
- **Suggested default:** **Option B** until the Leader reports a concrete gap; monitoring scope is already covered.
- **Answer (Kifry fills in):**

**OD-IL5 — Role card and workflow card artifacts.**
Blueprint §1305 requires branch-scope leadership roles to receive separate role cards, and §1337 requires workflow cards to record unresolved owner decisions. Neither exists for the Instructor Leader.
- **Option A:** produce them as governance artifacts.
- **Option B:** track as a governance-debt item.
- **Suggested default:** **Option B** — it is a documentation deliverable that blocks no software work.
- **Answer (Kifry fills in):**

---

## What happens after you answer

1. Every **Option A** becomes a scoped implementation task with its own tests and Level 1 regression check.
2. Every **Option B** becomes a registry/documentation correction — no behaviour change, but the UI and docs stop overstating what is enforced.
3. **Nothing is implemented before you answer.** Gate modes are ratified by G-006/G-007, so changing them is your decision, not an implementation detail.
