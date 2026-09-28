---
title: Cross-Feature Integration Audit — Report (Pass 1)
type: audit-report
status: active
created: 2026-09-28
audited_input: myliberty-portal.zip (uploaded 2026-09-28; docs timestamps 07:29–07:33, dist build 07:34)
prompt_used: docs/audit-prompts/cross-feature-integration-audit.md
---

# MyLiberty Portal — Cross-Feature Integration Audit (Pass 1)

> **Read this first.** This is a static code review by an AI auditor, done on the uploaded zip because the auditor had no network access to GitHub. Nothing was run: no emulator, no E2E, no build. "Confirmed" below means *confirmed by reading the code/rules*, not by running them. Everything is a **starting position for the executing agent to test and argue with**, including severities and proposed directions. Line numbers refer to the zip; **locate by function/file name** in case `main` has moved. Please confirm the zip matches the commit you are working from.

## 0. Coverage — what was and wasn't examined

| Depth | What |
|---|---|
| **Deep** | `firestore.rules` (full read), attendance (kiosk → classAttendance / attendance → reports → parent), staff invites/signup, shifts/kiosk staff clock-in, staff leave, todos/directives, role handling, parent dashboard queries, student delete/archive, payment write path |
| **Partial** | Front Office → admission, corporate events (rules + kiosk matching only), progress reports, outreach (repo-level only) |
| **Not examined** | Cloudflare worker (`cloudflare-worker/worker.js` — this is what creates `applications`, since rules say `create: false`), class **transfer** flow (`TransferModal`), Marketing/Office Boy dashboards beyond the todo hook, `ARCHITECTURE.md` drift in detail, `materials` collection consumers, whether `kioskClockInWithProof` is wired to any UI |
| **Never done** | Any runtime/emulator verification (see §7 for the test list that would settle the "Likely" items) |

Workflows 1 (Student) and 9 (Outreach) are therefore only partly traced; the map in §5 marks them honestly.

---

## 1. Bottom line (answers to the prompt's Final Questions)

**Q1 — One coherent system?** Mostly yes at the module level, with three real seams: (a) **two attendance systems that don't meet** (INT-001), (b) **role meanings that differ between rules and UI** (INT-005, INT-018), (c) **queries that are broader than the rules that guard them** (INT-002, INT-017). Several handoffs are genuinely solid (§4 "Verified working"), notably staff invites, payment write atomicity, class-roster removal, and shift-correction consumption.

**Q2 — Biggest operational risks.** INT-001 (reports silently exclude every class-matched scan), INT-002 (staff directives widget likely broken or leaking, per branch), INT-004 (owner confirmed reception scans staff badges as Front Office; the rules block the user and open-shift lookups it needs), INT-017 (parent dashboard may show "no classes/attendance" because of a query/rule shape mismatch, with errors swallowed).

**Q3 — Fix before adding features.** The three "Likely/needs runtime" items above (they decide whether core screens work at all), then INT-001, then role normalization (INT-005).

**Q4 — Needs emulator/E2E.** INT-002, INT-004, INT-017, INT-008, INT-011, plus the delete path in INT-007 for non-Kota-Gorontalo branches. Concrete test list in §7.

**Q5 — Smallest remediation sequence.** §6.

---

## 2. Root causes (deduplicated)

| ID | Root cause | Workflows touched | Findings |
|---|---|---|---|
| **RC-1** | Two attendance stores: `classAttendance` (per class) and `attendance` (daily campus check-in). A student scan that matches a class writes only the first; reports read only the second. | Attendance, Student, Parent, Reports | INT-001, INT-008 |
| **RC-2** | List queries broader than the branch rule that guards them. `isSameBranch` (lenient, has a "no branch fields → Kota Gorontalo" fallback) is still used for list-type reads on `users`, `classes`, `applications`, `attendance`, `todos`, `shifts`, `staffLeave`; only `payments`, `deskInquiries`, `visits` use `isSameBranchStrict` for list. **Confirms/extends prior V-01/F-05.** | Todos, Staff/HR, Parent, Class | INT-002, INT-004, INT-009, INT-013, INT-017 |
| **RC-3** | Role semantics differ by layer. Rules treat `instructorleader`/`instructor_leader` like an instructor; six client paths only accept `role === "instructor"`. "Kids" roles are not roles at all — they are `manager`/`frontoffice`/`instructor` + `division: "kindergarten"`, and rules never look at `division`. | Staff/HR, Class, Attendance, Kids | INT-005, INT-015, INT-018 |
| **RC-4** | One fact stored in two places, or one word meaning two things. Leave = `staffLeave` records **and** `users.status == "on_leave"`; `"all"` = "everyone" (assignee) **and** "all branches" (branch). | Staff/HR, Todos | INT-003, INT-006 |
| **RC-5** | Delete/archive does not follow the data. | Student, Parent, Finance, Attendance | INT-007, INT-008 |
| **RC-6** | "Today" defined two ways (WITA helper vs UTC `toISOString().slice(0,10)`). | Leave, Class, Enrollment | INT-014 |

---

## 3. Findings

Severity per the prompt's table. "Status" = Confirmed (read in code) / Likely / Needs runtime verification. Each finding ends with a **Proposed direction** that is deliberately non-binding, and a **Prior-audit check**.

### 3.1 CONFIRMED INCONSISTENCIES

