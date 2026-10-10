# MyLiberty — Front Office Dashboard Phase 0 Conformance Audit

> **Document type:** Phase 0 conformance audit (verification evidence, not governance authority)
> **Date:** 2026-10-09
> **Repository state:** working tree at commit `7cf64a1` (clean at audit start)
> **Scope:** `FrontOfficeDashboard.jsx`, `KidsFrontOfficeDashboard.jsx`, `CrossDivDashboard.jsx`, and the front-desk domain components they mount
> **Production-code changes made by this audit:** **NONE**
> **Firestore rules changed by this audit:** **NONE**
>
> **Authority chain used:** Authoritative Blueprint v3.3 (RATIFIED) → `docs/specs/authorization-contract.md` → `docs/ARCHITECTURE.md` → `firestore.rules` + `src/`
>
> An audit is a verification mechanism. Nothing here redefines policy; where the evidence conflicts with an approved baseline, it is recorded as a divergence for an owner decision.

---

## 1. Executive summary

### 1.1 Why this audit was commissioned

A refinement of the Front Office experience was proposed on the premise that "we have not yet completed a line-by-line audit of the dashboard implementation, its sibling dashboard, or its backend authorization paths." **That premise is incorrect.** Two Front Office audits already exist in this repository, and neither was completed to closure. This Phase 0 therefore does not start from zero: it reconciles the existing evidence against the current working tree and resolves the one governance question that blocks any further work.

### 1.2 What this audit established

| # | Conclusion | Confidence |
|---|---|---|
| 1 | Both prior Front Office audits are **still substantially accurate** — 5 of 9 findings remain live in code | Proven by file/line |
| 2 | The gate authority in Blueprint **G-007 is not implemented** for the `frontoffice` role | Proven by file/line |
| 3 | The internal cash-reconciliation control is **doubly unreachable** — not one break, as previously recorded, but two | Proven by file/line |
| 4 | One prior audit finding (**3.4**, institutional analytics bleed) is **partly incorrect** and must be downgraded | Proven by file/line |
| 5 | Front Office holds a **permanent, irreversible delete** over student and parent records, and Firestore rules *permit* it | Proven by file/line |
| 6 | The Front Office "Approvals" tab is **unreachable for every role that can currently log in** | Proven by file/line |
| 7 | The `front_office` role-alias mismatch from the login audit **remains an open latent failure mode** | Proven by file/line |
| 8 | Front Office can **write a student's `currentLevel` directly**, bypassing the `PLACEMENT_LEVEL_OVERRIDE` gate in two separate ways | Proven by file/line |
| 9 | Kindergarten Front Office is **missing the pending-override enrollment guard** that Courses has | Proven by file/line |
| 10 | An **unused realtime listener** on `invites` runs on every Front Office dashboard load | Proven by file/line |

**Added in the §11 errata pass** (after this audit was first published):

| # | Conclusion | Confidence |
|---|---|---|
| 11 | A **failed inquiry save is reported to staff as a successful save that is "safely stored"** — with a `success` toast and the prospect routed straight into enrolment (F-15, S1) | Proven by file/line |
| 12 | Prospect/parent PII persists in `localStorage` with **no retention bound and no logout cleanup** (F-16, S2) | Proven by file/line |
| 13 | Local-only inquiries are **invisible to every consumer except the Front Office tab** — no leader or manager can see them, and nothing ever syncs them upward (F-17, S3) | Proven by file/line |
| 14 | **F-01 is closed** (Phase 1, emulator-verified), and implementing it exposed a further defect this audit had missed: the Admin Staff Directory delete button was broken at HEAD (E1) | Proven by file/line + emulator |

### 1.3 The single blocking question

Everything in Phase 1 depends on one answer that is **not** an implementation detail:

> **Does the `frontoffice` role hold approval authority for `CLASS_CANCELLATION_OR_RESCHEDULE`, `RETROACTIVE_STUDENT_ATTENDANCE`, and `STUDENT_CLASS_TRANSFER` as Blueprint G-007 states, or does that authority belong exclusively to `opslead` as the code implements?**

Until that is answered by the owner, an implementer cannot know whether to add Front Office approval capability or to confirm its absence. **Do not start Phase 1 or Phase 2 before this is answered.** See §6.

### 1.4 Headline conclusion

**The most serious finding is not an over-privileged role. It is a lie told to staff by the interface (F-15).**

When a walk-in inquiry fails to save, the Front Office clerk is shown a **green success toast** reading *"Prospect saved locally! Opening Student Registration form..."*, and the prospect is routed straight into enrolment. The collection of failed records sits in a banner that says walk-in visitors are *"safely stored"* and *"can be immediately enrolled as students."* Both statements are false. The repository's own code states the correct rule three lines away from one of the violations: *"a governed action must never appear to have succeeded when the rules refused it."*

Behind that, three further exposures:

1. **Blunt:** Front Office could permanently delete student or parent records, with no approval and no audit trail (F-01 — **now closed**; see §11 E1).
2. **Subtle:** Front Office can write a student's `currentLevel` directly — both by promoting from the roster (F-11) and by the ordinary student-update allow-list — while the `PLACEMENT_LEVEL_OVERRIDE` gate that exists specifically to control level changes is enforced only on the *walk-in inquiry* path. The gate is real, correctly built, and enforced on the wrong door.
3. **Silent:** A failed enrolment conversion leaves the student created and the inquiry unconverted **with no warning at all**, because the caller's `try/catch` reacts only to a throw and the permission path returns instead (F-15, §"blast radius").

And the inverse problem: desk staff appear unable to complete a cash shift honestly, because the control designed to make them accountable is unreachable in two independent ways (F-02).

---

## 2. Methodology and evidence standard

**Read (evidence):**

- `docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md` — §6.9 (Front Office responsibilities), §11.2/§11.3 (data scope), §15–§17 (Maker–Checker / sensitive actions), §18 (financial governance), §24 (role definition standard), §26 G-001…G-011 (ratified decisions), §28 Principles 1–16
- `docs/specs/authorization-contract.md` — Role × Branch × Division contract and approval architecture
- `docs/ARCHITECTURE.md` — dashboard subdomains (§"Dashboard subdomains and entry points", line 156) and role dashboard list (line 573)
- `docs/audits/archive/2026-09-24-front-office-local-audit.md` (84 lines)
- `docs/audits/archive/2026-10-01-front-office-login-audit.md` (641 lines)
- `docs/reports/instructor-leader-dashboard/owner-decisions.md` — ratified gate-mode decisions affecting Front Office gates
- `docs/audits/current/regression-log.md` — Phase 3 ENF1/ENF2/ENF3 verification record
- `src/App.jsx`, `src/features/dashboard/FrontOfficeDashboard.jsx`, `KidsFrontOfficeDashboard.jsx`, `CrossDivDashboard.jsx`, `OpsLeadDashboard.jsx`, `useDashboardData.js`
- `src/features/dashboard/frontoffice/*` (all 10 modules), `src/features/dashboard/usersRepository.js`
- `src/features/dashboard/frontoffice/walkInUtils.js`, `WalkInInquiryTab.jsx`, `deskInquiriesRepository.js` *(added in the §11 errata pass — F-15/F-16/F-17)*
- `src/features/shared/approvalGates.js`, `ApprovalInbox.jsx`, `approvalsRepository.js`, `roles.js`
- `src/features/reports/ReportsDashboard.jsx`
- `src/features/attendance/kioskScanProcessor.js`, `StandaloneKioskPage.jsx`, `KioskModal.jsx`
- `firestore.rules` (users/classes/applications/approvals/shifts/invites/deskInquiries clauses)

**Commands run:** none affecting build, tests, rules, or the emulator. This audit is static (source + rules text + documents). **No test suite, build, lint, typecheck, or emulator run was performed** — see §9 for the findings this leaves unconfirmed.

**Evidence standard:** every claim below carries `path:LINE`. Where a claim rests on the *text* of `firestore.rules` rather than an executed rules test, it is marked **[rules text only]**. This distinction is material: `firestore.rules` operates close to the Firestore rules engine's 1000-expression ceiling, and the repository's own records show that rule *text* and rule *behaviour* have diverged before (`docs/audits/archive/2026-10-01-front-office-login-audit.md:236-341`).

---

## 3. Current-state inventory

### 3.1 Entry points and routing (verified)

`CrossDivDashboard` **is** a distinct entry point alongside the two dashboards, exactly as `docs/ARCHITECTURE.md:156` and `:573` state. Routing, verified at `src/App.jsx`:

| Role (`effectiveRole`) | Division | Rendered | Evidence |
|---|---|---|---|
| `frontoffice` | `courses` | `FrontOfficeDashboard` | `App.jsx:601` |
| `frontoffice` | `kindergarten` | `KidsFrontOfficeDashboard` | `App.jsx:599` |
| `frontoffice` | `all` | `CrossDivDashboard role="frontoffice"` | `App.jsx:597` |
| `opslead` / `ops_lead` / `frontofficelead` | any | `OpsLeadDashboard` | `App.jsx:587-592` |

**The Operations Lead no longer routes through `FrontOfficeDashboard` at all.** This is a correction to the premise of the proposed refinement: `OpsLeadDashboard` is a separate, purpose-built dashboard with its own tabs (`approvals`, `reconciliation`, `facilities`, `frontoffice`, `students`, `batches`, `schedule`, `reports`, `events`) — `OpsLeadDashboard.jsx:137-265`.

### 3.2 Tab surface — Courses (`FrontOfficeDashboard.jsx:368-510`)

