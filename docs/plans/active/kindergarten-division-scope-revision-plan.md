# Revision Plan — Kindergarten/TK Branch + Division Data Scope

**Status:** PROPOSAL v4, READY FOR CODER (all owner questions Q1-Q9 answered, 2026-09-30). Owner answers are the owner's *business intent*; the technical design below is not locked. Coder agent: verify every claim against the code, and argue or counter-propose wherever you disagree (mark disagreements in the `## Coder Response` section at the bottom).
**Audited against:** the uploaded `myliberty-portal.zip` (2026-09-30) and the spec `MyLiberty_Portal___Kindergarten__TK_Branch___Division_Data_Scope.md`.
**Not verified:** I could not run the Firestore emulator or the test suite (no network in the audit sandbox). Everything below is from reading code.
**Constraint:** free tier only (Firebase Spark). No paid services.

---

## Handoff checklist for the coder (start here)

1. Read Sections 1-2 (what is really wrong), then Section 6 (order).
2. Do **Wave 1 only**: R5 (audit + backfill) → R2 + R3 → R6 (Wave 1 tests) → R1 (rules, last).
3. Stop after Wave 1 and report back (fill in `## Coder Response`). Wave 2 (R8, R9, R4.2, R10) starts only after the owner confirms Wave 1 works.
4. Every item is a proposal. If you disagree, write it in `## Coder Response` with your reason and your alternative before changing course.
5. Free tier only: no paid services, no large unbounded reads (see R10).

## 0. Plain-language summary (for the owner)

The spec asks: "make Kindergarten users only receive Kindergarten data from the database, not just hide the rest on screen."

After checking the real code, the spec is **half out of date**:

- Some things it calls problems are **already fixed** (Kids Manager, most of the reports).
- The **real hole is different** from what the spec describes: the security rules already have division helpers, but they only apply to *Managers*. Front Office and Instructors skip the division check entirely.
- Turning the rules on for Front Office **will break the Front Office screens unless the code is changed first**, and it will hide old records that have no `division` field unless they are backfilled first. So **order matters** (see Section 6).

---

## 1. Spec claims vs. what the code actually does

| Spec claim | Verdict | Evidence |
|---|---|---|
| §2.1 Kids Manager reads are branch-wide only | **OUTDATED** | `KidsManagerDashboard.jsx` already queries students, classes, applications with `where("division","==","kindergarten")`. Only staff `users`, `shifts`, `todos` are branch-only (see Q3, Q4). |
| §2.2 Kids Front Office has no division in queries | **TRUE** | `useDashboardData.js` builds users/classes/applications/invites queries with `branchId` only. |
| §2.2 Desk inquiries fetch is branch-only | **TRUE** | `fetchRecentDeskInquiries` filters by `branchId` only. |
| §2.3 Instructor `allClasses` query has no division | **TRUE** | `KidsInstructorDashboard.jsx` queries `branchId` + `status`, then filters in React. |
| §3 Reports repository only scopes by branch | **MOSTLY OUTDATED** | `reportsRepository.js` already adds `where("division","==",division)` for classes, users, progressReports, applications. Gaps: `attendance` queries (see Q2), shifts (staff, see Q3). |
| §6 Rules need new `userDivision()` / `isSameDivisionStrict()` helpers | **ALREADY EXIST** | `firestore.rules` has both, plus `isDivisionAllowedForManager()`. |
| §6 Rules don't consistently enforce division | **TRUE, but for a different reason than the spec says** | See Finding A. |
| §18 Phase 6 needs new composite indexes | **MOSTLY UNNEEDED** | Queries that only use `==` filters don't need composite indexes. Only `deskInquiries` (`branchId` + `division` + `orderBy createdAt`) probably does. |

---

## 2. Real findings (priority order)

### Finding A — P0 — Division rule only protects Managers
`firestore.rules`:

```
function isDivisionAllowedForManager(data) {
  return !isManager() || ( ... );   // <-- anyone who is NOT a manager returns true
}
```

Effect: **Front Office, Instructors, Marketing** pass the division check for every record. A Kindergarten Front Office user can read Courses students, applications, classes, desk inquiries and progress reports if they craft the query. Affected `match` blocks: `users` (students), `applications`, `classes` (branch path), `deskInquiries`, `progressReports`.

