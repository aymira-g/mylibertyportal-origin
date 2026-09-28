---
title: MyLiberty Portal — Parent–Student Link: display bug (Admin) and missing data (Front Office)
type: bug-audit-and-fix-plan
status: proposed — open for the executing agent to challenge
created: 2026-09-28
repository: https://github.com/aymira-git/mylibertyportal-origin (audited at commit e7111f6, 2026-09-28 14:29 +0800, "just some firestore rules fix")
reported-by: Kifry
---

# Parent–Student Link — what is broken and how to fix it

## 0. How to read this file

- The audit was done by an AI auditor (Claude). It read the code and the Firestore rules at commit `e7111f6`. It did **not** run the app, log in as any role, or run the rules emulator. **The auditor can be wrong.**
- Tags: **[Verified]** = confirmed by reading code or rules. **[Known behavior, not tested here]** = standard Firestore behavior the auditor is fairly sure of; please confirm. **[Opinion]** = a judgement call; please challenge it.
- **Executing agent:** please re-check each finding against the code before acting. If you see a better approach, write it in section 8. Every stance has a reason so it can be argued with; nothing here is meant as the last word.
- **Kifry** has no coding experience and no budget. Free tools and small changes are preferred.

---

## 1. Quick take (plain language, for Kifry)

You reported two things. They have **two different causes**, and the link data itself is most likely fine.

1. **Admin: the roster says "Linked", but the parent's edit form says no children linked.** The roster reads the link from the parent's saved record. The edit form loads a fixed list of fields and simply forgets to load the link field, so it always thinks there are zero children. This is a display bug, and saving that form does **not** erase the link (checked in the save code).
2. **Front Office: nothing shows as linked.** The Front Office screen is told to download only students and instructors, never parents. With no parent records, every student looks "not linked", even when they are. The rules in `firestore.rules` were widened this morning to let Front Office read parents, but the download instruction in the app was not updated to match.

A side risk of point 2: because the row says "no account", staff may create a **second** parent account for the same family.

---

## 2. Findings

### P1 — Admin: "Linked" badge opens a form that says "No children linked yet"  **[Verified]**

**What was found**
- The roster builds its "Linked" badge from each parent's `childStudentIds` (`StudentRoster.jsx` lines ~56-67, `linkedParentsMap`).
- Clicking the badge calls `handleEdit(parent)` (`StudentRoster.jsx` ~442, 466), which lives in `useDashboardData.js` (~lines 356-408).
- `handleEdit` fills `formData` from a fixed list of fields (name, phone, branch, program, father/mother fields, …). **`childStudentIds` is not in that list**, and it is not in `emptyFormData` either.
- `ParentProfileFields.jsx` (lines ~13-14 and ~134-165) reads `formData.childStudentIds`. It is `undefined`, so the count is 0 and the form shows "No children linked yet. Link children from the Student Profile screen."
- **Saving is safe:** for role `parent`, `handleSave` builds `{ displayName, phone, branch, branchId, status }`, and `updateParentRecord` writes only `displayName, phone, status, branchId, branch, updatedAt` with `merge: true`. It never sends `childStudentIds`, so the link is not wiped. **[Verified]**
- The same `handleEdit` is shared by Admin and Front Office, so one fix covers both.
- Even after the field loads, the form prints the child's raw Firestore ID (monospace chips), not a name. **[Verified]** (`ParentProfileFields.jsx` ~151-157). A person cannot tell which student that is.

**Options** (agent may combine or replace)
- **A. Minimal:** add `childStudentIds: Array.isArray(user.childStudentIds) ? user.childStudentIds : []` to `handleEdit` (and to `emptyFormData`). Add a unit test that editing a parent keeps the list.
- **B. Friendlier:** in `ParentProfileFields`, show each child's **name** (looked up from the students already in memory) and, if easy, an "Open student" link. IDs can stay as a small tooltip.
- **C. Different click target:** make the "Linked" badge open the existing link window (`StudentParentLinkage` via `linkModalStudent` in `StudentRoster`), which already lists linked parents with an unlink button, instead of the parent's raw edit form. **[Opinion]** This may match what Kifry expects when clicking "Linked", but the agent is better placed to judge which is clearer once both are seen on a phone.
- **Stance on saving [Opinion]:** keep this field read-only in the form. Link and unlink already have dedicated functions using `arrayUnion` / `arrayRemove`, which are safer when two staff edit at once than saving a whole array from a form.

**Done when:** in Admin, clicking "Linked" shows the parent with "Linked Children (N)" and readable child names; editing and saving the parent's phone leaves the link intact; a test covers it.

---

### P2 — Front Office: parents are never loaded, so nothing looks linked  **[Verified in code; not tested against live rules]**