| # | Tab id | Label | Rendered component | Line |
|---|---|---|---|---|
| 1 | `overview` | Overview | inline | 369 |
| 2 | `cashier` | Cashier & Finance | `PaymentCashierTab` | 370-381 |
| 3 | `inquiries` | Guestbook & Inquiries | `WalkInInquiryTab` | 382-393 |
| 4 | `applications` | Applications | `StudentApplications` | 394-407 |
| 5 | `students` | Students | `StudentRoster` | 408-427 |
| 6 | `classes` | Classes | `ClassManager` | 428-441 |
| 7 | `events` | Events | `CorporateEventsPanel` | 442-446 |
| 8 | `reports` | Reports | `FrontOfficeReportsTab` | 447-456 |
| 9 | `approvals` | Approvals | `ApprovalInbox userRole="ops_lead"` | 457-473 *(conditional)* |
| 10 | `misc` | Tasks | `TasksPanel` | 474-489 |
| 11 | `aiAssistant` | AI Assistant | `AIAssistant` | 490 |
| 12 | `addUser` | Add/Edit Student | `UserForm` | 491-509 *(hidden)* |

The `approvals` tab is gated on `isLeader` (`:457`), defined at `:358-364` as `opslead || ops_lead || frontofficelead || front_office_lead || manager || admin`.

### 3.3 Tab surface — Kindergarten (`KidsFrontOfficeDashboard.jsx:278-395`)

Overview, Cashier & Tuition, Guestbook & Inquiries, Applications, Learners, Classes & Rooms, Reports (`ReportsDashboard`, `:358`), Tasks, AI Assistant, hidden Register/Edit Learner.

**Structurally different from Courses in four ways** that matter for governance, and none is documented as intentional:

1. No `approvals` tab at all.
2. `Reports` mounts the full institutional `ReportsDashboard`, not the isolated `FrontOfficeReportsTab`.
3. `PaymentCashierTab` and `WalkInInquiryTab` receive a **hard-coded** `branchLabel="Kota Gorontalo"` (`:287`, `:299`).
4. No `AvailableBatches` capacity widget (Courses has one, `FrontOfficeDashboard.jsx:345-353`).

### 3.4 Mutation capability inventory

| Capability | Reachable by Front Office? | Evidence |
|---|---|---|
| Create/update student record (bounded field allow-list) | **Yes** | `firestore.rules:541-561` **[rules text only]** |
| Create parent account, edit parent record | **Yes** | `firestore.rules:507-511`, `:562-569` **[rules text only]** |
| **Permanently delete a student or parent profile** | **Yes** *(at audit time — **closed** in Phase 1, see §11 E1)* | `FrontOfficeDashboard.jsx:419`; `KidsFrontOfficeDashboard.jsx:331` → `useDashboardData.js:617-642` → `usersRepository.js:186,227-251` (`batch.delete(doc(db,"users",uid))` at `:228`); permitted by the `users` delete clause **[rules text only]**. That clause now reads `allow delete: if isAdmin() && !(resource.data.role in ['director','vice_director','admin'])` at `firestore.rules:534` |
| **Promote a student's level from the roster** | **Yes** — `currentLevel` is written directly | `StudentRoster.jsx:510`/`:534` → `progressReportsRepository.js:65-69`; permitted by `firestore.rules:912` **[rules text only]** (see F-11) |
| Permanently delete an application | Affordance shown; **rules deny** | `StudentApplications.jsx:154` → `applicationsRepository.js:180`; denied by `firestore.rules:595` **[rules text only]** (see F-13) |
| Record tuition payment | **Yes** | `PaymentCashierTab` / `PaymentModal` |
| Create/update/close a class | Partially — `hasOnly(['studentIds','enrollments','updatedAt'])` for Front Office | `firestore.rules:645-649` **[rules text only]** |
| Create walk-in inquiry, park a placement override | **Yes** | `WalkInInquiryTab`, `deskInquiriesRepository.js` |
| Create/update TODO tasks | **Yes** | `TasksPanel` |
| Read invite documents (branch-scoped) | **Yes** | `firestore.rules:580` **[rules text only]** |
| **Create an invite** | **No** | `firestore.rules:587` — `create` is `isExecutive() && …` |
| Approve any gated action | **No** — see F-03 | `approvalGates.js:21-28`, `:806-811`; `firestore.rules:209-211`, `:883-884` **[rules text only]** |
| Export CSV of report data | Yes, but scoped to their own duty log | `ReportsDashboard.jsx:91-97` is unconditional; `isSupervisor` is false for Front Office (`:25`), so the staff tab renders "My Duty Log" only (`:125`) |
| Assign/change a role | **No** | `firestore.rules:522-540` bounds `role` change to `isExecutive()` + approved envelope |
| Staff/admin account provisioning | **No** | `firestore.rules:497-506` |

**Non-mutations confirmed clean:** the WhatsApp "invite" on the Courses overview (`FrontOfficeDashboard.jsx:87-102`) is a client-side `wa.me` deep link only — it writes nothing to Firestore. It is not an account-provisioning path.

### 3.5 Data read inventory

Front Office reads run through `useDashboardData({ restrictedRead: true, … })`.

| Collection | Query constraints | Bounded? | Evidence |
|---|---|---|---|
| `users` (Courses) | `role in ["student","instructor","parent"]` + `branchId ==`, **no division filter** | Listener, unbounded in division | `useDashboardData.js:258-276` |
| `users` (Kindergarten) | 3 split listeners: students + `division=="kindergarten"`; instructors + role set + `division=="kindergarten"`; parents by role+branch | Listener, bounded | `useDashboardData.js:187-256` |
| `classes` | `branchId ==` (+ division for K) | Listener | `:278-294` |
| `applications` | `branchId ==` (+ division for K) | Listener | `:296-312` |
| `todos` | `branchId in [branchId, "all"]` | Listener | `:314-333` |
| `invites` | `branchId ==` | Listener | `:334-344` |
| `shifts` (own) | `userId ==` + `limit(30)`, one-time get | Bounded | `FrontOfficeReportsTab.jsx:66` → `shiftsRepository.js:85` |
| `approvals` (pending count) | `status == "pending"` + role + branch, **no `limit()`** | Listener; only subscribes when a leader role is passed | `FrontOfficeDashboard.jsx:366` → `approvalsRepository.js:57`, `:75-77` |

**Two read-cost defects found in this inventory:**

- **`invites` is listened to and never consumed.** Neither dashboard destructures `invites` from the hook — the destructuring blocks end at `myBranch` (`FrontOfficeDashboard.jsx:61-85`, `KidsFrontOfficeDashboard.jsx:51-74`). Every open Front Office dashboard pays for a collection listener whose result is discarded (F-14).
- **The `approvals` count listener is unbounded** (`approvalsRepository.js:57`, `:75-77`). For a plain `frontoffice` user the hook returns early and subscribes to nothing (`usePendingApprovalsCount.js:18-19`, `:42`); but `FrontOfficeDashboard.jsx:366` passes `"ops_lead"` whenever `isLeader` is true, so a manager or admin — who cannot legitimately reach this dashboard via routing — would subscribe to the Operations Lead queue (F-08).

The Courses `users` listener intentionally omits the division filter, with an explicit in-code rationale: *"Courses Front Office: do not add division server filter until backfill (R5) is done"* (`useDashboardData.js:267`). This is a **known, deferred data-scope gap**, not an oversight — but it is still open (see F-07).

---

## 4. Governance conformance matrix

Blueprint §6.9 establishes six responsibilities: walk-in inquiries, online inquiries, placement-test scheduling, student enrollment handling, tuition-fee collection, parent communications. §6.9 also states the mandatory naming boundary. Reporting line: §5.3 line 292 places Front Office under the Operational Leader.

| # | Established responsibility (Blueprint §6.9) | Implemented surface | Conforms? | Evidence |
|---|---|---|---|---|
| 1 | Walk-in inquiries | `inquiries` tab → `WalkInInquiryTab` | **YES** | `FrontOfficeDashboard.jsx:382-393` |
| 2 | Online inquiries | `deskInquiriesRepository` (source-tagged) | **YES** | `deskInquiriesRepository.js` |
| 3 | Placement-test scheduling | `PlacementTestModal`, fluency tier, override parking | **YES** | `PlacementTestModal.jsx`; override parked per `regression-log.md:250-255` |
| 4 | Student enrollment handling | `applications`, `students`, `addUser` tabs | **YES** (but see F-01 delete) | `FrontOfficeDashboard.jsx:394-509` |
| 5 | Tuition-fee collection | `cashier` tab → `PaymentCashierTab` | **PARTIAL** — collection works; the reconciliation control that makes it auditable is unreachable (**F-02**) | `PaymentCashierTab.jsx:143-147` |
| 6 | Parent communications | `StudentRoster canViewParents={true}`, WhatsApp receipt/share actions | **YES** | `FrontOfficeDashboard.jsx:424`; `PaymentCashierTab.jsx:137` |

| Governance rule | Assessment | Evidence |
|---|---|---|
| §6.9 mandatory boundary — "Front Office / Admin is not the technical System Admin role" | **CONFORMS.** Front Office has no admin portal, no role-assignment UI, no rules access. | `firestore.rules:522-540`, `:497-506` |
| Principle 2 (authority before menus) | **CONFORMS at the rules layer.** Client role checks are presentation only; rules re-evaluate the real profile. | `ApprovalInbox.jsx` reads no profile; `firestore.rules:863-884` **[rules text only]** |
| Principle 3 (backend enforcement) | **CONFORMS.** Hiding is not load-bearing — evidenced by `BatchModal` writes being refused for Front Office by the `classes` rule allow-list. | `owner-decisions.md:78-81` |
| Principle 5 (least necessary authority) | **DIVERGES** — permanent delete of student/parent records (**F-01**) | `usersRepository.js:227-251`; `firestore.rules:521` |
| Principle 6 (separation of duties) | **DIVERGES** — delete has no checker; the gate that should cover it is not wired (**F-01**, F-06) | `approvalGates.js` `STUDENT_WITHDRAWAL_OR_FREEZE` has no producer |
| Principle 7 (auditability) | **DIVERGES** — the cash reconciliation record that would evidence a shift is unreachable (**F-02**) | `FrontDeskCashReconcile.jsx:182` |
| §24 (role card before detailed permissions) | **GAP — no Front Office role card exists.** §24 requires identity, responsibilities, authority, data scope, capabilities, prohibited actions, approval authority, workflow participation, then dashboard access — *in that order*. | Blueprint §24 line 1254-1305; no Front Office role card found in `docs/governance/` |
| §11.2/§11.3 (no accidental org-wide access; branch scope ≠ branch-wide authority) | **CONFORMS** — all reads branch-scoped; fail-closed when no branch resolves | `useDashboardData.js:170-174`; `FrontOfficeDashboard.jsx:512-530` |
| §18 normal vs sensitive financial action | **CONFORMS** — ordinary collection is direct and envelope-free, as G-009 requires | Blueprint G-009 line 1357 |