### Finding B — P0 — Front Office client queries have no division filter
`useDashboardData.js` (users / classes / applications) and `deskInquiriesRepository.js` (`fetchRecentDeskInquiries`). Even if Finding A is fixed in the rules, these queries will get **permission-denied**, because Firestore only allows a list query if the query's own filters *prove* every possible result is allowed.

Also: the users query uses `role in ["student","instructor","parent"]` in ONE query. The division rule only applies to `role == student`. That query can't prove it, so it must be **split** into (a) students + division filter, (b) instructors/parents without it.

### Finding C — P1 — Instructor branch-wide class list (owner answered Q1 = "not needed")
`KidsInstructorDashboard.jsx` runs a branch-wide `allClasses` subscription, and the `classes` list rule lets ANY staff role (instructors included) list all classes in their branch. Owner says Kindergarten instructors do not need to see other teachers' classes, so this whole path can be removed for Kindergarten instructors (see R3).

### Finding D — P1 — Legacy records without `division`
The rule for a Kindergarten user already excludes records with no `division` (good, and the spec agrees). But for **Courses** users the spec's "missing division = excluded" would hide old Courses records. Backfill is a **prerequisite** to enforcing the rule for Front Office (see Section 6).

### Finding E — P1 — Attendance, payments (and shifts, todos, staff) lack a reliable `division` (owner answered Q2/Q3/Q4 = "yes, scope them")
- `attendance` (staff scans, written in `shiftsRepository.js` ~L587/590), `classAttendance` (`classAttendanceRepository.js`), `payments` (`paymentsRepository.js` + `paymentSchema.js`), `shifts` (`shiftsRepository.js` ~L139/531) and `todos` (`todosRepository.js`) **do not write `division`** today. Nothing to filter on yet, so this needs a data-model change (new field on new records) plus a backfill of old records.
- Staff `users` profiles do carry `division` (invite → `StaffSignup.jsx` → `normalizeDivision`), and the Kids Manager screen already filters staff by it on screen, but the **rules and queries do not** (staff roles skip the division check).
- `todos` have no division concept at all; only `branchId` (or `"all"`).

### Finding G — RESOLVED (interim) — Instructors who teach both divisions (Q5 = yes, Q6 = "two accounts")
- Original problem: the profile holds ONE `division`, which decides the dashboard (`App.jsx` `effectiveDivision`), the staff-list scoping, and the kiosk weekend rule. A single account cannot be both.
- **Owner decision (interim, revisit later): a person who teaches both divisions gets TWO accounts, one Courses and one Kindergarten**, each with its own email and its own invite. Owner says most of them teach Kids in the morning and Courses in the afternoon, same branch, same day.
- Consequence: no data-model change is needed for this. Every rule and query in this plan can keep assuming one account = one division.
- Coder may still argue for a real multi-division profile (`divisions` array + dashboard switch). Not recommended now: more code, and it would complicate the kiosk weekend rule and the staff-list scoping.
- Side finding that is now a benefit: the Kindergarten weekend-off rule in `kioskScanProcessor.js` (~L351-372) keys off `userData.division`. With two accounts the Kids account is correctly blocked on Sat/Sun while the Courses account still works.
- Side finding: the Courses `InstructorDashboard` has NO division handling, so it also lists assigned Kindergarten classes. With two accounts this only matters if a class is assigned to the wrong account (see Section 9).

### Finding F — P2 — Dev preset uses an invalid division value
`src/features/auth/devPresets.js` sets `division: "studio"` on many presets. Valid values are only `courses` and `kindergarten`. A real profile with `"studio"` would match **no** records under the strict rule and get locked out of student data. Real signups are normalized by `StaffSignup.jsx` (`normalizeDivision`), but manually-created profiles may not be.

---

## 3. Owner answers (2026-09-30) and what each one means

| # | Question | Owner answer | Consequence |
|---|---|---|---|
| Q1 | Kids instructors see other teachers' classes in branch? | **No** | Remove branch-wide `allClasses` for Kindergarten instructors; assigned/substitute classes only (R3). |
| Q2 | Split attendance + payments by division? | **Yes** | Add `division` to new records, backfill old ones, then enforce in rules + queries (R8). |
| Q3 | Kids Manager sees Courses staff in branch? | **No, own division only** | Staff `users` queries + rules get the division gate (R9). |
| Q4 | Kids Manager sees all branch shifts/todos? | **No, own division only** | Add `division` to shifts and todos; filter + enforce (R9). |
| Q5 | One instructor teach both divisions? | **Yes, via two accounts (Q6)** | One person = two accounts, one per division. No profile change (Finding G, Section 9). |