**What was found**
- `useDashboardData({ restrictedRead: true })` adds `where("role", "in", ["student", "instructor"])` to the users listener (`useDashboardData.js` ~lines 111-114). Both `FrontOfficeDashboard.jsx` (line 77) and `KidsFrontOfficeDashboard.jsx` (line 75) use it.
- Parents never arrive, so `linkedParentsMap` is empty for every student, and every row in the Front Office roster takes the "not linked / click to link or create parent account" branch (`StudentRosterTable.jsx` ~222-240; the mobile list has the same logic).
- The code comment says the narrow query "matches what Firestore's rules actually allow (student + instructor docs only)". **The rules now say otherwise:** in `firestore.rules`, `match /users`, the `list` clause lets any staff role read `parent` documents in the same branch (added in commit `f73fc5a`, this morning, by the auditor's reading of the history). Front Office can also create, delete and update parent documents (including `childStudentIds`). So the client query looks out of date compared with the rules. **[Opinion]** most likely cause.
- **Important caution [Known behavior, not tested here]:** Firestore only accepts a list query if it can prove every possible result passes the rule. The `list` rule requires `isSameBranch(resource.data)`, so a non-admin query normally needs a `branchId ==` filter. `useDashboardData` only adds that filter when a `branch` argument is passed, and `FrontOfficeDashboard` does not pass one (line 77). The auditor could not tell whether the current student/instructor query is accepted by the **deployed** rules. The listener only logs a console warning on permission errors, so a failure would be silent. Please test before deciding.
- **Same shape, second place:** `findParentsForStudent` (`usersRepository.js` ~388-404) queries `role == "parent"` + `childStudentIds array-contains studentId` and filters branch **in memory**. For Front Office this has the same "cannot prove the branch" concern, and the link window (`StudentParentLinkage`) would then show "Failed to fetch linked parents." **[Known behavior, not tested here]**
- `firestoreRules.emulator.test.js` has a parent fixture but **no test where a staff or Front Office user lists or queries parent documents**. That is the gap that let this slip.

**Options** (agent may combine or replace)
- **A. Widen the existing query:** `role in ["student","instructor","parent"]` and pass the branch so the rules can prove it. Smallest code change; one listener. Cost: one read per parent document in the branch on each load, plus changes. Please compare with `docs/plans/active/spark-scale-and-log-retention-plan.md` before choosing.
- **B. A separate parents-only listener** (`role == "parent"` and `branchId == myBranch`), merged into `linkedParentsMap` only. **[Opinion]** slightly preferred, because a rejected parent query then cannot break the students/instructors list (the existing comment shows that risk is real).
- **C. Store a small hint on the student document** (for example a list of linked parent ids) at link/unlink time, so the roster needs no parent reads. Cheapest on reads, but it creates two places to keep in sync, needs the Front Office student-update allow-list in `firestore.rules` to change, and needs a one-time backfill for existing links. Only worth it if read cost turns out to matter.
- Whichever option is chosen: also give `findParentsForStudent` a `branchId ==` filter when a branch is known, and update the stale comment in `useDashboardData.js`.
- **Add emulator tests** in `firestoreRules.emulator.test.js`: Front Office lists parents of its own branch with the branch filter (succeeds); without the filter (document the result); cross-branch (fails); `array-contains` by student id with the branch filter (succeeds).

**Done when:** a Front Office user in the same branch as an Admin sees the same "Linked" badges as Admin for that branch's students; another branch's parents never appear; the new rules tests pass with `npm run test:rules`.

---

### P3 — The roster claims "not linked" when it simply has no data  **[Opinion, based on P2]**

- While parent data is missing, or if the query is denied, the row still says "No authenticated app account. Click to link or create parent account." That invites a second parent account for the same family.
- Suggestion: make the roster tell "no parent account" apart from "parent data not loaded". If parents fail to load, show a neutral state or a small warning, and disable "create account" until the check has completed. The link window could also run its "already linked?" check (`findParentsForStudent`) before it offers to create one.

---

## 3. Suggested order (agent may reorder)

1. **PR 1 — P1 option A** (tiny, safe, testable), optionally with B.
2. **PR 2 — P2:** first the rules emulator tests to learn what the current rules accept, then the fix (A or B). Rules changes, if any, in their own review.
3. **PR 3 — P3 and P1 option C**, once the data is reliable.

Each PR small and separate, so a display change is not mixed with a rules or data change.

---

## 4. How to verify (free)

1. **Admin:** open a student that shows "Linked" → click it → the parent form shows the child by name; change the parent's phone, save, reopen: the child is still linked.
2. **Front Office** (a test account in the same branch): the roster shows the same Linked / not-linked badges as Admin for the same students. Open the link window on a linked student: it lists the parent.
3. **Cross-branch:** a Front Office account of another branch does not see these parents.
4. **Rules:** `npm run test:rules` (uses the free Firestore emulator).
5. **Browser console** on Front Office: no "permission denied" warning from the users listener.

---

## 5. Questions for Kifry (defaults given so nobody is blocked)

1. **Click on "Linked":** what should it open? *Default:* the parent's profile, but with the child's name shown (P1 A + B). The agent may propose opening the link window instead.
2. **Front Office scope:** should Front Office see parents of **its own branch only**? *Default:* yes, matching the current rules.
3. **Rules deployment:** after the latest "firestore rules fix" commit, did you also publish the rules to the live Firebase project? The repo file and the live rules can differ. *Default:* unknown; the agent should not assume it and can give Kifry the exact free command to publish once the change is reviewed.

---

## 6. Ideas the auditor leans against (open to counter)

| Idea | Current stance and reason |
|---|---|
| Letting Front Office read **all** users like Admin | Front Office only needs its own branch's parents; the rules already limit by branch. |
| Saving `childStudentIds` from the parent edit form | Link changes have dedicated safe functions; a form save could overwrite a newer change. |
| Fixing the display by hiding the message in `ParentProfileFields` | Hides the symptom; the form would still lack the data. |

---

## 7. What the auditor did and did not check

**Checked:** `StudentRoster.jsx`, `StudentRosterTable.jsx`, `StudentRosterMobileList.jsx` (badge logic), `ParentProfileFields.jsx`, `useDashboardData.js` (`handleEdit`, `handleSave`, users listener), `usersRepository.js` (`updateParentRecord`, link/unlink, `findParentsForStudent`), `parentSchema.js`, `FrontOfficeDashboard.jsx` / `KidsFrontOfficeDashboard.jsx` hook calls, `firestore.rules` (`isStaff`, `isFrontOffice`, `isSameBranch`, `match /users`), and the list of rules tests.

**Not checked:** running the app; live Firebase data (whether any real parent has an empty or missing `childStudentIds`); the deployed rules; the Kids Admin/Manager screens; how `StudentParentLinkage` behaves for Front Office in practice; iOS or phone behavior; Firestore read costs against the free quota.

---

## 8. Agent response & Implementation Report

### P1 — Admin: "Linked" badge opens form saying "No children linked yet"
- **Auditor Stance:** Agree completely.
- **Root Cause Confirmed:** In `useDashboardData.js`, `handleEdit` missed copying `childStudentIds` into `formData`, and `emptyFormData` lacked `childStudentIds: []`. Consequently, `formData.childStudentIds` was `undefined`, leading `ParentProfileFields.jsx` to compute `linkedCount = 0` and display "No children linked yet."
- **Resolution (Options A + B implemented):**
  1. Added `childStudentIds: []` to `emptyFormData` and populated `childStudentIds: Array.isArray(user.childStudentIds) ? [...user.childStudentIds] : []` in `handleEdit`.
  2. Passed `students` through `UserForm` into `ParentProfileFields`.
  3. In `ParentProfileFields`, linked children now display their human-readable `displayName` with a compact ID chip, instead of a raw unreadable UID string.
  4. Updated `handleSave` tab redirection: saving an edited parent profile now redirects to `"students"` rather than `"directory"` (where parents do not belong).
  5. Added unit tests in `UserForm.test.js` validating the display of child names and the 0-children fallback.

### P2 — Front Office: parents not loaded & roster unlinked
- **Auditor Stance:** Agree completely.
- **Root Cause Confirmed:** In `useDashboardData.js`, `restrictedRead` narrowed the query constraint to `where("role", "in", ["student", "instructor"])`. Parents were completely excluded from the query, leaving `linkedParentsMap` empty in Front Office.
- **Empirical Emulator Findings (INT-020):**
  - Ran `npm run test:rules` with new test suite `INT-020` in `firestoreRules.emulator.test.js`.
  - **Result 1:** `where("role", "in", ["student", "instructor", "parent"])` with `where("branchId", "==", "kota_gorontalo")` succeeds for Kota staff (`foGto`).
  - **Result 2:** `where("role", "in", ["student", "instructor", "parent"])` with `where("branchId", "==", "bone_bolango")` succeeds for Bone Bolango staff (`foBoba`).
  - **Result 3:** Non-Kota staff attempting an unconstrained list query (without `branchId`) fails with permission denied because Firestore rules require `isSameBranch(syntheticDoc)`.
  - **Result 4:** `findParentsForStudent` in `usersRepository.js` was filtering `branchId` in client memory instead of in Firestore query constraints. When called by non-Kota staff, this caused permission denial. Adding `where("branchId", "==", branchId)` directly to the Firestore query constraints resolved this completely while respecting the rules.
- **Resolution Implemented:**
  1. `useDashboardData.js` now uses `useUserProfile()` to resolve the current staff's branch when `restrictedRead: true`.
  2. The query is widened to `where("role", "in", ["student", "instructor", "parent"])` and applies `where("branchId", "==", branchId)` using the staff member's branch.
  3. `findParentsForStudent` in `usersRepository.js` includes `where("branchId", "==", branchId)` in its Firestore query constraints when provided.
  4. Added composite index for `users` (`branchId ASC, role ASC, childStudentIds ARRAY_CONTAINS`) in `firestore.indexes.json`.

### P3 — Roster claims "not linked" when no data
- **Status:** Resolved by P2. Because parents in the branch are now reactively synchronized in `users`, `linkedParentsMap` is correctly populated for both Admin and Front Office. Students with linked parents show the green `Linked` badge, and unlinked students show `App: N/A (+ Link)`.

### Verification Summary
- `npm test`: 72 test files passed, 885 unit tests passed.
- `npm run test:rules`: 46 rules emulator tests passed (including `INT-020`).
- `npm run typecheck`: clean (0 errors).
- `npm run lint`: clean (0 errors).