**G-007 / G-009 financial treatment — assessment of the proposed refinement's framing.** The proposal suggested keeping "discounts, refunds, corrections, and reconciliation discrepancies behind their approved workflows." That is correct and already governed: G-009 restricts discounts and refunds to the executive layer, and ordinary tuition collection is explicitly *exempt* from approval envelopes (*"Routine tuition collections executed directly without approval envelopes"* — Blueprint line 1357). No change is needed here, and an implementer must **not** add envelopes to ordinary collection.

### 4.1 Reconciliation of prior audits against current code

| Prior finding | Prior claim | Status today | Evidence |
|---|---|---|---|
| 3.1 Corporate events panel | Misplaced | **STILL TRUE** | `FrontOfficeDashboard.jsx:442-446` |
| 3.2 Student hard-delete | Restricted to Admin | **STILL TRUE** — now elevated to F-01 (S1) | `:419`; `usersRepository.js:228` |
| 3.3 AI Assistant panel | No operational need | **STILL TRUE** | `FrontOfficeDashboard.jsx:490`; `KidsFrontOfficeDashboard.jsx:377` |
| 3.4 Institutional analytics bleed | Privacy leak | **PARTLY INCORRECT — downgraded** (F-05) | `ReportsDashboard.jsx:24-25`, `:125`, `:172`, `:265`, `:296` |
| 4.1 Shift closing unwired | Unreachable | **STILL TRUE — extended** (F-02, two breaks) | `FrontDeskCashReconcile.jsx:182`; `kioskScanProcessor.js:546-548` |
| 4.2 No shift widget on Overview | Missing | **STILL TRUE** | no `shift`/`clock` in `FrontOfficeDashboard.jsx` |
| 4.3 Kids lacks approvals tab | Missing | **STILL TRUE** | Kids tabs `:278-395` |
| 4.4 No quick student search | Missing | Not re-verified in this phase | — |
| 4.5 No receipt view/print | Missing | Not re-verified in this phase | — |
| Login: profile-read expression budget | Fixed and live | **CLOSED** | `2026-10-01-front-office-login-audit.md:417-443` |
| Login: `front_office` alias | Latent concern | **STILL OPEN** (F-09) | `roles.js:39` vs `firestore.rules:62-68` |
| Login: pending promotions | Uninvestigated | **STILL OPEN** (F-09) | `:567-587` |
| Dashboard split: `manager` case | — | **CLEAN** — `!isManager ? FrontOfficeDashboard : …` | `CrossDivDashboard.jsx:188-192` |

**New in this audit, not previously recorded:** F-11 (`currentLevel` write paths), F-12 (missing Kids enrollment guard), F-13 (application-delete affordance vs. rules), F-14 (unused `invites` listener).

---

## 5. Findings

Severity: **S1** = authority/separation-of-duties or data-loss exposure · **S2** = control ineffective or divergence from ratified governance · **S3** = UX/consistency/drift.

### F-01 — Front Office holds an unconstrained permanent delete over student and parent records (S1)

**Evidence.** `StudentRoster` renders its delete affordance whenever a `handleDelete` prop is supplied and `readOnly` is false (`StudentRoster.jsx:515`, `:539`; `readOnly` defaults false at `:40`). Both Front Office dashboards supply it and do not set `readOnly`:

- `FrontOfficeDashboard.jsx:419` → `handleDelete={handleDelete}`
- `KidsFrontOfficeDashboard.jsx:331` → `handleDelete={handleDelete}`

`handleDelete` (`useDashboardData.js:617-642`) calls `deleteUserProfile(uid, branchId)` (`usersRepository.js:186`), which **hard-deletes** and cascades in one batch:

- `:228` `batch.delete(doc(db, "users", uid))` — the profile itself
- `:235` strips the student from class `studentIds` / `enrollments`
- `:245` unlinks the parent

Firestore rules explicitly permit it: `allow delete: if isFrontDeskStaff() && resource.data.role in ['student','parent'] && isSameBranch(resource.data) && …` (`firestore.rules:521`) **[rules text only]**. `isFrontDeskStaff()` is `['frontoffice']` only (`firestore.rules:78-84`).

**Why this is S1.** Blueprint §17 lists *"deletion of important business records"* as a candidate sensitive action (line 1100). §26 G-006 classifies `STUDENT_WITHDRAWAL_OR_FREEZE` as a **Domain Operations (Level 1)** gated action, and G-007 assigns its approval to the **Division Manager** (line 1355). The repository's own prior audit already classified this as a violation (`2026-09-24-front-office-local-audit.md:38`), and its remediation recommendation (`:64`, `:73`) was **never implemented**. The gap between a withdraw/freeze (a gated workflow) and a record delete (ungated, irreversible, no envelope, no tombstone) is currently unbridged: a Front Office user can achieve the *effect* of a withdrawal by deleting, without ever touching the gate.

**Not established:** whether production rules behave as written, given the expression-budget hazard. This finding should be confirmed by an emulator test before remediation is scoped.

### F-02 — The cash-reconciliation control is unreachable, and it is broken in two places, not one (S2)

The prior audit recorded one break (`2026-09-24-front-office-local-audit.md:48`). This audit found **two independent breaks**, and the second was not previously recorded.

**Break 1 — the prop is never supplied.** `FrontDeskCashReconcile` requires a truthy `activeShift` to render its control: `{activeShift && ( … "End Shift & Count Drawer" … )}` (`FrontDeskCashReconcile.jsx:182`, label `:188`), with a hard modal guard at `ShiftReconciliationModal.jsx:65`. `activeShift` is declared with a `null` default at `FrontDeskCashReconcile.jsx:32` and `FrontOfficeReportsTab.jsx:31`. Its two call sites pass:

| Call site | `activeShift` passed? |
|---|---|
| `PaymentCashierTab.jsx:143-147` | **No** |
| `FrontOfficeReportsTab.jsx:170-176` | Passes it through — but its own caller does not supply it |

And `FrontOfficeReportsTab`'s callers (`FrontOfficeDashboard.jsx:451-454`, `OpsLeadDashboard.jsx:257-260`) pass only `myBranch` and `students`. **No call site anywhere in the repository assigns `activeShift` a non-null value.** The resolver that exists — `fetchOpenShiftFor(uid, branchId)` (`shiftsRepository.js:63-72`) — has exactly one caller, `kioskScanProcessor.js:389`, which is the badge-scan flow, not a dashboard.

**Break 2 — the staff kiosk bypasses reconciliation entirely.** `kioskScanProcessor.js:546-548` closes an open shift via `kioskClockOutWithProof(...)` then `clockOutShift(openShift.id)` — the plain clock-out, which writes no `cashReconciliation`. Every staff-facing kiosk in the dashboards is `studentsOnly={true}` (`FrontOfficeDashboard.jsx:550`, `KidsFrontOfficeDashboard.jsx:443`, `InstructorDashboard.jsx:146`, `InstructorLeaderDashboard.jsx:302`, `KidsInstructorDashboard.jsx:163`), so the only staff clock-in/out station is the standalone `/kiosk/staff` route (`StandaloneKioskPage.jsx:119-133`), which also routes to the plain clock-out.

**Consequence.** A Front Office cashier can start and end a shift without ever being asked to count the drawer. The `CASH_DISCREPANCY` gate exists (`approvalGates.js:191-210`) and the reconciliation writer exists (`shiftsRepository.js:432-498`, envelope at `:479`) — but the human path that reaches it does not. The control is present in code and absent in operation.

**Secondary.** Neither dashboard renders any shift status, clock-in time, or clock-out action on Overview. The nearest equivalent is manager-only (`ManagerOverview.jsx:90`). A desk cashier cannot see from their own dashboard whether a drawer is currently their responsibility.

**Cost of any remediation:** `fetchOpenShiftFor` is a one-time `getDocs` with **no listener and no `limit()`** (`shiftsRepository.js:68-70`). Wiring it in adds zero listener cost but would be an unbounded query in principle; a `limit(1)` should accompany the change. Today the Overview and Cashier tabs incur **zero** shift-lookup reads.

### F-03 — Blueprint G-007 grants approval authority to `frontoffice`; the implementation grants it only to `opslead` (S2 — **needs an owner decision**)

**The governing text.** Blueprint §26 G-007 (line 1355) assigns three gates to *"Operations Lead / Front Office (`opslead`, `frontoffice`)"*:

- `CLASS_CANCELLATION_OR_RESCHEDULE`
- `RETROACTIVE_STUDENT_ATTENDANCE`
- `STUDENT_CLASS_TRANSFER`

`docs/specs/authorization-contract.md:58-59` keeps the two roles distinct (`frontoffice` = "Reception & Cashier"; `opslead` = "Front Desk Operations Lead"), and G-007 names both as approvers of the same three gates.