**Scope assumption to confirm (Q7):** I read Q1 as being about *Kindergarten* instructors only. I have NOT changed what Courses instructors can list, because kiosk/attendance flows for them may rely on it.

### New questions for the OWNER
- **Q6 — ANSWERED (interim):** two accounts, one Courses and one Kindergarten. Revisit if the admin overhead becomes a problem.
- **Q8 — ANSWERED:** yes, company-wide directives still reach Kindergarten staff. Store them with `division: "all"`; only division-specific directives are hidden from the other division.
- **Q9 — ANSWERED:** yes, ship in two waves (Section 6). Wave 1 first; Wave 2 only after Wave 1 is live and checked.

## 4. Where I disagree with the spec (so the coder can weigh in)

1. **Spec §10 adds `where("division","==",division)` whenever `division !== "all"`.** For Courses Front Office this would hide legacy records with no division. Suggest gating: add the server filter for Kindergarten right away, and for Courses only **after** backfill (Section 6, step 2).
2. **Spec §7.2 puts a division check on the instructor "assigned to this class" path.** That could lock out an instructor who is legitimately assigned a class in the other division. Suggest leaving the assignment path **unchanged** and fixing only the branch-wide path, unless Q5 = "never both".
3. **Spec §16/§17 "missing division = excluded"** is right for Kids, but must not be applied blindly to Courses (Finding D).
4. **Spec §18 Phase 6 (indexes):** only add what the emulator or console actually demands.

---

## 5. Implementation items

### R1 — Rules: apply the division gate to Front Office (P0)
File: `firestore.rules`.
1. Rename `isDivisionAllowedForManager` → `isDivisionAllowedForBranchStaff` (keep the old name as a thin alias if many call sites; the coder decides).
2. Replace `!isManager() || (...)` with a check that covers **manager AND front office roles** (the `isFrontOffice()` helper already lists `frontoffice`, `opslead`, `ops_lead`, `frontofficelead`). Keep the current inner logic: null-division user → "anything but kindergarten"; otherwise strict equality.
3. Apply to the same blocks that already call it. Also add it to the **create/update** checks for student documents written by Front Office (`users` create/update), comparing against `request.resource.data`.
4. Leave `hasRole('instructor')` behavior for now (Finding C / Q1).
5. Consider: instead of comparing to the raw profile string, treat any profile value other than `"kindergarten"` as "courses-like" (fixes Finding F). Coder to decide.

### R2 — Client: division-aware Front Office queries (P0)
Files: `src/features/dashboard/useDashboardData.js`, `src/features/dashboard/frontoffice/deskInquiriesRepository.js`.
1. In `useDashboardData`, when `division === "kindergarten"`:
   - **Split** the users subscription: one query `role == "student"` + `branchId` + `division == "kindergarten"`; one query `role in ["instructor","parent"]` + `branchId` (no division). Merge both results into the existing `users` state.
   - Add `where("division","==","kindergarten")` to the `classes` and `applications` queries.
2. Keep the existing `matchesDivisionFilter(...)` React filtering (defense in depth).
3. `fetchRecentDeskInquiries(limit, branchId, division)`: add an optional third argument; when set, add `where("division","==",division)`. Update the caller in `WalkInInquiryTab.jsx`. Confirm `createDeskInquiry` actually writes `division` (grep found no literal in the repository file, so check the schema/spread).
4. Courses Front Office: **do not** add the server filter until backfill (R5) is done. Add a code comment marking this.

### R3 — Instructor dashboard (P1) — Q1 answered
Files: `KidsInstructorDashboard.jsx`, `useInstructorRoster.js`, `firestore.rules`.
1. **Delete** the branch-wide `allClasses` `onSnapshot` (branchId + status) from `KidsInstructorDashboard.jsx` and the `combinedAllClasses` merge that depends on it; use the classes from `useInstructorRoster` only (assigned + substitute). Check every place `combinedAllClasses` is passed (schedule/overview widgets) still works with assigned-only data.
2. Keep the two assignment queries (`instructorId`, `substituteInstructorId`) and the client-side Kindergarten filter. Keep cross-branch assigned classes working.
3. Rules: tightening the shared `classes` list rule affects Courses instructors too (Q7). Coder to choose: (a) leave the shared rule alone and simply stop querying it from the Kids instructor dashboard (simplest, but a hand-crafted query could still list branch classes); or (b) split the instructor clause out of the shared branch rule for Kindergarten users only. Recommend (a) first, (b) as a later hardening step.
4. Dual-division instructors use two accounts (Finding G). Nothing extra to build here. Make sure each class is assigned to the instructor account that matches the class's division.