#### INT-005 — Instructor Leader is an instructor in the rules, not in the UI
**Severity:** Medium (High if leaders actually teach classes — owner to confirm) · **Workflow:** Staff/HR, Class, Attendance · **Status:** Confirmed · **Root cause:** RC-3
**In plain words:** The database treats an "instructor leader" as a teacher; several screens don't.
**Feature A (rules):** `canManageClassAttendance`, `isAssignedToClass`, `isTrackedShiftRole`, `classAttendance`/`progressReports` gates all accept `instructor`, `instructorleader`, `instructor_leader`.
**Feature B (client):** only `role === "instructor"` is accepted at:
- `features/attendance/kioskScanProcessor.js` ~L293 (clock-in), ~L417 and ~L433 (clock-out). A leader who teaches gets clocked in as **General Duty / event**, not against their class; their class-based punctuality never happens.
- `features/dashboard/ManagerDashboard.jsx` ~L393, `dashboard/kids/KidsManagerDashboard.jsx` ~L237, `dashboard/manager/ClassesAndCoverageTab.jsx` ~L14 (`instructor` or `admin` = "active instructor"). A class assigned to a leader is flagged as having no active instructor (false alarm), and leaders are absent from assignable lists built this way.
- `features/dashboard/useDashboardData.js` ~L551 (`role === "instructor"` only).
- `features/staff/StaffDirectory.jsx` ~L127 (the "you're deactivating an instructor with live batches" warning skips leaders).
**Also:** `frontoffice` has four spellings in rules (`frontoffice`, `opslead`, `ops_lead`, `frontofficelead`) and leader has two — App.jsx handles the aliases; other files compare single strings.
**User impact:** Instructor Leader: wrong shift type, no class punctuality, class flagged "no instructor", no warning when they resign.
**Proposed direction (open):** one shared role helper (e.g. `isInstructorRole(role)`, `isFrontOfficeRole(role)`) mirroring the rules' lists, used everywhere; a unit test that compares the helper lists to the rules' lists (parse `firestore.rules`) so they can't drift. Alternative: normalize role strings once at login and store one canonical spelling.
**Prior-audit check:** New. Not in any earlier audit I read.

#### INT-003 — Academy-wide todos exist only in the rules, and `"all"` means two things
**Severity:** Medium · **Workflow:** Todo · **Status:** Confirmed · **Root cause:** RC-4
**In plain words:** The rules allow "all-branch" directives, but the app can never create one; and the word "all" is used for two different ideas.
**Evidence:** `features/staff/todosRepository.js` `createTodo` always writes a concrete `branch`/`branchId` (never `"all"`). `firestore.rules` `todos`: manager/front office may only create with `isSameBranch(request.resource.data)` (false for `"all"`), so only admin could. `TasksPanel.jsx` ~L389–390 renders two `<option value="all">` ("All Targets" and "Everyone"), so "Everyone" can't be filtered on separately. `assignee: "all"` (everyone in scope) vs `branchId: "all"` (all branches).
**User impact:** A manager cannot send an academy-wide message; the branch scope rules that supposedly support it are dead. Filter dropdown has a duplicate.
**Proposed direction (open):** decide whether academy-wide directives are wanted (Q7). If yes: admin-only "All branches" toggle that writes `branchId: "all"`, and rename one of the two meanings. If no: remove the `"all"` branch clauses from the rules to shrink the surface.
**Prior-audit check:** Extends reconciled audit §11 ("explicitly scoped / verify query coverage").

#### INT-010 — Receipt numbers repeat, and the duplicate-payment guard is defeated by them
**Severity:** Medium · **Workflow:** Finance · **Status:** Confirmed · **Root cause:** (payment integrity)
**In plain words:** The app has duplicate-payment protection, but its "key" changes on every tap, so it can't catch a double-tap.
**Evidence:** `features/finance/PaymentModal.jsx` L149 `receiptNo = \`ML-${Date.now().toString().slice(-6)}\`` is built **inside the submit handler**; L190 `idempotencyKey: idem_${student.id}_${receiptNo}`; L226 `recordPayment(student.id, paymentRecord)`. `paymentsRepository.recordPayment` (L128–185) does honor a key (deterministic doc ID + atomic batch), but each tap makes a new key. The last-6-digits-of-milliseconds receipt repeats about every 16.7 minutes and across students.
**User impact:** A double-tap can create two payments and two receipts; receipt number isn't a reliable lookup key (the repo comments say receipts are looked up by it).
**Proposed direction (open):** generate the key once per modal open (or per "form state"), not per click, and disable the button while in flight (keyword search of `PaymentModal.jsx` found no disabled/in-flight flag — check by eye). For receipt numbers, consider a counter doc or a date+branch+random suffix.
**Prior-audit check:** **Extends F-01**. The mechanism F-01 asked for now exists but is not effective.

#### INT-009 — Any manager/front office user can edit any corporate event
**Severity:** Medium · **Workflow:** Corporate Event · **Status:** Confirmed · **Root cause:** RC-2
**Evidence:** `firestore.rules` `corporateEvents` `update` checks only the **new** `audienceType/audienceValue`, never `resource.data`, and has no field allow-list. So a Bone Bolango front office user can update a Kota Gorontalo event (e.g., switch it to `audienceType: "all"` or change its date). Also, `role`/`division` events are readable by all staff of every branch, and the role/division targeting is **only enforced client-side** by `corporateEvents.js findMatchingCorporateEvents`.
**User impact:** Cross-branch tampering is possible with a modified client; event visibility rules don't match the audience model the UI implies.
**Proposed direction (open):** add a `resource.data` branch check to `update` (mirror `create`), and decide whether role/division events should carry a `branchId`.
**Prior-audit check:** New (reconciled audit §10 says corporate events are "explicitly scoped" — true for read/create, not update).