**The implementation.** `APPROVAL_ROLES` has no Front Office member at all (`approvalGates.js:21-28`). All three gates are `approverRole: OPS_LEAD` with `eligibleApproverRoles: [OPS_LEAD]`:

| Gate | Line | `eligibleApproverRoles` | Mode |
|---|---|---|---|
| `CLASS_CANCELLATION_OR_RESCHEDULE` | `:303-316` | `[OPS_LEAD]` `:308-310` | `LOGGED` `:311` |
| `RETROACTIVE_STUDENT_ATTENDANCE` | `:323-336` | `[OPS_LEAD]` `:328-330` | `BLOCKING` `:331` |
| `STUDENT_CLASS_TRANSFER` | `:341-354` | `[OPS_LEAD]` `:346-348` | `BLOCKING` `:349` |

The divergence is consistent across every layer, so it is **not** a normalization defect that a missing alias would fix:

| Layer | Treatment of `frontoffice` | Evidence |
|---|---|---|
| Gate registry | absent from `APPROVAL_ROLES` | `approvalGates.js:21-28` |
| Eligibility helper | `case OPS_LEAD: … return normalized === "opslead"`; no `frontoffice` case → `default: return false` | `:806-811` |
| Role normalization | `front_office → frontoffice`; nothing maps `frontoffice → opslead` | `roles.js:30-40` |
| Queue query | `where("approverRole","==","frontoffice")` — matches no envelope these gates produce | `approvalsRepository.js:69-72` |
| Rules: create | `gateAllowsApprover` permits only `'opslead' \|\| 'ops_lead'` for these gates | `firestore.rules:209-211`, `:861-862` **[rules text only]** |
| Rules: decide | `isApproverForDoc` has a `frontoffice` clause (`:222`) that `:884` makes unreachable for a decision | `firestore.rules:216-229`, `:883-884` **[rules text only]** |
| Rules: consume | Only `RETROACTIVE_STUDENT_ATTENDANCE` has a consuming clause, pinned to `'opslead' \|\| 'ops_lead'` | `firestore.rules:360-375` **[rules text only]** |

**A second, sharper consequence.** Because `CLASS_CANCELLATION_OR_RESCHEDULE` is `LOGGED`, a Front Office user's cancellation *applies immediately* while the envelope is still pending (`approvalGates.js:825` — `isActionOperational` returns true regardless of status; `BatchModal.jsx:273-294` files the envelope then writes the class). A `LOGGED` mode is *correct as designed* for this gate per an owner-ratified decision (`docs/reports/instructor-leader-dashboard/owner-decisions.md:55`, `:71`) — it is an audit trail, not a block. But combined with the `frontoffice`-cannot-approve divergence, a branch whose Front Office acts as its operational desk can cancel a class and leave the envelope permanently undecidable by anyone except an `opslead`. **No separation-of-duties violation is created** (a `frontoffice` maker cannot self-approve — it cannot approve at all: `ApprovalInbox.jsx:77-80`, `:421-444`; `firestore.rules:864`), but the audit trail can terminate in an empty queue.

**This is a governance question, not an implementation defect, and it is the blocker for Phase 1.**

### F-04 — The Approvals tab is unreachable for every role that can currently log in (S2, consequence of F-03)

`FrontOfficeDashboard` renders `approvals` only when `isLeader` (`:457`), and `isLeader` (`:358-364`) is true for `opslead`/`ops_lead`/`frontofficelead`/`front_office_lead`/`manager`/`admin` — **never for plain `frontoffice`**.

But `App.jsx:587-593` routes the entire `opslead` family to `OpsLeadDashboard`, which has its own approvals tab (`OpsLeadDashboard.jsx:154-166`). And `manager`/`admin` route elsewhere (`App.jsx:550-570`).

**Therefore no login reaches `FrontOfficeDashboard` with `isLeader === true`, and the Approvals tab at `:457-473` is dead code.** The component still carries a `usePendingApprovalsCount("ops_lead", …)` call at `:366` that runs for every Front Office user and will always resolve empty. This is stale legacy from before the Operational Leader dashboard split; it should be recorded as drift, not silently deleted, since removing it is a Phase 1+ decision.

### F-05 — Prior finding 3.4 is partly incorrect and must be downgraded (S3 — prior audit corrected)

The prior audit asserted that mounting `ReportsDashboard` in Kids Front Office *"exposes instructor punctuality ratings, school-wide staff duty rosters, and institutional admission data to front desk personnel"* (`2026-09-24-front-office-local-audit.md:40`).

**Verified against current code, that is partly wrong:**

- **Instructor punctuality is correctly gated.** The sub-tab, and its panel, are wrapped in `{!isFrontOffice && (…)}` (`ReportsDashboard.jsx:172`, `:296`). Kids Front Office passes `isFrontOffice={true}` (`KidsFrontOfficeDashboard.jsx:358`), so it **cannot see or reach** instructor punctuality. ✔ not a leak
- **Financial reports are correctly gated.** The finance sub-tab and panel require `isActualAdmin || isExecutiveView || isManager` (`:129`, `:265`), and `isActualAdmin` is false when `isFrontOffice` is true (`:24`). ✔ not a leak
- **"School-wide staff duty rosters" is inaccurate.** `isSupervisor` is false for Front Office (`:25`), so the staff sub-tab renders as **"My Duty Log"** (`:125`) — the user's own records. ✔ not a leak
- **Admissions is intentional.** The comment at `:156` labels it *"Admin, Executive, Manager, Front Office"*. ✔ by design

**What remains genuinely open in F-5** is narrower and different from the prior claim: the **CSV export button is rendered unconditionally** (`ReportsDashboard.jsx:91-97`) with no supervisor check, and the two dashboards are inconsistent about which reporting surface Front Office gets. Blueprint §17 lists *"broad data exports"* as a candidate sensitive action (line 1101). The export's blast radius is bounded by whichever sub-tab is active and by that sub-tab's own scoping — but the button's presence is not itself role-gated, and unlike the Courses dashboard, Kids Front Office is not on the privacy-isolated `FrontOfficeReportsTab` at all. Recommend recording as an **export-scope review**, not as the privacy leak previously claimed.

**Action:** the prior audit's finding 3.4 should be annotated as partially superseded. This audit does not edit an archived audit; the correction is recorded here.

### F-06 — Two mis-scoped dashboard surfaces remain (S3)

Both were flagged on 2026-09-24 and both remain:

1. **Corporate events management on a reception desk.** `events` tab → `CorporateEventsPanel` (`FrontOfficeDashboard.jsx:442-446`). Prior assessment: B2B corporate contract creation, audience targeting, and contract cancellation do not belong to Front Desk (`2026-09-24-front-office-local-audit.md:37`).
2. **AI Assistant on the reception shell.** `aiAssistant` tab on both dashboards (`FrontOfficeDashboard.jsx:490`, `KidsFrontOfficeDashboard.jsx:377`). Prior assessment: no defined operational requirement on the primary reception desk.

Neither is an authority violation — these are presentation-scope questions. No Blueprint clause was found that either authorizes or prohibits them; they are **not** covered by §6.9's six responsibilities. Classified S3 deliberately.

### F-07 — Known, deferred division-scope gap on the Courses read path (S2, tracked — deliberately open)

`useDashboardData.js:258-276` reads `users` for Courses Front Office with `role in ["student","instructor","parent"]` + `branchId ==`, and **no division filter**, with an explicit code comment deferring it until the R5 backfill completes (`:267`). The same deferral applies to `classes` (`:285`) and `applications` (`:303`).

**Assessment: correctly handled for now, but it is an open data-scope gap, not a closed one.** The rationale is sound — adding the filter before backfill would hide legacy records without a `division` field (`docs/plans/archive/kindergarten-division-scope-revision-plan.md:106`, `:130`). But `docs/specs/authorization-contract.md:58` states Front Office *"must be bound to a specific division or explicit cross-divisional scope,"* and the Kindergarten path already enforces it (`useDashboardData.js:187-256`). **Courses Front Office therefore reads across both divisions within its branch today.** Recorded as an open reconciliation item with its dependency named; it must not be closed silently and must not be "fixed" before the backfill.

### F-08 — Stale leader role handling in `FrontOfficeDashboard` (S3)

`isLeader` still accepts `"manager"` and `"admin"` (`FrontOfficeDashboard.jsx:363-364`), and the Approvals tab hard-codes `userRole="ops_lead"` (`:465`). Given `App.jsx:550-593`, neither `manager`, `admin`, nor any `opslead` alias can reach this component. Per `roles.js:34-36`, App.jsx already normalizes `ops_lead` and `frontofficelead` to `opslead` before passing `role`, so four of the six `isLeader` spellings are doubly unreachable.

**Why this is worth recording rather than deleting:** the component accepts a `role` prop and trusts it for its leadership decision. Today that prop is always `"frontoffice"`. If any future call site passes a normalized role, this dead branch silently becomes live and would render an approvals inbox claiming `ops_lead` authority. **Do not widen; record and reconcile in Phase 1.**

### F-09 — Two prior open items remain unresolved (S2/S3, carried forward)

1. **`front_office` alias has no rules counterpart.** `roles.js:39` normalizes `front_office → frontoffice`, so the dashboard renders; `firestore.rules` `isFrontOffice()` (line 62-68) does not include `front_office`, so listeners would be denied. The prior audit downgraded this from *root cause* to *latent legacy-data concern* after the real cause proved to be an expression-budget failure (`2026-10-01-front-office-login-audit.md:333-341`) — **but it was never closed.** It remains a real failure mode for any legacy profile carrying `front_office`.
2. **`PENDING_PROMOTIONS_PERMISSION_FAILURE` — separate and uninvestigated.** Recorded at `2026-10-01-front-office-login-audit.md:567-587`; no closure evidence found. Explicitly classified there as *"SEPARATE / UNINVESTIGATED"* and *"should not be fixed by broadening permissions without a separate query/rule audit."* Still open.