### R4 — Reports (P2)
File: `src/features/reports/reportsRepository.js`.
1. Convert the long positional argument lists (`isAdminView, isFrontOffice, since, branchId, isManager, division`) into one options object. Separate refactor-only commit, no behavior change.
2. After R8/R9 add the division filter to the `attendance`, `shifts`, `staffLeave` and staff `users` queries in this file (the `division` parameter is already passed in; it is currently ignored for those).

### R5 — Backfill missing `division` (P0 prerequisite for enforcement)
1. **Read-only audit first.** Write a small Node script (uses the local service account, run by the owner, never committed) that counts, per collection (`users` where `role == student`, `classes`, `applications`, `deskInquiries`, `progressReports`), the documents with: `division == kindergarten`, `division == courses`, `division` missing, `division` any other value. Prefer `count()` aggregation queries to stay inside free-tier reads.
2. Derive missing values using the rule already in the code: `divisionOfProgram(programId || program)`. **Dry-run** output to a file; ambiguous docs are listed for human review, not guessed.
3. Owner reviews the dry-run output, then the script writes only the unambiguous ones.
4. Also audit `users` profiles for **staff** with invalid division values such as `"studio"` (Finding F) and fix them.

### R6 — Tests (P1)
Files: `src/features/shared/securityRulesMatrix.test.js`, `firestoreRules.emulator.test.js`.
- The matrix currently only has "Section 16: Kids Manager". Add sections for **Kids Front Office** and **Kids Instructor** using the tables in spec §19 (they are good), and mirror the rule change from R1.
- The matrix file re-implements the rules in JavaScript, so update its copy of `isDivisionAllowed...` in the same commit as the real rules.
- Run the emulator suite on the owner's machine if possible (needs Java + Firebase CLI, both free).

### R7 — Indexes (P2)
Add to `firestore.indexes.json` **only** what the emulator/console reports as missing. Likely one: `deskInquiries` on `branchId` ASC + `division` ASC + `createdAt` DESC.

### R8 — Division on attendance, class attendance and payments (P1, Wave 2) — Q2 answered
1. **Write path (new records).** Stamp `division` when the record is created:
   - `payments` (`paymentsRepository.js`, `paymentSchema.js`): copy the student's division (student doc `division`, else `divisionOfProgram(programId || program)`).
   - `classAttendance` (`classAttendanceRepository.js`, `classAttendanceSchema.js`): copy the class document's `division`.
   - `attendance` (staff scans, `shiftsRepository.js` ~L587/590 and `kioskScanProcessor.js`): copy the scanning staff member's profile division.
   Add `division` as an optional string to the three zod schemas.
2. **Backfill old records** (extend the R5 script): payments ← via `studentId` to the student's division; classAttendance ← via `classId` to the class's division; attendance ← via `userId` to the staff profile. Anything whose parent doc is missing goes to a "needs review" list.
3. **Queries:** add an optional `division` argument to `fetchPaymentHistory`, `getRecentPayments`, `getPaymentsForRecordedDay`, and the attendance list queries; Kids callers pass `"kindergarten"`.
4. **Rules (deploy last):** apply the same manager+front-office division gate as R1 to `payments`, `attendance`, `classAttendance` list/get. Keep the instructor "assigned to this class" path on `classAttendance` unchanged.
5. Payments are finance data, so the owner should spot-check a few payments in each division after backfill before the rules go live.