#### INT-013 — Progress reports: no branch check, and the readers don't match the writers
**Severity:** Medium · **Workflow:** Student → Progress/Reporting · **Status:** Confirmed (rules); impact Likely
**Evidence:** `firestore.rules` `progressReports`: `read` = admin, **any** manager, **any** front office (no branch condition), or `instructorId == uid`; `create` requires `classes/{classId}.instructorId == uid` (so a substitute or a class reassigned mid-term can't write; a new instructor can't read the previous instructor's reports); `update/delete` = admin or any front office. Students/parents can't read reports at all, and `ParentDashboard` doesn't display them.
**User impact:** Cross-branch reads by managers/front office; instructor changes hide history; parents never see progress.
**Proposed direction (open):** add `branchId` to reports and a Strict list rule; allow reads by the class's current instructor(s); decide whether parents should see reports (Q9).
**Prior-audit check:** New.

#### INT-014 — "Today" is UTC in several places, WITA elsewhere
**Severity:** Low · **Workflow:** Leave, Class enrollment/transfer · **Status:** Confirmed · **Root cause:** RC-6
**Evidence:** `new Date().toISOString().slice(0, 10)` (UTC date) at `attendance/StaffLeaveModal.jsx` L19; `classes/BatchCard.jsx` L35/49/54; `classes/EnrollModal.jsx` L86; `classes/TransferModal.jsx` L31/117/127; `classes/ClassManager.jsx` L120; `students/StudentProgressForm.jsx` L36. The kiosk and payments use `todayWita()` (`utils/dateWita.js`).
**User impact:** Between 00:00 and 08:00 WITA these screens stamp *yesterday's* date (enrollment date, transfer date, default leave start).
**Proposed direction (open):** replace with `todayWita()`; add a lint rule/grep test banning `toISOString().slice(0, 10)` for "today".
**Prior-audit check:** New.

### 3.2 CONFIRMED MISSING INTEGRATIONS

#### INT-001 — Class-matched scans never reach the reports
**Severity:** High · **Workflow:** Attendance → Reports · **Status:** Confirmed (static; confirm the early-return branch at runtime) · **Root cause:** RC-1
**In plain words:** When a student scans and the app finds their class, it saves attendance in one place; the manager/front office/admin reports read a different place.
**Feature A:** `features/attendance/kioskScanProcessor.js` student branch (~L120–180): `resolveStudentClass` → `recordClassAttendanceScan` (writes `classAttendance`) → **`return`**. Only students with **no** matching class fall through to `recordStudentAttendance` (~L225; writes `attendance`).
**Feature B:** `features/reports/reportsRepository.js` L84 and L167 query only `attendance`. Consumers of `classAttendance` are only `InstructorAttendanceView`, `parentPortalRepository` (parent dashboard) and the kiosk itself.
**Broken link:** Scan → `classAttendance` → *(nothing)* → Reports. Manual corrections and close-out ABSENT/CLOSE_OUT records also live only in `classAttendance`.
**User impact:** Manager/Front Office/Admin attendance numbers exclude every class-matched scan (i.e. most scans) and every instructor correction; instructors and parents see different numbers than staff reports.
**Proposed direction (open):** Option A — reports read `classAttendance` for class attendance and keep `attendance` only for "campus presence" (rename in UI). Option B — the class scan also writes/updates a daily `attendance` row. Option C — retire `attendance` for students. The auditor leans A (one source of truth per fact) but the executor should check `resolveStudentClass` and the report tabs (`TodayTab`, `LearnerProgressTab`, Front Office reports) before choosing; note `attendance` docs are also used for corporate-event student check-ins (`eventId`).
**Prior-audit check:** New. Reconciled audit §6 ("class attendance state is stronger") is right about the class path but did not look at the report side.

#### INT-006 — Staff leave is a disconnected record
**Severity:** Medium · **Workflow:** Staff/HR · **Status:** Confirmed · **Root cause:** RC-4
**In plain words:** Leave gets logged, but nothing acts on it, and there is no request/approval step.
**Evidence:** `staffLeave` is written by `logStaffLeave` (`shiftsRepository.js` ~L503), hard-coded `status: "approved"`; rules `create` = admin only and status must be `"approved"`. The only UI is `StaffLeaveModal` inside `reports/tabs/StaffDutyTab.jsx`. Leave records are read only by that same report (`reportsRepository` + `ScheduledLeavesList`). The kiosk's "On Leave" behavior uses a different fact, `users.status === "on_leave"` (set manually in `StaffDirectory` via `updateStaffStatus`).
**User impact:** Logging leave doesn't change kiosk behavior, class coverage, or staff status; the prompt's "Leave → Approval → Availability" chain does not exist in code.
**Proposed direction (open):** decide the intended model (Q5): (a) keep it as a log (rename and document), (b) derive "on leave today" from `staffLeave` and drop the manual status, or (c) add a request/approval flow through the existing `approvals` collection.
**Prior-audit check:** New.

#### INT-007 — Deleting a student leaves dependents behind (and one stale-snapshot batch)
**Severity:** Medium · **Workflow:** Student/Parent/Finance/Attendance · **Status:** Confirmed · **Root cause:** RC-5
**Evidence:** `features/dashboard/usersRepository.js` `deleteUserProfile` (L173): batch-deletes `users/{uid}` and scrubs `classes.studentIds/enrollments`. It does **not** touch parents' `childStudentIds`, `classAttendance`, `attendance`, `payments`, `progressReports`. (`ParentDashboard` silently skips a child whose doc is gone, so parents just see a missing child; payments/attendance become orphans.) Also the class list is read with `getDocs` *outside* the batch, then overwritten with filtered arrays: a concurrent roster change in between is lost — the same pattern **F-02** fixed for `removeStudentFromClass` (now a `runTransaction`, verified).
**Runtime note:** the `classes where studentIds array-contains uid` query has no branch filter; for non-Kota-Gorontalo front office it may be rejected under RC-2 (Needs runtime verification).
**User impact:** Dangling links and orphan rows; occasional lost roster edit.
**Proposed direction (open):** prefer status-based archiving (`inactive`/`graduated` already exist) and restrict hard delete to admin, or write an explicit orphan policy (keep payments/attendance intentionally, clean parent links). Use a transaction for the roster scrub.
**Prior-audit check:** Extends F-02 to a second call site.

#### INT-012 — Outreach doesn't feed admissions
**Severity:** Low · **Workflow:** Outreach · **Status:** Confirmed (may be by design)
**Evidence:** `dashboard/marketing/schoolOutreachRepository.js` ~L386 stores only a `leadsCollected` number on visits; no `applicationId`/`inquiryId`/`studentId` anywhere in that repo. Nothing downstream reads outreach.
**User impact:** Outreach is a record-keeping tool, not a funnel; you can't tell which visit produced which student.
**Proposed direction (open):** confirm intent (Q8). If a funnel is wanted, add a `sourceVisitId` on `deskInquiries`/applications.
**Prior-audit check:** Consistent with `outreach-manager-marketing-remediation-plan.md` (plan, not implemented behavior).

#### INT-018 — Kids School vs Courses is a UI boundary only
**Severity:** Medium · **Workflow:** Kids School (all) · **Status:** Confirmed · **Root cause:** RC-3
**Evidence:** `App.jsx` (~L470–500) picks `KidsManagerDashboard`/`KidsFrontOfficeDashboard`/`KidsInstructorDashboard` when `division === "kindergarten"`. `firestore.rules` contains no reference to `division`/kids. `StaffSignup` writes `division` from the invite (verified), and the kiosk uses it (weekend closure), but rules don't.
**User impact:** A Kids manager and a Courses manager in the same branch have identical data access; hiding is cosmetic.
**Proposed direction (open):** decide whether a rules-level wall is required (Q6). If yes, add `division` to classes/students and to Strict predicates; if no, document it as intentional.
**Prior-audit check:** Extends F-06 (Kids Manager report mode).

### 3.3 CONFIRMED CONFLICTING BUSINESS LOGIC

#### INT-015 — General Duty: fallback differs for instructors and non-instructors
**Severity:** Medium (needs owner decision) · **Workflow:** Staff/HR, Corporate Event · **Status:** Confirmed
**Answering the prompt's specific questions:**
- **Label difference only?** Yes. The stored values are `classId: "general"` + `className: "General Duty"` (from `kioskScanProcessor.js` ~L383–391); `shiftsRepository.js` contains **no** "General Duty" literal (it defaults `classId = "general"`, `className = ""`). `ShiftAdjustmentModal.jsx` L117 shows "General Duty" and `ManagerOverview.jsx` L205 shows "School General Duty" only when `className` is empty. **Nothing downstream matches on either string**; `StaffDutyTab` only text-searches `className`. So the prompt's mention of `shiftsRepository.js` as a place with the literal string is inaccurate (see §3.6).
- **Instructor "already implemented" claim:** In current code it is **not** implemented. Instructors (role exactly `"instructor"`) with no class today and no matching event get a hard stop, "No Class Scheduled" (~L296–330 region). Only non-instructor staff, and instructor leaders (see INT-005), reach General Duty.
- Ambiguous events (>1 match) fall back to General Duty for non-instructors, matching `CorporateEventsPanel.jsx` L296's note; an instructor with no class today who hits the same >1-match case ends at the hard stop above instead.
**User impact:** An instructor on a non-teaching day can't clock in at all unless an event matches; leaders can.
**Proposed direction (open):** decide the rule (Q3). Either give instructors the same fallback or document the hard stop. Use `classId === "general"` (not the label) if anything ever needs to match it.
**Prior-audit check:** Resolves the ambiguity in the prompt; confirms the earlier "already implemented" claim was inaccurate for instructors at this commit.

#### INT-019 — Shift-correction approval binds the shift, not the values
**Severity:** Low · **Workflow:** Staff/HR · **Status:** Confirmed
**Evidence:** rules `isApprovedShiftCorrection` checks `approval.payload.shiftId == shiftId`, status, and `applied != true`, but not that the new `clockIn/clockOut` equal `approval.payload.afterData`. The honest client reads the values from the payload (`applyApprovedShiftCorrection`), a modified client could write different times under the same approval.
**Proposed direction (open):** compare the two fields in the rule, or accept as a known limit of maker-checker on a client-only architecture.
**Prior-audit check:** New, minor.

### 3.4 LIKELY ISSUES REQUIRING RUNTIME TESTING

#### INT-002 — Staff directives widget uses an unfiltered todos query
**Severity:** High · **Workflow:** Todo → Dashboard visibility · **Status:** Likely (query shape confirmed in code; outcome needs the emulator) · **Root cause:** RC-2
**In plain words:** The staff "directives" box asks Firestore for *all* todos. Depending on the branch, that either leaks other branches' tasks or gets rejected and shows an empty box.
**Evidence:** `features/staff/useStaffDirectives.js` L21 `onSnapshot(collection(db, "todos"))`, then filters by `assignee` only (never branch). Used by `InstructorDashboard` L82, `kids/KidsInstructorDashboard` L84, `MarketingDashboard` L159, `OfficeBoyDashboard` L46. `todos` read rule uses lenient `isSameBranch`. By the rules' own comment (L~50–60): an unfiltered list query looks like a branchless document, which the fallback treats as Kota Gorontalo.
**Likely outcomes:** Kota Gorontalo staff: query allowed, every branch's directives visible (leak). Other branches: whole query rejected, error only `console.error`'d, widget empty ("no directives").
**Contrast:** Manager/Kids Manager (`where("branchId","==",…)`) are scoped correctly; `useDashboardData.js` ~L160–168 leaves the query unfiltered only when `branch` is unset/`"all"` (admin path).
**Proposed direction (open):** scoped query `where("branchId","==", myBranchId)` (+ a second query for academy-wide if INT-003 keeps it), merged client-side; switch `todos` `list` to Strict while keeping `get` lenient for legacy docs. Add emulator tests first.
**Prior-audit check:** **Contradicts** reconciled audit §11's "explicitly scoped" for this path; extends **V-01/F-05**.

#### INT-004 — Reception (Front Office) staff scans are blocked by read rules at two steps
**Severity:** High · **Workflow:** Staff/HR (clock-in/out) · **Status:** Likely, high confidence (both denials read directly in `firestore.rules`; needs one runtime check, and confirmation that the *deployed* rules match the repo) · **Root cause:** RC-2 / RC-3 (the rules were written for an Admin kiosk and only half-extended to Front Office)
**Owner-confirmed setup:** the staff kiosk was originally an Admin function; Admin is now the directive account (owner, director, vice director), so **Front Office is signed in on the reception computer and scans staff badges** (`/kiosk/staff`). The rules' write side matches this (Front Office may create/close shifts for tracked roles in its branch). The read side does not.
**In plain words:** the reception account is allowed to *write* a shift but not to *look up* the person or their open shift first, and the scan does both lookups before writing.
**Step 1 — user lookup.** `kioskScanProcessor.handleKioskScan` → `fetchUserById` → `getDoc(users/{scannedUid})`. `firestore.rules` `users` `get` lets Front Office (via `isStaff()`) read only docs whose role is `student`, `instructor`, `instructorleader`, `instructor_leader` or `parent`, same branch. **Marketing, Office Boy, other Front Office, Manager and Admin docs are not readable.** The error is caught in `useKioskScanner.js` (~L224–232) and shown as "Scanner Error: <permission message>". Result: only instructor badges get past step 1.
**Step 2 — open-shift lookup.** `shiftsRepository.fetchOpenShiftFor(uid)` runs `shifts where userId == uid and clockOut == null`. `shifts` `read` allows Admin, same-branch Manager, or the shift's own user; **Front Office is not listed.** This runs for every staff scan (and for clock-out), so even instructors fail here.
**Not checked but same pattern:** `fetchInstructorClasses` (unfiltered `classes` list → RC-2 for non-Kota-Gorontalo branches), `switchClassAtomic` (may read the shift inside a transaction).
**Tests don't cover it:** `firestoreRules.emulator.test.js` "shifts kiosk flow" tests only Front Office *writes*. `securityRulesMatrix.test.js` is a pure JavaScript re-implementation of the rules ("Pure logic simulation", 0 calls to the emulator) so it cannot detect a mismatch between the app's queries and the real rules (see also V-02).
**User impact:** if the deployed rules equal the repo's, no staff member can clock in or out at reception as Front Office; Admin/directive login is the only working path.
**One-minute check for the owner:** on the reception PC signed in as Front Office, open `/kiosk/staff` and scan a Marketing or Office Boy badge. "Scanner Error … insufficient permissions" confirms it. Also open Firebase Console → Firestore → Rules and compare with `firestore.rules` in the repo (rules are not deployed by the GitHub workflows in `.github/workflows`, which only cover Hosting and Playwright, so they may differ).
**Proposed direction (open, executor should argue):**
- **A. Extend the rules.** Let Front Office `get` same-branch staff user docs and read same-branch `shifts` (Strict for list). Smallest change; but it applies to *every* Front Office account on *any* device, and exposes staff profile fields (phone, dob, etc.) to all Front Office users.
- **B. Resolve scans server-side.** The Cloudflare worker already has Firestore access and a kiosk challenge endpoint; return only the minimum (display name, role, status, branch, open shift). Least exposure, but more work; `kioskClockInWithProof` is only wired for the "pending class" clock-in (`useKioskScanner.js` ~L84, ~L117), not for the main scan path.
- **C. Dedicated kiosk account.** A narrow `kiosk` role (or Firebase account) for the reception PC with exactly these permissions, so a personal Front Office login isn't the kiosk's identity. Also stops kiosk attendance depending on whoever last logged in.
The auditor's mild lean: A as a stop-gap, B or C if the exposure of staff profiles to all Front Office users is not acceptable to the owner. Decision is the owner's and the executor's.
**Prior-audit check:** New. Extends V-01/V-02 (lenient vs strict, and thin rule tests).

#### INT-017 — Parent dashboard queries don't match the shape of the parent rules
**Severity:** Medium · **Workflow:** Parent · **Status:** Needs runtime verification
**Evidence:** `students/parentPortalRepository.js` ~L130–150: `classes where studentIds array-contains childId and status == "open"` while the rule proves access with `studentIds.hasAny(userProfile().childStudentIds)`; and `classAttendance where studentId == childId order by attendanceDate desc` vs `isParentOf(resource.data.studentId)`. Firestore's rules engine sometimes cannot prove such queries safe. Both calls are wrapped in `try/catch` with `console.warn`, so a rejection shows as an empty state. Indexes for both exist (`firestore.indexes.json`).
**User impact:** Parents may see "no classes/attendance" even though data exists.
**Proposed direction (open):** write the emulator test first; if rejected, query by a shape the rule can prove (e.g. `where("studentIds","array-contains-any", childStudentIds)` or a per-child rule form) and surface errors in the UI instead of an empty state.
**Prior-audit check:** New (reconciled audit §7 verifies the auth-only lookup but not query provability).

#### INT-008 — Inactive/graduated students can stay on rosters and receive ABSENT close-out records
**Severity:** Medium · **Workflow:** Class → Attendance · **Status:** Likely
**Evidence:** `students/StudentRoster.jsx` ~L78–100 only *offers* to remove a student from cohorts when status becomes inactive/graduated (operator can decline). `attendance/classAttendanceRepository.js` `closeOutClassAttendance` (L251–348) creates ABSENT/CLOSE_OUT records "for enrolled students who have no record"; no status filter was found. The kiosk already blocks inactive/graduated passes.
**User impact:** Attendance reports for a class accumulate ABSENTs for people who left; seats stay occupied.
**Proposed direction (open):** filter close-out by student status, or make the roster removal mandatory with the status change. Verify with a test.
**Prior-audit check:** New.

#### INT-011 — A walk-in inquiry can be marked "enrolled" without recording which student
**Severity:** Medium · **Workflow:** Front Office → Admission · **Status:** Likely
**Evidence:** `dashboard/useDashboardData.js` ~L247 calls `markInquiryConverted(inquiryId, studentId)` (records `convertedStudentId`) when a student is created through the enroll form; `dashboard/frontoffice/WalkInInquiryTab.jsx` ~L326–335 can also set status `"enrolled"` via `updateDeskInquiryStatus` without a student ID. `markInquiryConverted` also swallows its own error (`console.warn`, ~L214). `applications` can't be created from the client (`create: false`), so "inquiry → application" isn't a client path at all.
**User impact:** Front Office conversion reports count "enrolled" without a traceable student.
**Proposed direction (open):** one conversion function that requires the student ID; surface failures.
**Prior-audit check:** Related to **F-04**; not the same.

### 3.5 STALE / DEAD / ORPHANED CODE

#### INT-016 — Dead parent-portal code and an unused `batches` read
**Severity:** Low · **Status:** Confirmed
`students/parentPortalRepository.js`: `getStudentParentPortalBundle` and `lookupStudentForParent` have no callers (`ParentDashboard` uses only `getAuthenticatedParentBundle`, `getChildAttendanceAndClasses`, `buildPaymentSummary`). `getStudentParentPortalBundle` is the only reader of a `batches` collection that has **no rule** (blocked by the catch-all). The doc comment on `buildPaymentSummary` still describes an "anonymous public portal". Unverified: `materials` (owner-only rule, 3 references) and `kioskClockInWithProof`. **Proposed direction (open):** delete the dead functions and comment; check `knip.json` output for the rest.

### 3.6 DOCUMENTATION VS ACTUAL-CODE DRIFT

| Where | Says | Code says |
|---|---|---|
| Audit prompt, Workflow 6 | General Duty appears in `shiftsRepository.js` | No literal there (uses `classId "general"`); see INT-015 |
| Audit prompt, Workflow 7 | Invite created by Admin/Manager | Admin only (UI: `AdminDashboard` only; rules `create: isAdmin()`) |
| Audit prompt, Workflow 6 | Staff Leave → Approval → Availability | No approval or availability step (INT-006) |
| Reconciled audit §11 | Todos "explicitly scoped" | Staff widget unfiltered (INT-002) |
| Reconciled audit F-03 | Approved shift correction not marked consumed | **Now fixed**: one batch updates the shift, writes the audit event and sets `applied: true` (`adjustShiftWithAudit`, ~L418–470) |
| `parentPortalRepository.js` comments | "public / anonymous portal" | Auth-only; anonymous lookup returns `[]` |
| App footer link (`App.jsx`) | `mylibertyportal-public` | repo in use is `mylibertyportal-origin` (not verified whether both exist) |

### 3.7 WORKING FLOWS VERIFIED (by reading; not by running)

- **Staff invitation → signup → Staff/HR:** `invitesRepository.createInvite` uses `crypto.randomUUID()` as token, always writes `email, role, branchId, division, expiresAt`; rules `isInviteValid` checks email, role, expiry, branch and division against the new profile; `StaffSignup` writes `status: "active"`, `branch`, `branchId`, `division` from the invite; `completeStaffSignup` creates the profile **and** deletes the invite in one batch. Reuse after consumption isn't possible via the same account. *Minor:* the invite `delete` rule compares `resource.data.email == request.auth.token.email` without `.lower()` while `isInviteValid` lowercases; cheap to add to the runtime tests.
- **Payment write:** payment doc and student summary fields are one atomic batch (`recordPayment`).
- **Class roster removal:** `removeStudentFromClass` is a `runTransaction` on the live doc (F-02 fixed for removal).
- **Shift correction consumption:** see F-03 row above.
- **Class attendance identity:** deterministic ID `{classId}_{studentId}_{attendanceDate}` enforced in rules; scans can't overwrite existing records (`update` requires `method == "MANUAL"`); kiosk shows "Attendance Already Decided" when a manual decision exists.
- **Parent access model:** auth-based; `isParentOf` gates `classAttendance`/`users`; anonymous lookup removed.
- **Kiosk pass gating:** inactive/graduated students and resigned/terminated staff are blocked at scan.
- **Strict list boundary** is in place for `payments`, `deskInquiries`, and outreach `visits`.

---

## 4. Regression check of prior findings

| Prior | Status at this commit |
|---|---|
| F-01 payment idempotency | Mechanism present, **defeated** by per-click receipt number (INT-010) |
| F-02 roster removal/transfer | Removal **fixed** (transaction). `deleteUserProfile` still stale-snapshot (INT-007). Transfer **not re-checked** |
| F-03 approval not consumed | **Fixed** |
| F-04 walk-in branch scope | Not re-checked |
| F-05 reports broader than branch UI | Not re-checked (only the attendance *source* was, INT-001) |
| F-06 Kids Manager report mode | Not re-checked; INT-018 adds context |
| V-01 lenient vs strict list | **Still applies** — see RC-2 list |
| V-02 rule tests too thin | **Still applies** — no test for Front Office shift/user reads, unfiltered todo lists, parent query shapes. Also `securityRulesMatrix.test.js` is a JS simulation, not the real rules, so passing it proves nothing about `firestore.rules` |
| §7 anonymous parent lookup resolved | Confirmed |

---

## 5. Feature Integration Matrix

| Feature | Upstream | Owns Data | Downstream | Role Scope | Branch Scope | Status | Problems |
|---|---|---|---|---|---|---|---|
| Staff invites | Admin UI | `invites` | `users` (staff) | Admin only | `branchId` on invite → profile | ✅ | Minor `.lower()` mismatch |
| Users (students/parents/staff) | Front Office/Admin/Invites | `users` | Everything | Mixed | lenient list rule | ⚠️ | RC-2, INT-007 |
| Applications | Worker (not audited) | `applications` | Student creation | Read: admin/FO/mgr/mkt | branch | 🔍 | Worker not examined |
| Classes / roster | Admin/FO | `classes` | Attendance, parent, reports | Staff | lenient read | ⚠️ | INT-005, INT-008, RC-2 |
| Class attendance | Kiosk/Instructor | `classAttendance` | Instructor view, Parent | Admin/FO/Instr/Parent | via class doc | ⚠️ | INT-001 (no report consumer) |
| Campus attendance | Kiosk (unmatched scans, events) | `attendance` | Reports only | Staff | lenient read | ⚠️ | INT-001 |
| Payments | FO | `payments` + summary on `users` | Finance, Parent summary | Admin/FO/Mgr | Strict list | ⚠️ | INT-010 |
| Shifts / kiosk | Kiosk (Front Office on reception PC, per owner) | `shifts` | Reports, corrections | Read: admin/mgr/self (not Front Office) | lenient | ❌ | INT-004, INT-005, INT-015 |
| Approvals / corrections | Staff | `approvals`, `shiftAuditEvents` | `shifts` | Approver role/branch | approverBranchId | ✅ | INT-019 (minor) |
| Staff leave | Admin | `staffLeave` | Staff Duty report only | Admin create | branchId optional | ❌ | INT-006 |
| Desk inquiries | FO | `deskInquiries` | Reports, student creation | Any staff | Strict list | ⚠️ | INT-011 |
| Outreach | Marketing | `schoolOutreach`, `visits` | Reports | Admin/Mgr/Mkt | Strict (visits) | ⚠️ | INT-012 |
| Todos/directives | Admin/Mgr/FO | `todos` | All dashboards | Staff | lenient read | ⚠️ | INT-002, INT-003 |
| Corporate events | Admin/Mgr/FO | `corporateEvents` | Kiosk matching, shifts | Staff | mixed | ⚠️ | INT-009, INT-015 |
| Progress reports | Instructor | `progressReports` | Promotion, reports | See INT-013 | none | ⚠️ | INT-013 |
| Kids School | Division flag | (no data of its own) | Dashboards | UI only | UI only | ⚠️ | INT-018 |

## 6. Business Workflow Map

| Workflow | Handoffs |
|---|---|
| Student lifecycle | Application (worker) 🔍 → Student profile ✅ → Class enrollment ✅ → Roster → Attendance ⚠️ (INT-001) → Progress ⚠️ (INT-013) → Parent link ✅ → Parent dashboard 🔍 (INT-017) |
| Parent lifecycle | Parent record ✅ → Auth login ✅ → Dashboard ✅ → Classes/Attendance 🔍 (INT-017) |
| Attendance lifecycle | Roster ✅ → Scan ✅ → classAttendance ✅ → Manual correction ✅ → Close-out ⚠️ (INT-008) → Reports ❌ (INT-001) → Parent ✅ |
| Class/enrollment | Create ✅ → Assign instructor ⚠️ (INT-005) → Add ✅ → Remove ✅ → Transfer 🔍 (not audited) → Closure/reporting ⚠️ |
| Finance | Payment create ⚠️ (INT-010) → Record + summary ✅ → Receipt ⚠️ → Reports ⚠️ (not deeply checked) |
| Staff/HR | Kiosk clock-in ❌ as Front Office / ✅ as Admin (INT-004, verify) → Correction ✅ → Approval ✅ → Applied ✅ → Audit ✅ → Leave ❌ (INT-006) |
| Staff invitation | Invite ✅ → Token ✅ → Signup ✅ → Profile ✅ → Staff/HR ✅ |
| Front Office | Inquiry ✅ → Student ⚠️ (INT-011) → Follow-up → Reporting ⚠️ |
| Outreach | Visit ✅ → Follow-up ❌ (no link) → Application ❌ (INT-012) → Reporting ✅ |
| Todo | Create ✅ → Assign ✅ → Branch scope ⚠️ (INT-003) → Complete ✅ → Dashboard 🔍 (INT-002) |
| Corporate event | Create ✅ → Audience ⚠️ (INT-009) → Kiosk match ✅ → Fallback ⚠️ (INT-015) |

---

## 7. Runtime tests that would settle the "Likely" items (emulator)

Add to `firestoreRules.emulator.test.js` (or a new file). Each is small.

1. **Todos list by branch** — seed todos in `kota_gorontalo` and `bone_bolango`. Instructor in each branch runs `getDocs(collection(db,"todos"))` (as `useStaffDirectives` does) → record allowed/denied and what comes back. Then the branch-filtered query. *(INT-002)*
2. **Front Office staff scan** — Front Office (same branch) (a) `getDoc(users/<marketing|officeboy|manager|frontoffice uid>)` and (b) runs `where("userId","==",otherStaff) & where("clockOut","==",null)` on `shifts`. Expect both to be the intended behavior after the fix. *(INT-004)*
3. **Parent queries** — Parent with `childStudentIds:[s1]` runs the two exact queries from `getChildAttendanceAndClasses`. *(INT-017)*
4. **Users list** — Kota Gorontalo manager with no `branchId` filter vs with filter; Bone Bolango manager. *(RC-2)*
5. **Delete path** — non-Kota-Gorontalo front office runs `classes where studentIds array-contains X`. *(INT-007)*
6. **Corporate event update** — Bone Bolango front office updates a Kota Gorontalo event. *(INT-009)*
7. **Invite case** — invitee whose auth email has uppercase tries to delete their invite. *(§3.7 note)*
8. **E2E** — scan a class-matched student → inspect `attendance` vs `classAttendance` → open Today report. *(INT-001)*

## 8. Suggested remediation order (open; dependencies noted)

0. **Owner decisions (no code)** — Q1–Q9 below; several change what the fix is.
1. **Prove the boundary** — tests in §7. Everything in step 2–3 depends on their outcome.
2. **Rules + queries together (RC-2):** INT-004 (highest daily impact), INT-002, INT-013, INT-009, INT-017; switch list-type reads to Strict where the query is (or will be) filtered. Ship rule and query changes in the same release.
3. **Attendance single source of truth (RC-1):** INT-001, then INT-008 (close-out/status filter). Depends on step 1 (report reads) and on Q-attendance.
4. **Role normalization (RC-3):** INT-005, INT-015, INT-018. Do INT-005 before INT-015 (leaders reach General Duty today).
5. **Data lifecycle (RC-4/5):** INT-007, INT-006, INT-011, INT-010.
6. **Cleanups:** INT-014, INT-016, INT-003 UI part, INT-012 (decision), INT-019, docs drift.

## 9. Questions for the owner (plain language; each one changes a fix)

- **Q1** Do Instructor Leaders teach their own classes?
- **Q2** *(answered by owner: Front Office on the reception PC; Admin is now the directive account.)* Follow-up: is it acceptable for **every** Front Office account to see staff profile details, or should only the reception PC be able to scan? (decides INT-004 option A vs B/C)
- **Q3** If an instructor has no class today, should they be able to clock in anyway ("General Duty")?
- **Q4** Do you really need to permanently delete students, or is "inactive/graduated" enough?
- **Q5** Should leave be just a log kept by Admin, or a request that a manager approves?
- **Q6** Must Kids School staff be blocked from Courses data in the same branch, or is separate screens enough?
- **Q7** Do you want announcements that go to all branches at once?
- **Q8** Should outreach visits be traceable to the students they bring in?
- **Q9** Should parents see their child's progress reports?

## 10. Notes outside the audit scope

- The zip contains `serviceAccountKey.json`, `.env` and `.env.local`. All are listed in `.gitignore` (so they should not be on GitHub), but **do not share the zip**, and since the Firebase account is moving to the office account, issue a fresh service-account key there and delete the old one.
- Single-run limits: no runtime, no worker review, no `ARCHITECTURE.md` diff. Treat "no finding" in un-examined areas as "not checked", not "fine".