### F-10 — `RETROACTIVE_STUDENT_ATTENDANCE` has no UI producer reachable by Front Office (S3, tracked divergence)

`regression-log.md:298-299` states plainly: *"The retroactive-attendance gate has **no UI producer**, so its end-to-end user path was not exercised."* G-007 assigns this gate to Front Office / Operations Lead; the rules enforcement was armed on 2026-10-08 (`owner-decisions.md:221-236`). A ratified Front Office responsibility therefore has a working control but no way for the role to exercise it. Classified as a tracked divergence per the Option C decision recorded in `owner-decisions.md:201`.

### F-11 — Front Office can write `currentLevel` directly, bypassing the `PLACEMENT_LEVEL_OVERRIDE` gate (S2)

This is a **pre-existing gap already recorded** in `docs/reports/instructor-leader-dashboard/owner-decisions.md:87`, reached independently here from the Front Office dashboard surface. It is restated because it is material to a Front Office authority audit and because the refinement proposal's own stated goal — *"do not add new business powers just to make the screen more convenient"* — applies to a power that already exists.

**Two ways it is reachable.**

1. **Promote from the roster.** `StudentRoster` wires `onPromote={readOnly ? null : handlePromote}` (`StudentRoster.jsx:510`, `:534`); `readOnly` defaults to `false` (`:40`) and **neither dashboard passes it**. The promote control renders when `pendingPromotion && !readOnly && nextLevel` (`StudentRosterTable.jsx:409`). `handlePromote` calls `promoteStudentLevel(student.id, nextLevel, report?.id)` (`StudentRoster.jsx:224`), which writes the student document directly: `updateDoc(studentRef, { currentLevel: nextLevel, rating: …, updatedAt: … })` (`progressReportsRepository.js:65-69`). Firestore rules permit it for Front Office — `allow update, delete: if isExecutive() || ((isManager() || isFrontOffice()) && isSameBranch(…) && isDivisionAllowedForManager(…))` (`firestore.rules:912`) **[rules text only]**.
2. **On the ordinary student record.** The Front Office student-update allow-list includes both `level` and `currentLevel` (`firestore.rules:554`) **[rules text only]**, so a level writes on the student document outside the promotion path.

**Why it matters.** The `PLACEMENT_LEVEL_OVERRIDE` gate is `BLOCKING` (`approvalGates.js:268-278`) and was the subject of a ratified, implemented enforcement effort (ENF2, `regression-log.md:250-257`). The enforcement was built on the `deskInquiries` document — `placementLevelAllowed(inquiryId, …)` and a parked `pendingPlacementOverride` — and `regression-log.md:266` records that the enrollment read paths in `FrontOfficeDashboard`, `KidsFrontOfficeDashboard`, `WalkInTable` and `PlacementTestModal` were *"unchanged by design."* **The `users` document was not gated.** The same role that must obtain the Instructor Leader's approval to override a level on a walk-in inquiry can set that student's level directly on the roster.

**Feasibility warning, carried from the existing record.** `owner-decisions.md:87` states plainly that gating this *"is **not** a small additive change"*: legitimate writers include promotions, batch/class-level sync (`classesRepository.js:36`), and registration. Closing it requires a product decision about which level changes are **authoritative** (a completed promotion) versus **overrides**. **This audit agrees and does not propose a mechanism.**

### F-12 — Kindergarten Front Office is missing the pending-override enrollment guard (S2)

The Courses dashboard blocks enrollment while a placement-level override is awaiting the Instructor Leader:

```js
// FrontOfficeDashboard.jsx:108-114
if (inquiry.pendingPlacementOverride) { toast(`${…} has a placement level override awaiting the Instructor Leader's approval. Enrollment is on hold until it is decided.`, "error"); return; }
```

`KidsFrontOfficeDashboard.handleEnrollProspect` (`:98-133`) has **no such guard**. It reads `inquiry.currentLevel` and falls through to a default level (`:103-111`) before calling `handleAddStudent` (`:113`).

**Consequence.** In the Kindergarten division, a walk-in prospect with a parked override can be enrolled immediately using either the unapproved override level or the fluency-tier default — whichever `currentLevel` currently holds. This is precisely the outcome the ENF2 guard was written to prevent, and the guard was applied to only one of the two dashboards that perform enrollment. It sits on the placement-authority boundary the Instructor Leader owns (`approvalGates.js:268`, `eligibleApproverRoles: [INSTRUCTOR_LEADER]`).

**Mitigating detail, stated honestly:** kindergarten placement is treated specially in the ENF2 rules (`regression-log.md:267`, *"kindergarten inquiry level write with no score"*; `owner-decisions.md:119` records the same exemption as `|| the inquiry is kindergarten`). It is therefore possible that a Kindergarten override is deliberately never parked and the guard is unreachable in practice. **That was not established by this audit.** It must be confirmed before this finding is treated as exploitable — the check to run is whether `pendingPlacementOverride` can ever be truthy on a kindergarten inquiry.

### F-13 — Dead UI affordance: permanent application delete is shown but cannot succeed (S3, rules correctly deny)

`StudentApplications` renders a permanent-delete control on the Rejected tab. `readOnly` defaults to `false` (`StudentApplications.jsx:40`), **neither dashboard passes it**, and `handlePermanentDelete` (`:154`) calls `deleteApplicationPermanently` → `deleteDoc(doc(db, "applications", appId))` (`applicationsRepository.js:180`).

**Firestore rules correctly deny this for Front Office:** `allow delete: if isViceDirector() || isDirector();` (`firestore.rules:595`) **[rules text only]**. The failure surfaces as a toast (`StudentApplications.jsx:156-157`), not silently.

**Assessment — this is not a security finding, and it is important to say so.** It is recorded because it is the clearest available **positive control** for this audit: the rules hold against a destructive affordance the UI offers, which is the "hiding a button is not security" principle working as designed. The residual issue is presentational: Front Office is offered a destructive action that can never succeed. Note that this is **not** true of F-01, where the same class of affordance *is* permitted by rules.

### F-14 — An unused realtime listener on `invites` runs on every Front Office dashboard load (S3, read-cost)

`useDashboardData` opens a branch-scoped realtime listener on `invites` (`useDashboardData.js:334-344`). Neither dashboard destructures `invites` from the hook — the destructuring blocks end at `myBranch` (`FrontOfficeDashboard.jsx:61-85`, `KidsFrontOfficeDashboard.jsx:51-74`).

**Consequence.** Every open Front Office dashboard pays for a collection listener whose result is discarded. This is not a security exposure (the listener is branch-scoped and the rule is `isExecutive() || (isFrontOffice() && isSameBranchStrict(…))`, `firestore.rules:580`) **[rules text only]**. It is a **free-tier read-cost** finding, which this repository's instructions require be surfaced.

**Related read-cost observations, recorded but not classified as findings:**

- The `approvals` pending-count listener is unbounded — `[where("status","==","pending")]` plus role/branch, with **no `limit()`** (`approvalsRepository.js:57`, `:75-77`). For a plain `frontoffice` user the hook returns early and subscribes to nothing (`usePendingApprovalsCount.js:18-19`, `:42`) — but `FrontOfficeDashboard.jsx:366` passes `"ops_lead"` whenever `isLeader` is true, so a **manager or admin previewing this dashboard subscribes to the Operations Lead queue.** See F-08.
- The five `useDashboardData` listeners carry **no `limit()` and no date window** (`:225-344`). For Courses they are also unfiltered by division (F-07). Read cost therefore grows with total branch row count, not with screen size.

---

## 6. The decision required from the owner

**F-03 was the blocker, and it is now resolved.** OD-FO-1 (ratified 2026-10-10) selected Option A. The text below records the options as they were presented, for the decision trail.

| Option | Meaning | Consequence |
|---|---|---|
| **A — `opslead` only (codify the current implementation)** | The Front Office *role* is reception and cashiering; approval authority for these three gates sits with the Front Desk Operations Lead. G-007's `frontoffice` spelling is corrected to `opslead`. | **Lowest cost, no code change.** Requires a Blueprint amendment (§26 G-007) — an owner action, not an agent action. Preserves the current, working separation of duties. **RATIFIED 2026-10-10 as OD-FO-1 — this is the implemented outcome.** |
| **B — both roles (implement G-007 as ratified)** | Any `frontoffice` user may approve these three gates. | A **governance-consequential** widening of approval authority. Touches the gate registry, `canApproveGate`, the queue query, `gateAllowsApprover`/`isApproverForDoc` in `firestore.rules`, and the Approvals tab gating — with rules-test coverage. Interacts with the 1000-expression ceiling. |
| **C — both roles, but only where no `opslead` is posted** | Front Office may act as approver only when the branch has no Operations Lead. | Highest complexity; requires a new resolvable branch-state input and a rule-expressible predicate. Not recommended. |

**Recommendation: Option A.** It matches the organizational model already ratified (`authorization-contract.md:58-59` keeps the roles distinct), requires no new privilege, and the three gates remain owned by a role whose entire purpose is exactly this. Option B would grant approval authority that nothing in the current operation demonstrates a need for.

**A separate decision is needed for F-01**, independent of F-03: should Front Office retain the ability to permanently delete a student or parent record, or should deletion be an Admin-only technical operation while Front Office uses a status change (which is already a gated workflow, `STUDENT_WITHDRAWAL_OR_FREEZE`)? The prior audit recommended removing the prop. That recommendation was correct and is still unimplemented.

**A third decision is needed for F-11**, and it is the one with the largest downstream scope: **which `currentLevel` changes are authoritative, and which are overrides?** `PLACEMENT_LEVEL_OVERRIDE` is a `BLOCKING` gate owned by the Instructor Leader, but the level can also legitimately change through promotion, class/batch sync, and registration. Until the owner states which of those four paths is the authoritative one, the gate cannot be closed without breaking the other three — this is the same conclusion already recorded at `owner-decisions.md:87`, reached here from the Front Office side.

**Confirmed before Phase 1 (F-12 only, no decision needed):** determine whether `pendingPlacementOverride` can ever be truthy on a *kindergarten* inquiry. If it cannot, F-12 is latent rather than exploitable and should be recorded as such rather than fixed.

> **All three decisions in this section were ratified by the owner on 2026-10-10** — see
> [`owner-decisions.md`](./owner-decisions.md): **OD-FO-1** (F-03 → Option A), **OD-FO-2** (F-01 → remove
> Front Office hard delete), **OD-FO-3** (F-11 → authoritative promotions vs gated overrides). The text
> above is preserved as the decision trail. **OD-FO-3 did not settle F-11's enforcement**, which is why
> §11 E5 and [`03-phase3-brief.md`](./03-phase3-brief.md) carry it forward.

---

## 7. Proposed Phase 1 scope (not authorized by this audit)

Offered only as a scoped follow-up; **nothing here should begin before §6 is answered.** Ordered by risk.

| Step | Change | Risk class | Verification |
|---|---|---|---|
| 1 | Remove `handleDelete` from both dashboards (or gate it behind a real withdraw/freeze workflow) | **Auth-adjacent, rules-touching** | Emulator: Front Office delete denied, Admin delete allowed; roster renders without the affordance |
| 2 | Close or explicitly accept the `currentLevel` write paths (F-11) — **only after the §6 F-11 product decision** | **Auth, rules, and product-visible** | Emulator per write path (roster promote, class sync, registration, batch sync); regression on enrollment reads |
| 3 | Wire `activeShift` from `fetchOpenShiftFor` (add `limit(1)`), pass through `FrontOfficeReportsTab` → `FrontDeskCashReconcile`; decide whether `/kiosk/staff` must block the plain clock-out for cashiers | **Behavioural; closes a control gap** | Emulator + manual: shift → drawer count → variance → `CASH_DISCREPANCY` envelope |
| 4 | Resolve F-03 per the owner decision | **Governance + rules** | Rules tests for the chosen option; expression-budget measurement before and after |
| 5 | Port the pending-override enrollment guard to `KidsFrontOfficeDashboard.handleEnrollProspect` (F-12) — or record why Kindergarten is exempt | **Low, but on a placement-authority boundary** | Unit test: enrollment blocked while override pending; confirm kindergarten override reachability first |
| 6 | Retire the dead `approvals` tab and the `isLeader` legacy branches in `FrontOfficeDashboard` (F-04, F-08) | **Low — dead code** | Confirm no route reaches `isLeader === true`; unit test on the routing table |
| 7 | Suppress the permanent-delete affordance where rules deny it (F-13) | **Low — presentational** | Front Office sees no destructive control; Admin path unchanged |
| 8 | Drop the unused `invites` listener from the Front Office hook path (F-14); add `limit()` to the approvals count listener | **Low — read cost** | Assert listener count per dashboard load; Spark read-cost check |
| 9 | Align Kids reporting with Courses (adopt `FrontOfficeReportsTab`, or record why Kids differs) and review the unconditional CSV export (F-05) | **Low–medium** | Snapshot/behaviour test per role |
| 10 | Remove or justify `events` and `aiAssistant` tabs (F-06); replace hard-coded `branchLabel="Kota Gorontalo"` in Kids with `myBranch` | **Low** | Manual walkthrough; multi-branch check |

**Explicitly deferred (do not bundle):** F-07 (needs the R5 backfill first), F-09 (needs production diagnosis), F-10 (needs a product decision), and the F-11 *decision* (its implementation is step 2, but only after §6).

**Suggested first assignment for an executor — deliberately not a screen redesign:** step 1 (F-01). It is the highest-severity item, it is already scoped by a prior audit, and it is provable in the emulator. Fixing the boundary before touching the interface is the correct order.

---

## 8. Cost and free-tier assessment

No production-code or rules change was made, so this audit has **zero** Firestore cost impact. For the proposed Phase 1 steps:

- **Step 3 (shift lookup):** one additional one-time `getDocs` per dashboard mount. Today the Overview and Cashier tabs perform **no** shift lookup, so this is a net increase of one read per open-dashboard load. `fetchOpenShiftFor` currently has **no `limit()`** (`shiftsRepository.js:68-70`) — add `limit(1)` or the cost becomes proportional to the number of matching documents. No listener, no new index.
- **Step 8 (F-14) is a read-cost *reduction*, not an increase.** It removes one realtime collection listener (`invites`) that currently runs on every Front Office dashboard load and is discarded. At 10 concurrent desk dashboards that is 10 unnecessary listeners; at 1,000 it is 1,000. This is the single cheapest free-tier win in §7.
- **No step in §7 requires a new collection, index, scheduled job, or paid service.**
- The dashboard listeners themselves are **unchanged** and are the dominant read cost: five realtime listeners per open dashboard (`useDashboardData.js:225-344`), of which the Courses `users` listener is unbounded in division.

---

## 9. Limitations and what is NOT verified

Stated plainly, per this repository's reporting standard.

**Not verified — no command was run:**

0. **This section records the state at the time of the original audit. Two items are now superseded by the §11 errata pass** — F-01 (limitation 1's delete permission) is closed, and the typecheck failure noted in limitation 2 has been fixed in Phase 2. Both are marked here rather than silently rewritten.

1. **No rules test, and no emulator.** Every `firestore.rules` claim above is marked **[rules text only]**. Given the recorded 1000-expression-budget hazard (`regression-log.md:286-290`), rule *text* is not proof of rule *behaviour*. This matters most for **F-11** (`progressReports` and `users` `currentLevel` updates) and **F-13** (the `applications` delete denial) — both **must** be emulator-confirmed before remediation is scoped.
2. **No `npm test`, `npm run lint`, `npm run typecheck`, or `npm run build`.** This audit changed no source file, so there was nothing to regress — but this also means the current tree's test state was not independently confirmed by this audit. The most recent recorded run is `regression-log.md:279-285` (98 rules tests; 1,251 unit tests; lint/typecheck/build clean). *(Superseded: Phase 2 reports 1,261 unit tests passing and `typecheck` at 0 errors after resolving the `operationalResources.test.js` stub signature — see §11 E4.)*
3. **No production/deployed-state check.** Whether the deployed `firestore.rules` matches the repository is unverified; `regression-log.md:294-295` records that a rules deploy was not performed as of 2026-10-09.
4. **No browser walkthrough.** Every reachability claim is static analysis of JSX and call sites. F-02's "unreachable" conclusion rests on the absence of any `activeShift` assignment in `src/` — a whole-tree search, not a runtime observation. F-11 and F-13 rest on props (`readOnly`, `onPromote`, `onDeleteStudent`) being supplied, which is proven by the JSX but not exercised in a running app.
5. **F-12 is unresolved on purpose.** Whether `pendingPlacementOverride` can be truthy on a kindergarten inquiry was **not** established. The finding is recorded as conditional, not as exploitable.
6. **Prior findings 4.4 and 4.5 were not re-verified** (quick student search; receipt view/print). They are carried forward as unverified, not as confirmed.
7. **The unconditional CSV export (F-05) was not traced to its data source.** The export button's presence is proven; the exact result set written for a Front Office user was not.
8. **No audit of `deskInquiries` / placement-test write paths** beyond what `regression-log.md` already records. The ENF2 override parking and the `deskInquiries` create-level gap (`owner-decisions.md:88`) are referenced, not re-derived. F-11 was reached from the Front Office dashboard surface, and is consistent with — not a re-derivation of — `owner-decisions.md:87`.
9. **No live Firestore read-cost measurement.** The `invites` listener (F-14) is proven to be subscribed and proven not to be consumed; its actual billed read volume was not observed.

**Deliberately not done (out of Phase 0 scope):** no production code, no rules, no schemas, no tests, no index changes, no documentation edits outside this report. In particular, **no archived audit was edited** — the correction to prior finding 3.4 is recorded here (F-05) rather than by rewriting `docs/audits/archive/`.

---

## 10. Cross-references

- Prior audits reconciled here: [`2026-09-24-front-office-local-audit.md`](../../audits/archive/2026-09-24-front-office-local-audit.md), [`2026-10-01-front-office-login-audit.md`](../../audits/archive/2026-10-01-front-office-login-audit.md)
- Governance: [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) §6.9, §17, §18, §24, §26 G-007/G-009
- Contract: [`authorization-contract.md`](../../specs/authorization-contract.md)
- Architecture: [`ARCHITECTURE.md`](../../ARCHITECTURE.md) lines 156, 573
- Ratified gate-mode decisions affecting Front Office gates: [`owner-decisions.md`](../instructor-leader-dashboard/owner-decisions.md) §A1, §A2.1
- Verification record: [`regression-log.md`](../../audits/current/regression-log.md)
- Audit method: [`Comprehensive Hidden-Bug Audit Strategy`](../../audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/00-README.md) (Level 2 — the correct level for role-by-role dashboard refinement)

**Status: Phase 0 complete, no production changes.** Phase 1 on deletion (F-01) is complete — see §11 E1. The remaining work is blocked on **two** owner decisions in §6 — **F-03** (who may approve the three G-007 gates) and **F-11** (which `currentLevel` changes are authoritative). Nothing in §7 should begin before those are ratified, and **F-15** (§11) should be diagnosed first regardless.

See **§11 Errata** below: F-01 is now closed, and two new findings (F-15, F-16) were added after this audit.

---

## 11. Errata (post-audit verification pass)

Appended 2026-10-09 after an independent review pass. **No historical finding above has been rewritten or removed** — corrections are recorded here, per the Blueprint §27 / G-010 supersession protocol.

### E1 — F-01 is CLOSED (implemented and emulator-verified)

F-01 (Front Office permanent delete over student/parent records) was fixed in
[`01-phase1-completion-report.md`](./01-phase1-completion-report.md). Front Office no longer holds `delete`
at either layer; the `users` delete clause is Admin-only. Verified by `npm run test:rules` → 111 passed.

While implementing it, a **second defect was exposed that this audit had missed**: commit `7cf64a1`
had removed the Admin clause while leaving the Front Office clause, which left `isFrontDeskStaff` as
the **only** role able to delete user records and silently broke the Admin Staff Directory delete
button (`AdminDashboard.jsx:228` → `StaffDirectory.jsx:201`). The restored clause is the exact
pre-`7cf64a1` form. See that report §4 for detail and the one-line revert.

### E2 — F-03, F-11 and the rest of §7 remain open and unchanged

Nothing in this errata alters §6 or §7. **F-03 remains the blocker.** An independent review proposed
beginning a fresh Phase 0 audit; that is unnecessary — this document is that audit, and its remaining
items are listed in §7.

### E3 — F-11 is NOT closed by OD-FO-3: the policy is ratified, the enforcement is absent (**EMULATOR-PROVEN 2026-10-10**)

Commit `da49d2d` ("front office dahsboard refinement phase 2") marks F-11 **CLOSED** in
[`02-phase2-completion-report.md`](./02-phase2-completion-report.md) §4 with the note *"CLOSED (Clarified
in OD-FO-3)"*. `owner-decisions.md` OD-FO-3 does ratify a sound boundary — a promotion is authoritative
*"upon issuance"* from an instructor's progress-report evaluation, while placement overrides stay gated
by the Instructor Leader.

**But the ratified boundary is not implemented, so the bypass Phase 0 found is still live.** Verified on
the current working tree:

| Claim | Verified state | Evidence |
|---|---|---|
| F-11 closed | **NO** — the write path is unchanged | `firestore.rules:562-574` |
| Front Office immune to direct level writes | **NO** — `level` and `currentLevel` are still in the student-update allow-list for `isFrontDeskStaff()` | `firestore.rules:567` |
| Promotion is enforced as report-derived | **NO** — no rule references a report, `eligibleForPromotion`, `promotedAt`, or instructor approval for promotions | repo-wide search of `firestore.rules` for `eligibleForPromotion`/`isApprovedPromotion`/`promotedAt` → **zero matches** |
| The roster promotes to the report's level | **NO** — the level is derived from a **ladder**, not the report; `report` is used only to clear the eligibility flag | `StudentRoster.jsx:212` (`getNextLevel(student.currentLevel \|\| "warrior")`), `:224` (`promoteStudentLevel(student.id, nextLevel, report?.id)`), `progressReportsRepository.js:65-73` |

**Reading OD-FO-3 precisely.** The decision states the promotion path is authoritative *"recorded via
progress report evaluations by instructors"*, and that Front Office *"cannot unilaterally tamper with or
bypass placement determinations."* An API client is not the roster button. Anyone with the Front Office
token can `updateDoc` on a student document with `currentLevel` set to any value — the rules validate the
*shape* of a student update, never its *authority*. So the decision as written is **not** what the code
does, and the divergence is now a ratified-intent-vs-implementation gap rather than an open policy
question.

**What "closed" would actually require** — and this does not change OD-FO-3's substance, which this audit
agrees with:

1. Remove `level` and `currentLevel` from the `isFrontDeskStaff()` allow-list at `:567` (they may remain
   for `isManager()` only if that is separately intended).
2. Give the promotion write its own rules branch keyed on a marker proving an approved, unreplayed report
   — the same shape already used for `attendanceDateTs` (retroactive attendance, `firestore.rules:360-375`)
   and `isApprovedPlacementOverride`. There is an existing pattern to copy; this is not novel design.
3. Enumerate the other legitimate `currentLevel` writers before changing anything — class/batch sync
   (`classesRepository.js:36`), registration (`useDashboardData.js:392`, `:552`, `:583`), and promotion all
   touch the same field. This is the "not a small additive change" caution already recorded at
   `owner-decisions.md:87`, and it applies unchanged.

**Recommendation:** re-open F-11 in the Phase 2 report's findings table (a documentation edit for its
author, not made here), or record an explicit owner decision that the rule-level write is accepted as
ungated. Leaving a ratified policy marked "closed" while the bypass it describes remains reachable is the
one outcome that is not defensible.

#### E3.1 — Emulator confirmation (2026-10-10)

The bypass is no longer inferred from rule text. Three diagnostic tests were added to
`firestoreRules.emulator.test.js` and **all pass** (`npm run test:rules` → **114 passed, 0 failed**).
They are deliberately written green, documenting current behaviour, with the reasoning inline; a future
change that gates level writes must flip them to `assertFails`.

| Probe | Result |
|---|---|
| Front Office writes `currentLevel: "elite"` + `rating` on a same-branch student | **ALLOWED** |
| Front Office writes a non-canonical `currentLevel: "q"` | **ALLOWED** — nothing validates the value against `src/constants/levels.js` |
| Front Office writes the legacy `level: "Advanced"` field | **ALLOWED** |
| Manager writes `currentLevel` | **ALLOWED** — same allow-list branch, so this is not Front-Office-specific |
| Front Office writes `currentLevel` on **two seeded records** in sequence (the `syncStudentsCurrentLevel` fan-out shape) | **ALLOWED** |
| Cross-branch Front Office writes `currentLevel` | **DENIED** (scope still holds) |
| Kindergarten Front Office writes a Courses student's `currentLevel` | **DENIED** (division still holds) |

**The class-sync probe is the load-bearing result.** It confirms that a rule keyed solely on a promotion
marker would block the legitimate paths too, because `syncStudentsCurrentLevel`
(`classesRepository.js:34-38`) is indistinguishable from the bypass at the rules layer. This is the
concrete reason the two-marker design in §"What 'closed' would actually require" is required rather than
a single marker — see E5.

### E5 — F-11 remediation: why a promotion marker alone is insufficient, and the question that decides the fix

Added after the emulator confirmation above, because it changes what the fix has to be.

**The promotion proposal path exists and is real.** `eligibleForPromotion` is written by an
instructor-facing form — `StudentProgressForm.jsx:112` sets it from the "eligible for promotion"
checkbox — so `fetchPendingPromotions` (`progressReportsRepository.js:42`) is not dead code. The
in-app promotion workflow is a genuine, if thin, feature.

**But `currentLevel` is written from at least six independent paths**, and most are *class* operations
rather than promotions:

| Path | Call site | Shape |
|---|---|---|
| Roster promotion button | `StudentRoster.jsx:224` | 1 student |
| Roster → Transfer batch | `TransferModal.jsx:135` | 1 student |
| Classes → Enroll | `ClassManager.jsx:125` | 1 student |
| Available Batches → Enroll | `EnrollModal.jsx:110` | 1 student |
| Cohort group level change | `CohortRosterTable.jsx:146` | **whole cohort array** |
| Enrollment level sync | `classesRepository.js:214` | 1 student |

Every one issues the same `updateDoc(users/{id}, { currentLevel })`. **Rules see a payload, not an
intent** — which the class-sync probe above demonstrates empirically. Therefore:

- a rule requiring a promotion marker would block all four class-side paths, three of which write a
  single student and would break ordinary class management;
- closing the gap properly requires **two** markers: one proving an instructor's report authorised the
  promotion, and one proving the write originated from a class-level operation. The second is the hard
  one, precisely because class operations legitimately touch one student at a time.

This corroborates the existing caution at `owner-decisions.md:87` (*"not a small additive change"*) with
direct evidence, and it is why this audit no longer frames F-11 as a one-line rules fix.

**The question that decides the remedy:**

> **Is the in-app promotion workflow in operational use — do instructors actually file progress reports
> that Front Office then promotes from?**

| Answer | Remedy | Cost |
|---|---|---|
| **No** | The bypass *is* the only working path. Remove `level` and `currentLevel` from the Front Office allow-list outright, and resolve the class-side sync separately. No marker needed. | **Low** — one rules edit + test flips |
| **Yes** | The two-marker design. Scope as its own task with its own Phase 0; do not bundle into cleanup. | **High** — schema addition, multiple writers, migration question |

**Recommendation, stated plainly:** answer that question first, then act. Given class-level sync appears
to be the dominant real-world flow for a school of this size, the low-cost remedy is the more likely
correct one — but asserting that without knowing whether instructors file promotion reports would be
substituting a guess for a decision.

### E4 — Phase 2 changes spot-verified: two confirmed sound, one stale note corrected

Verified while reviewing commit `da49d2d`. These are **confirmations, not findings** — the work is correct.

1. **F-14 (unused `invites` listener) is safe.** The `if (!restrictedRead)` guard suppresses the listener
   for Front Office without breaking Admin: `AdminDashboard.jsx` calls
   `useDashboardData({ setActiveTab: handleTabChange })` with **no `restrictedRead`**, so its invites
   listener is retained. The fix is correct as reported.
2. **The pre-existing typecheck failure is fixed.** This audit's §9 limitation 2 and the Phase 1 report §7
   both recorded 3 × `TS2554` errors at `operationalResources.test.js:568-570` from a zero-parameter
   `canDeletePayment()` stub. Phase 2 corrected the signature. **Those two notes are now stale** and
   `npm run typecheck` reports 0 errors. The underlying observation stands: a green test suite coexisted
   with a red typecheck for an unknown period, and nothing gated on it.
3. **F-02's `limit(1)` and `activeShift` wiring** are present (`shiftsRepository.js`,
   `PaymentCashierTab.jsx:53-58`, `:172`). Full acceptance of F-02 needs the end-to-end drawer-count path
   exercised, which this pass did not do — see §9 limitation 4.

---

### F-15 — A failed inquiry save is reported to staff as a successful save that is "safely stored" (S1 — **new, not previously recorded**)

**This is the most serious finding in this document.** Phase 0's inventory listed the local-inquiry
fallback (§3.4, "Create walk-in inquiry, park a placement override — **Yes**") without examining what
the fallback *tells the user*. That was a gap in this audit.

**The mechanism.** `createDeskInquiry` does not throw on a permission denial — it converts the failure
into a **success-shaped return value**:

```js
// deskInquiriesRepository.js:100-103
if (isPermissionError(err)) {
  const localRecord = saveLocalInquiry(validated);
  return { ...localRecord, _permissionDenied: true };
}
```

The caller branches on that flag — but shows a **success** toast in the failure branch and then routes
the prospect into enrolment:

```js
// WalkInInquiryTab.jsx:303-314  — this is the FAILURE branch
if (savedInquiry._permissionDenied) {
  setHasPermission(false);
  …
  if (enrollImmediately && onEnrollStudent) {
    toast("Prospect saved locally! Opening Student Registration form...", "success");   // :310
    onEnrollStudent(savedInquiry);                                                       // :311
  } else {
    toast("Prospect saved locally! Deploy firestore.rules to enable cloud sync.", "warning"); // :313
  }
}
```

The `"success"` variant fires exactly when a parent is standing at the desk asking to enrol. The
`"warning"` variant — the only one that hints at a problem — fires only when enrolment was *not*
requested.

**The banner compounds it.** When the desk has lost write access, this is what the staff member reads:

```js
// WalkInInquiryTab.jsx:436-437
or update your Firebase Console. Walk-in visitors logged now are safely stored in your
local session and can be immediately enrolled as students.
```

*"Safely stored"* and *"can be immediately enrolled"* are both false claims of durability. The banner
also instructs staff to run a deployment command, which is not a Front Office action under any
governance document.

**The codebase already knows the rule it is breaking.** The same file implements the correct
behaviour for placement tests, with an explicit comment stating the principle:

```js
// deskInquiriesRepository.js:220-225
if (inquiryId.startsWith("local-")) {
  updateLocalInquiry(inquiryId, pendingUpdate);
} else {
  // No local-shadow fallback here on purpose: a governed action must never appear
  // to have succeeded when the rules refused it.
  await updateDoc(doc(db, "deskInquiries", inquiryId), pendingUpdate);
}
```

**This makes F-15 an inconsistency bug, not a design decision.** The repository's own authors
articulated the correct rule for one governed action and then violated it on inquiry creation and
inquiry conversion. The comment at `:223-224` is the finding's own specification.

**Blast radius — four producers, one consumer.**

| Producer | `_permissionDenied` returned | Consumer handles it? |
|---|---|---|
| `createDeskInquiry` (`:102`) | Yes | `WalkInInquiryTab.jsx:303` — **handled, but as success** |
| `updateDeskInquiryStatus` (`:133`) | Yes | **No consumer** |
| `addPlacementTestToInquiry` (`:262`) | Yes | **No consumer** |
| `markInquiryConverted` (`:359`) | Yes | **No consumer** — `useDashboardData.js:412` ignores the flag |

For `markInquiryConverted`: the caller wraps it in a `try/catch` that only reacts to a **throw**
(`useDashboardData.js:410-416`), but the permission-denied path **returns rather than throws**. So when
a conversion fails on permissions, the student is created, no warning is shown, and the inquiry is
silently left unconverted — the exact reconciliation break the ENF work was built to prevent.

**Severity justification (S1).** Two ratified concerns intersect:

- Blueprint §17 lists *"deletion of important business records"* and *"broad data exports"* as candidate
  sensitive actions, and Principle 7 requires auditability. Business data that exists only in one
  browser, behind a message promising it is safely stored, is neither auditable nor durable.
- Blueprint §18 / G-009 govern money. A prospect who "enrolled" from a local-only record can be
  recorded as a student and take a payment while the originating inquiry has no server-side record —
  producing a payment whose supporting intake document does not exist centrally.

**Not established:** whether production currently reaches this path at all. It requires
`deskInquiries` writes to be denied by rules. The banner exists precisely because that was once true
(`2026-10-01-front-office-login-audit.md` §16 records a live `users-staff` denial in this area), and no
closure evidence for `deskInquiries` specifically was found. **The first task is to determine whether
the fallback is currently live in production, not to fix it.** If writes succeed, F-15 is latent — but
the misleading copy and the three unhandled producers are real regardless.

### F-16 — Prospect and parent PII persists in browser storage with no retention or logout cleanup (S2 — **new, not previously recorded**)

**Mechanism.** Local inquiries are written to `window.localStorage` under a single key:

- Key: `myliberty_desk_inquiries_local_v1` — `walkInUtils.js:38`
- Fields persisted (`DeskInquiryItem`, `walkInUtils.js:43-58`): `parentName`, `studentName`, `phone`,
  `dob`, `ageOrGrade`, `notes`, plus `placementTests` (which carries placement scores and assessed
  levels, i.e. academic records about a child).
- Write sites: `walkInUtils.js:130`, `:157`, `:174`

**Findings.**

1. **No expiry and no retention bound.** Entries persist until individually deleted or the browser
   storage is cleared. There is no TTL, no cap, and no "older than N days" rule.
2. **No logout or account-change cleanup.** The only `removeItem` in the codebase for this key is in a
   **test** (`WalkInInquiryTab.test.js:72`). No production path clears it on sign-out or when a
   different staff member signs in at the same desk.
3. **Shared-reception exposure.** A Front Office PC is routinely shared between shifts. Prospect names,
   parent names, phone numbers, dates of birth, notes, and children's placement-test results survive
   logout and are readable by the next user of that machine — and by any script running on the same
   origin.
4. **Sibling precedent worth noting:** `DevQuickSwitcher.jsx:75` purges its own stale credential from
   `localStorage` on mount. The repository is aware of the pattern elsewhere; this cache has no such
   handling.

**Governance.** Blueprint Principle 5 (least necessary authority) and Principle 7 (auditability) both
bear on this, and §11.2 (no accidental organization-wide access) is engaged by persistence beyond the
session. No Blueprint clause was found that authorizes or prohibits an offline desk cache, so this is
**not** a governance conflict — it is an **undocumented data-retention practice**, which is exactly why
the independent review's recommendation to *document a policy rather than remove the fallback* is the
right instinct.

**Not established:** whether staff operationally depend on the fallback. Removing it before knowing that
would be a real service risk, so **no removal is proposed here.**

### F-17 — Local-only inquiries are invisible to every consumer except the Front Office tab (S3 — **new**)

Local records are readable **only** through `getLocalInquiries()`, called from `WalkInInquiryTab.jsx`
(`:218`, `:245`). Nothing else in the application reads the local cache: the Manager dashboard, the
Operational Leader dashboard, reporting surfaces, and the Executive views read `deskInquiries` via
`fetchRecentDeskInquiries` (`deskInquiriesRepository.js:30`), which queries Firestore only.

**Consequence.** A prospect captured while writes were denied appears in the Front Office tab and
**nowhere else**. The role accountable for desk performance (Operational Leader, Blueprint §6.8) and the
Division Manager responsible for `STUDENT_WITHDRAWAL_OR_FREEZE` and `TUITION_PLAN_CHANGE` see no record
of that prospect existing. Local records are also never reconciled upward — there is no sync, retry, or
promotion path from `localStorage` to Firestore anywhere in the repository.

This is the "single source of truth" concern the independent review raised, confirmed as a concrete
divergence rather than a theoretical one.

### F-15/F-16/F-17 — scoped remediation (NOT authorized; listed for a decision)

Deliberately ordered so that the cheapest, highest-value change comes first. **Nothing here should
start before the §6 decisions, and F-15's first step is diagnostic, not a fix.**

| Step | Change | Risk | Verification |
|---|---|---|---|
| 0 | **Determine whether `deskInquiries` writes are currently denied in production.** If they are not, F-15 is latent and only the copy (step 2) is urgent. | None — diagnostic | Inspect the deployed rules; confirm `deskInquiries` create/update paths |
| 1 | **Make failure unmistakable.** Stop returning a success-shaped object: throw, or return a discriminated result that every caller must handle. Align all four producers with the existing `:223-224` precedent. | Low–medium; touches the tab and `useDashboardData` | Unit: a denied write produces a failure state and **no** success toast; enrolment is not offered from a record that failed to persist |
| 2 | **Fix the copy.** Remove "safely stored" and "can be immediately enrolled"; replace the deploy instruction with a plain "not saved to the school system — tell the Operational Leader" message. | Very low | Copy review |
| 3 | **Handle the three unhandled producers** (`updateDeskInquiryStatus`, `addPlacementTestToInquiry`, `markInquiryConverted`). | Low | Unit tests per producer, following the ENF2 pattern |
| 4 | **Make local-only records visible as such** — an explicit "NOT SAVED" badge, and a count surfaced to the Operational Leader. | Low–medium | Snapshot test; confirm the leader surface is read-only |
| 5 | **Publish a minimal offline-data policy** (fields retained, TTL, logout clearing, shared-station handling) and implement the retention bound it states. | Low | Policy reviewed by the owner; unit test on the TTL/clear path |

**Explicitly not proposed:** removing the offline fallback (dependency unproven), adding a sync/retry
queue (new architecture, unbounded cost, and it would need its own conflict rules), and any change to
`firestore.rules`. No step introduces a new collection, index, listener, or paid service.