### R9 — Staff, shifts and todos scoped to own division (P1, Wave 2) — Q3/Q4 answered
1. **Staff `users`:** in `KidsManagerDashboard.jsx` (staff query, `role in [...]` + `branchId`) add `where("division","==","kindergarten")`. In rules, extend the division gate from `role == 'student'` to staff roles for Manager/Front Office readers. Keep users able to read their **own** profile (already allowed). Because of the two-account decision, a single `division` value per staff profile is enough. The Courses manager side must mirror this (Courses staff list excludes Kindergarten accounts), but only after the staff backfill in step 2.
2. **Legacy staff profiles:** cannot be auto-derived (no program to look at). Script lists staff with missing/invalid division (including the `"studio"` values from Finding F) for the owner to fill in by hand. Do NOT default them.
3. **Shifts:** stamp `division` from the staff profile at clock-in (`shiftsRepository.js` ~L139 and ~L531); Kids Manager shifts query (`clockOut == null`) gets `division == "kindergarten"`; backfill old shifts via `userId`. Rules for `shifts` list get the gate.
4. **Todos:** add `division` to `createTodo` (`todosRepository.js`; new optional parameter, default `"all"` when created by admin, the creator's division when created by a division manager/front office). Queries currently use `branchId in [branch, "all"]`; Firestore cannot OR two fields in that shape cleanly, so run two queries (`division == mine` and `division == "all"`) or store a `divisions` array, coder's choice. Legacy todos with no `division`: treat as shared `"all"` (consistent with the Q8 answer). Coder may propose a stricter alternative.
5. Files that also query todos: `useStaffDirectives.js`, `ManagerDashboard.jsx` (Courses), `useDashboardData.js`. Update all consistently.

### R10 — Free-tier safety for the backfill (P1)
Spark plan limits are roughly 50k reads / 20k writes per day. Have the script (a) print counts using `count()` aggregations first, (b) process one collection per run, (c) write in batches of 400, (d) support `--dry-run` and resume-from-last-id so a big collection can be finished across two days if needed.

---

## 6. Required order (important) — two waves

**Wave 1 — uses only fields that already exist (students, classes, applications, inquiries, progress, reports, instructor screen)**
1. R5 step 1: read-only audit of missing `division` (students, classes, applications, deskInquiries, progressReports).
2. R5 steps 2-4: dry-run, owner review, backfill.
3. R2 + R3 (client changes). CORRECTION (auditor, after coder review): these are only safe **after the backfill (steps 1-2)**, because the new server-side division filter hides any Kindergarten record that has no `division`. They are compatible with the OLD rules, but not with un-backfilled data. Never deploy the app before the backfill.
4. R6 tests for Wave 1 rules; run them.
5. R1 rules deploy (last step of Wave 1).
6. Manual checks (Section 7, Wave 1 items).

**Wave 2 — needs new fields (attendance, class attendance, payments, shifts, todos, staff)**
7. Add the write-path stamping (R8.1, R9.3, R9.4) and deploy the app so **new** records carry `division`.
8. Run the extended backfill (R8.2, R9, R10); owner reviews the "needs review" lists and fixes staff profiles by hand.
9. Client query changes (R8.3, R9.1, R4.2).
10. Extend the tests, then deploy the Wave 2 rules last.
11. Manual checks (Section 7, Wave 2 items).

Rollback for any rules deploy: keep the previous `firestore.rules` in git and redeploy it (`firebase deploy --only firestore:rules`).

---

## 7. Manual acceptance checks (plain, do with test accounts)

- Kids Front Office (own branch): sees Kindergarten students, classes, applications, walk-in inquiries. Does **not** see a Courses student even if the record exists.
- Courses Front Office: still sees everything it saw before (after backfill).
- Kids Manager: unchanged behavior.
- Kids Instructor: sees own assigned classes (including a cross-branch substitute class) and their students; Courses classes not shown.
- Admin: sees everything.

**Wave 2 checks**
- Kids Manager: staff list, shifts and todos show only Kindergarten staff/directives plus company-wide `all` directives; no Courses-only staff.
- Courses Manager: no Kindergarten-only staff, shifts or directives.
- Payments and attendance: a Kids Front Office user sees only Kindergarten payments; totals for a Courses Front Office user are unchanged from before the change.
- A dual-division instructor (per Q6) can reach both their Courses and Kindergarten classes.
- No red `permission-denied` errors in the browser console on any of the above.

---

## 8. Things NOT to do

- Don't create a "kids branch" (Kindergarten is a division, agreed with spec §21).
- Don't default a missing `division` to `kindergarten` anywhere.
- Don't deploy rules before the client and backfill changes (Section 6).
- Don't put `serviceAccountKey.json` or the audit script's output in git. (Already flagged in an earlier audit: issue a fresh key on the office Firebase account and delete the old one.)

---

## 9. Operating guide: instructors with two accounts (plain language, for the owner)

How the kiosk works today (verified in `kioskScanProcessor.js`): the QR badge holds the account's ID. An instructor's clock-in is **tied to a class**: the kiosk looks up *that account's* classes for today, and if there are none it shows "No Class Scheduled". Scanning again closes the shift, or offers to move to the next class of the same account.

What this means for a person with two accounts:
1. **Each account clocks in for its own classes.** Kids classes on the Kids account in the morning, Courses classes on the Courses account in the afternoon. (Correction to what I said in chat earlier: there is no "home account plus teaching-only account". Because clock-in is class-based, the second account must clock in too.)
2. **Two badges.** The person needs both QR badges (for example both saved on the phone). Scanning the wrong one just shows "No Class Scheduled" or "Weekend Off", so it is harmless, only annoying.
3. **Scan out before switching.** At the end of the morning Kids class, scan the Kids badge again to clock out. If they forget, the Kids shift stays open until the automatic stale-shift close (`isShiftStale`, grace time by role in `shiftStatus.js`) and the Kids account shows too many hours. Suggest a reminder for these instructors.
4. **Hours and pay:** each account only shows its own hours (Kids hours on the Kids account, Courses hours on the Courses account). If pay is calculated from these reports, a person has to add the two together. This is by design, not a bug.
5. **Leave and status:** leave requests and "resigned/terminated" status live on the account. When someone goes on leave or leaves the company, both accounts must be updated.
6. **Class assignment:** assign each class to the account of the same division. A Kindergarten class assigned to the Courses account will show on the Courses dashboard (it has no division filter) and will be missing from the Kids dashboard.
7. **Emails:** each account needs its own login email and its own invite. A Gmail `+` alias (`name+kids@gmail.com`) works as a separate email for the app but arrives in the same inbox.

**Optional later improvement (NOT in scope now):** an optional `linkedAccountUid` note on both profiles so reports and admins can see they are the same person. Only worth it if item 4 or 5 becomes painful.

**For the coder to verify (I could not run the kiosk):** (a) that two accounts with different emails but the same phone/name are not blocked by any duplicate check in signup/invite code; (b) that scanning the Kids badge then the Courses badge back-to-back on the same day does not trip any "one open shift per person" logic beyond the per-`uid` check in `fetchOpenShiftFor`.

---

## Coder Response
_(coder agent: agree / disagree / counter-proposals go here)_


---

## Auditor Reply to Coder Response (2026-09-30)
_Based on the coder's written summary only. I have not seen the coder's code or test results._

**Accepted**
- **Dev 1 (Courses = "anything not Kindergarten"):** accepted, it matches what I argued in Section 4 (do not exclude legacy Courses records). Two conditions: (a) after the backfill, run the audit again and confirm ZERO records with missing `division`; (b) every create path (students, classes, applications, deskInquiries, progressReports) must stamp `division`, so a Kindergarten record can never be saved without one (it would be visible to Courses staff). Add a test for (b) where feasible.
- **Dev 2 (student delete from Kids Front Office):** good catch, accepted. Follow-up: sweep every Kids Front Office action (create, edit, delete, enroll, payment, cascade deletes) for unfiltered lookups on division-gated collections, and list what was checked.
- **Dev 3 (Front Office with no division loses Kindergarten access):** accepted. Rewriting the old test is legitimate, because that old assumption was the hole (Finding A). Keep a comment in the test explaining why it changed. Note: `normalizeDivision()` routes a profile with a missing division to the **Courses** dashboard, so such an account was never really a Kids account. The staff audit will confirm.
- **Dev 4 (client deploy also needs backfill first):** correct in substance. The Section 6 order already had the backfill first, but my parenthetical "safe with old rules" was misleading. Fixed in Section 6 step 3.

**Challenged**
- **Invalid division = sees nothing (e.g. `"studio"`).** The app's own `normalizeDivision()` turns unknown values into **Courses**, so such a staff member sees a working Courses dashboard in the UI while the rules return empty data. That is a silent lockout, and the UI and rules disagree. Recommendation: make the rules mirror the app. Only the exact value `kindergarten` means Kindergarten; anything else (including missing/invalid) behaves like Courses. The leak risk is nil, because the app would already show that person the Courses dashboard. Coder may argue for strict; if so, the profile fix (staff audit) becomes a **hard prerequisite** before the rules deploy.

**Gaps the coder left (my rulings)**
- **Front Office can still edit Courses classes/applications from a Kindergarten account:** the plan's R1.3 only gated student profile writes, so this was not covered. It needs a hand-made request (the UI never offers it), and it is an integrity risk, not a privacy leak. Ruling: not a Wave 1 blocker. Add as **Wave 2 hardening (R11)**: gate `create/update/delete` on `classes` and `applications` with the same division check. Coder to confirm whether student profile writes (R1.3) ARE gated.
- **Marketing and instructors not division-checked on inquiries/classes (documented by a test):** accepted as a known gap for Wave 1. Instructor class visibility is handled at the app level per R3 option (a); rules hardening is a later item. **Owner question Q10 — ANSWERED: NO, Marketing must not see any Kindergarten data.** This upgrades the Marketing gap from 'known gap' to a Wave 1 item (R12 below).

**Wave 1 go-live gate (all must be true before deploying rules)**
1. Backfill done; re-audit shows no missing `division` on students, classes, applications, deskInquiries, progressReports.
2. Staff audit clean: every Kindergarten Front Office/Manager account has `division: kindergarten`; no invalid values remain (or the rules mirror `normalizeDivision`).
3. Emulator tests pass, or the owner has manually run the Section 7 Wave 1 checks with real test accounts on the app with the OLD rules first.
4. Previous `firestore.rules` saved in git for rollback.


---

## Auditor Reply 2 (2026-09-30): Q10 answered + one important technical check

### R12 — Marketing must not see Kindergarten data (Wave 1, P0/P1)
Verified in the original code: `MarketingDashboard.jsx` (~L218) queries `applications` by `branchId` only, and the `applications` rules (`get`/`list`, ~L292-293) let Marketing in through `isDivisionAllowedForManager`, which only gates managers. So Marketing can read Kindergarten applications (child + parent details) today. Walk-in inquiries (`deskInquiries`) have the same gap per the coder.
1. **Rules:** treat the Marketing role as Courses-side regardless of the `division` on their profile. Gate `applications` and `deskInquiries` for Marketing (and any other Marketing-readable collection the coder finds: produce a list). Leave `schoolOutreach` / `visits` alone (Marketing's own field work, not student data).
2. **Client:** `MarketingDashboard.jsx` applications query gets the Courses division filter (after backfill), and the desk-inquiry reads, if any, likewise.
3. **Test:** add a Marketing user to the rules matrix AND the emulator suite: can read Courses applications/inquiries, cannot read Kindergarten ones.
4. Also confirm Marketing cannot read Kindergarten student profiles, classes, or progress reports (the coder's test list should include each).

### Must-verify before go-live: Firestore "list" queries and `!=` rules
Firestore does not filter results by rules. For a LIST query it only allows the query if the query's own filters **prove** every possible result passes the rule. A rule like "division is not kindergarten" (a negation) usually cannot be proven by a query that only filters `branchId`, so the query is **denied** even though the data would have been fine. A strict rule ("division == courses") is provable only if the query also contains `where("division","==","courses")`.

Why this matters here: the coder's Dev 1 (Courses staff see "anything that isn't Kindergarten, including missing division") may pass the JavaScript matrix test, which only re-implements the rule logic, and still fail against real Firestore for the unfiltered Courses queries. That would mean Courses Front Office and Marketing screens return permission-denied the moment rules deploy.

Required of the coder:
1. Run the **real emulator suite** (`firestoreRules.emulator.test.js`) with each role's **exact client query** (same `where` clauses as the app), for: Kids FO, Courses FO, Courses Manager, Kids Manager, Marketing, Instructor, Admin, across students, classes, applications, deskInquiries, progressReports. Report pass/fail per role.
2. If an unfiltered Courses query is denied, the fix is either (a) add `where("division","==","courses")` to Courses queries and make the Courses rule strict-equality (requires the backfill to be complete and the audit clean), or (b) keep the negation rule but only for `get`/single-doc reads and require filtered list queries. Coder to propose; owner decides.
3. Add to the **go-live gate**: item 5: "Emulator results for every role/collection above are attached to the Coder Response, including list queries exactly as the app issues them."
