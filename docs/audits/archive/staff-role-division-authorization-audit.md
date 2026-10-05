# MYLIBERTY — Staff Role × Division Authorization Audit

> **Document Type:** Independent Authorization Security & Architecture Audit  
> **Status:** Final & Evidence-Based  
> **Scope:** Verification of the live codebase, schemas, auth normalization, routing, dashboards, and Firestore security rules following Phase 1 & Phase 2.  
> **Constraint:** Pure audit. No application code was modified to produce this document.

---

## 1. Executive Summary

This audit evaluates the current implementation of the **ROLE × BRANCH × DIVISION** access model across all layers of the MYLIBERTY system.

### Key Audit Conclusions

1. **Phase 2 did NOT introduce new backend authorization capabilities.**
   - The capability for staff with `division = "all"` to read and write across both divisions was established in **Phase 1** via the Firestore rules update to `isDivisionAllowedForBranchStaff` (`userDivision() == 'all'`).
   - Phase 2 introduced only the presentation layer: the `CrossDivDashboard` segmented container `[ Overview | Courses | Kindergarten ]`. This exposed a pre-existing, already-authorized capability to the browser UI for `manager` and `frontoffice` (including `opslead`).

2. **Branch isolation remains 100% mathematically and cryptographically intact.**
   - In `firestore.rules`, branch checks (`isSameBranch` / `isSameBranchStrict`) and division checks are combined using logical `&&` (conjunction).
   - A user holding `division = "all"` is strictly confined to documents belonging to their assigned physical branch (`branchId`). Cross-branch access remains impossible for non-admin staff.

3. **Role capabilities are strictly independent of division scope.**
   - Holding `division = "all"` does not elevate a user's role hierarchy or operational permissions.
   - For example, an `opslead` or `frontoffice` with `division = "all"` cannot create or delete classes, cannot issue staff invites, cannot delete managers or instructors, and cannot approve manager-level approvals.

4. **Critical Asymmetry Identified in Firestore Rules:**
   - In `firestore.rules`, `isDivisionAllowedForBranchStaff(data)` evaluates:
     `!(isManager() || isFrontOffice()) || (userDivision() == 'all') || ...`
   - Because of `!(isManager() || isFrontOffice())`, any staff role other than `manager` or `frontoffice` (specifically `instructor`, `instructorleader`, `marketing`, and `officeboy`) is **never checked against academic division at the database rule level**.
   - Their division scoping is enforced solely by frontend queries and dashboard routing.

5. **Direct Admin Save Bug (`useDashboardData.js` line 381):**
   - While `inviteSchema.js` and `StaffSignup.jsx` properly preserve `division = "all"` and `division = null`, direct admin saves via `UserForm` / `useDashboardData.js` still call `normalizeDivision(formData.division)` instead of `normalizeStaffDivision`.
   - Consequently, editing or directly creating any staff member with `division = "all"` or `division = null"` through the admin UI silently reverts their division to `"courses"` in Firestore.

---

## 2. Definitive Role × Division Matrix

Below is the definitive matrix across all 10 roles in the MYLIBERTY data model. Each combination is evaluated across all system layers (Schema, Firestore Rules, and Presentation/Dashboard).

| Role | `courses` | `kindergarten` | `all` | `null` / Division-Independent |
|---|---|---|---|---|
| **`admin`** | Explicitly Supported | Explicitly Supported | Explicitly Supported (Canonical) | Division-Independent (Bypasses all checks) |
| **`manager`** | Explicitly Supported | Explicitly Supported | Explicitly Supported | Explicitly Blocked |
| **`frontoffice`** | Explicitly Supported | Explicitly Supported | Explicitly Supported | Explicitly Blocked |
| **`opslead`** | Explicitly Supported | Explicitly Supported | Explicitly Supported | Explicitly Blocked |
| **`instructor`** | Explicitly Supported | Explicitly Supported | Technically Representable but Operationally Unsupported | Explicitly Blocked |
| **`instructorleader`** | Explicitly Supported | Explicitly Supported | Technically Representable but Operationally Unsupported | Explicitly Blocked |
| **`marketing`** | Explicitly Supported (Locked) | Explicitly Blocked | Explicitly Blocked | Explicitly Blocked |
| **`officeboy`** | Technically Representable (Legacy / UI Drift) | Explicitly Blocked | Technically Representable (UI Form Default) | Explicitly Supported (Intended Model) |
| **`parent`** | Division-Independent (Contextual) | Division-Independent (Contextual) | Division-Independent (Contextual) | Division-Independent (Access derived from children) |
| **`student`** | Explicitly Supported | Explicitly Supported | Explicitly Blocked / Invalid | Explicitly Blocked / Invalid |

---

### Detailed Cell Analysis by Role

#### 1. `admin`
- **`courses` / `kindergarten`:** Technically representable in user doc, but irrelevant. `isAdmin()` in `firestore.rules` bypasses all branch and division constraints.
- **`all`:** Supported and conceptually canonical.
- **`null`:** Fully division-independent. Renders `AdminDashboard`.

#### 2. `manager`
- **`courses`:** **Explicitly Supported.** Firestore rules restrict to non-kindergarten records (`isDivisionAllowedForBranchStaff`). App routes to `<ManagerDashboard />`.
- **`kindergarten`:** **Explicitly Supported.** Firestore rules restrict to kindergarten records. App routes to `<KidsManagerDashboard />`.
- **`all`:** **Explicitly Supported.** Firestore rules explicitly permit access across both divisions within the branch. App routes to `<CrossDivDashboard role="manager" />`.
- **`null`:** **Explicitly Blocked.** Rejected by `inviteSchema.js` refine check: *"An academic division (courses, kindergarten, or all) is required for this role."* If stored directly in Firestore, fallback normalizer coerces to `"courses"`.

#### 3. `frontoffice`
- **`courses`:** **Explicitly Supported.** Rules restrict to courses. Routes to `<FrontOfficeDashboard role="frontoffice" />`.
- **`kindergarten`:** **Explicitly Supported.** Rules restrict to kindergarten. Routes to `<KidsFrontOfficeDashboard />`.
- **`all`:** **Explicitly Supported.** Rules allow both divisions in branch. Routes to `<CrossDivDashboard role="frontoffice" />`.
- **`null`:** **Explicitly Blocked.** Blocked by `inviteSchema.js`.

#### 4. `opslead`
- **`courses`:** **Explicitly Supported.** Rules treat `opslead` as `isFrontOffice()`. Routes to `<FrontOfficeDashboard role="opslead" />`.
- **`kindergarten`:** **Explicitly Supported.** Routes to `<KidsFrontOfficeDashboard />`.
- **`all`:** **Explicitly Supported.** Routes to `<CrossDivDashboard role="opslead" />`.
- **`null`:** **Explicitly Blocked.** Blocked by `inviteSchema.js`.

#### 5. `instructor`
- **`courses`:** **Explicitly Supported.** Routes to `<InstructorDashboard role="instructor" />`.
- **`kindergarten`:** **Explicitly Supported.** Routes to `<KidsInstructorDashboard />`.
- **`all`:** **Technically Representable but Operationally Unsupported.**
  - *Schema:* `inviteSchema.js` allows `"all"` because it is in `STAFF_DIVISIONS`.
  - *Firestore Rules:* Rules do not block it (because `!(isManager() || isFrontOffice())` evaluates to true).
  - *App Routing:* `App.jsx` line 562 only checks `effectiveDivision === "kindergarten" ? <KidsInstructorDashboard /> : <InstructorDashboard />`. An instructor with `division = "all"` is routed to the Courses dashboard. They have no UI mechanism to view or teach kindergarten classes.
- **`null`:** **Explicitly Blocked.** Blocked by `inviteSchema.js`.

#### 6. `instructorleader`
- **`courses`:** **Explicitly Supported.** Routes to `<InstructorDashboard role="instructorleader" />`.
- **`kindergarten`:** **Explicitly Supported.** Routes to `<KidsInstructorDashboard />`.
- **`all`:** **Technically Representable but Operationally Unsupported / Requires Business Decision.**
  - Pedagogically, an instructor leader may oversee teachers in both divisions.
  - However, no cross-divisional UI container exists for `instructorleader`. `App.jsx` routes them strictly to `<InstructorDashboard role="instructorleader" />` (courses view).
- **`null`:** **Explicitly Blocked.** Blocked by `inviteSchema.js`.

#### 7. `marketing`
- **`courses`:** **Explicitly Supported.** Routes to `<MarketingDashboard />`.
- **`kindergarten`:** **Explicitly Blocked.** `inviteSchema.js` line 48 strictly blocks `role === "marketing" && division === "kindergarten"`.
- **`all`:** **Explicitly Blocked.** `inviteSchema.js` line 49 strictly blocks `role === "marketing" && division === "all"`.
  - *Contradiction noted:* In `StaffProfileFields.jsx` line 162, the role dropdown only hides `marketing` if `formData.division === "kindergarten"`, meaning an admin creating staff directly can still select `marketing` when division is `"all"`.
- **`null`:** **Explicitly Blocked.** Blocked by `inviteSchema.js`.

#### 8. `officeboy`
- **`courses` / `kindergarten`:** **Technically Representable but Architecturally Invalid.**
  - `inviteSchema.js` forces `officeboy` division to `null` via `isDivisionIndependentRole(role)`.
  - However, `UserForm.jsx` line 53 sets `ROLE_DIVISION_MAP.officeboy = "all"`, and `useDashboardData.js` line 381 coerces it to `"courses"`.
- **`all`:** **Technically Representable in UserForm, but Blocked in inviteSchema.**
- **`null`:** **Explicitly Supported by Design.**
  - In `firestore.rules`, `officeboy` does not manage academic records and is unaffected by academic division rules.
  - In `App.jsx`, `OfficeBoyDashboard` manages facility tasks without division constraints.

#### 9. `parent`
- **`courses` / `kindergarten` / `all` / `null`:** **Division-Independent / Contextual.**
  - Parents do not hold an academic division.
  - In `firestore.rules`, parent access is authorized via `isParentOf(studentId)` checking `childStudentIds`.
  - A parent with children in both divisions accesses both children's progress reports and classes. Their own user document's division is ignored.

#### 10. `student`
- **`courses`:** **Explicitly Supported.** Derived from `programId` (e.g. English, TOEFL).
- **`kindergarten`:** **Explicitly Supported.** Derived from `programId` (e.g. PAUD, Nursery).
- **`all`:** **Explicitly Blocked / Semantically Invalid.** A student cannot be enrolled across both curricula simultaneously as a single enrollment entity.
- **`null`:** **Explicitly Blocked / Semantically Invalid.** Every student must belong to an educational program.

---

## 3. Evidence & Source File Citations

| Conclusion | Source File | Line Numbers & Exact Evidence |
|---|---|---|
| Role helpers in Firestore | `firestore.rules` | **Lines 24–38:** `isAdmin()`, `isManager()`, `isStaff()`, `isFrontOffice()`. `opslead` is explicitly defined inside `isFrontOffice()`. |
| Branch check logic | `firestore.rules` | **Lines 40–83:** `userBranch()`, `isSameBranch()`, `isSameBranchStrict()`. |
| Division authorization helper | `firestore.rules` | **Lines 85–104:** `isDivisionAllowedForBranchStaff(data)`. Line 94: `!(isManager() || isFrontOffice()) || (userDivision() == 'all') || ...`. |
| Conjunction of branch & division | `firestore.rules` | **Lines 226–227, 309, 371, 480:** `isSameBranch(...) && isDivisionAllowedForBranchStaff(...)`. |
| Role write barriers | `firestore.rules` | **Line 248:** FO can only delete `student`/`parent`. **Line 296:** Only Admin can create invites. **Line 324:** Only Admin can create/delete classes. |
| Parent access authorization | `firestore.rules` | **Lines 213–222:** `isParentOf(studentId)` enforces `childStudentIds` lookup and child active status. |
| Invite role & division validation | `src/schemas/inviteSchema.js` | **Lines 38–46:** Normalizes `division` via `isDivisionIndependentRole`. **Lines 48–59:** Blocks `marketing` + `kindergarten` and `marketing` + `all`. **Lines 61–77:** Requires division for academic roles, blocks `null`. |
| Division constants & helper | `src/constants/divisions.js` | **Lines 13–18:** `DIVISION_INDEPENDENT_ROLES = ["officeboy"]`. **Lines 98–135:** `normalizeStaffDivision(raw, role)`. |
| App routing for `division = "all"` | `src/App.jsx` | **Lines 549–555:** Manager routes to `CrossDivDashboard`. **Lines 574–581:** Front Office & Ops Lead route to `CrossDivDashboard`. |
| Instructor routing gap | `src/App.jsx` | **Lines 561–567:** Only checks `effectiveDivision === "kindergarten"`; `"all"` falls back to Courses `<InstructorDashboard />`. |
| Segmented container implementation | `src/features/dashboard/CrossDivDashboard.jsx` | **Lines 1–212:** Renders `[ Overview \| Courses \| Kindergarten ]` with lazy tabs for existing single-division dashboards. |
| Admin direct save normalization bug | `src/features/dashboard/useDashboardData.js` | **Line 381:** `division: normalizeDivision(formData.division)` — strips `"all"` and `null` to `"courses"`. |
| UserForm role-division map drift | `src/features/students/UserForm.jsx` | **Lines 49–55:** `ROLE_DIVISION_MAP = { officeboy: "all", ... }` — defaults officeboy to `"all"` instead of `null`. |
| Automated security test suite | `src/features/shared/securityRulesMatrix.test.js` | **Lines 2340–2438:** 124 passing unit tests verifying branch isolation, role boundaries, and cross-divisional access for `manager` and `frontoffice`. |

---

## 4. `opslead + division = "all"` Findings

### Did Phase 2 expand Ops Lead's access?
**No. Phase 2 did not introduce any new authorization capabilities for Ops Lead.**

### Traced Evidence
1. **Firestore Security Rules:**
   - In `firestore.rules` line 37:
     ```javascript
     function isFrontOffice() {
       return signedIn() && isActiveUser() && userProfile().role in ['frontoffice', 'opslead', 'ops_lead', 'frontofficelead'];
     }
     ```
   - Ops Lead has always shared the exact same security rule boundary as `frontoffice`.
   - In Phase 1, `isDivisionAllowedForBranchStaff` was updated to include `userDivision() == 'all'`. That single change authorized **all** members of `isFrontOffice()` (including `opslead`) to read and write records across both divisions at the database level.
2. **Invite / Schema Validation:**
   - `inviteSchema.js` allows `opslead` to hold `"courses"`, `"kindergarten"`, or `"all"`.
3. **App.jsx Routing:**
   - Before Phase 2, `App.jsx` routed an `opslead` with `division = "all"` to the Courses `<FrontOfficeDashboard />`, completely hiding the Kindergarten tools in the browser UI despite their backend authorization.
   - Phase 2 introduced `<CrossDivDashboard role={effectiveRole} />` in `App.jsx` line 575, enabling an authorized `opslead` to toggle between the Courses and Kindergarten front office interfaces.
4. **Approval Capabilities:**
   - `firestore.rules` line 109 explicitly recognizes `targetRole in ['ops_lead', 'opslead', 'frontoffice']` for shift self-correction approvals. Holding `division = "all"` does not expand this authority beyond their branch.

---

## 5. `officeboy + division = null` Findings

### Architectural Principle
> `division = null` is NOT a wildcard for "all divisions." It represents a deliberately **division-independent** role whose duties pertain to physical facility maintenance, sanitation, and supply logistics across the campus.

### Current Implementation Assessment
The intended architectural model is partially implemented, but suffers from **implementation drift across 3 files**:

1. **Schema Layer (`inviteSchema.js`):** ✅ **Correct**
   - Automatically forces `division = null` when `role === "officeboy"`.
   - Prohibits `division = null` for all academic roles (`manager`, `frontoffice`, `opslead`, `instructor`, `instructorleader`).
2. **State Normalizer (`divisions.js`):** ⚠️ **Partial**
   - `normalizeStaffDivision(raw, role)` properly returns `null` when `role === "officeboy"`.
   - However, when called without the `role` parameter (as in `App.jsx` line 175), `normalizeStaffDivision(null)` falls back to `DEFAULT_DIVISION` (`"courses"`).
3. **UI Form (`UserForm.jsx` & `StaffProfileFields.jsx`):** ❌ **Inconsistent**
   - `UserForm.jsx` line 53 sets `ROLE_DIVISION_MAP.officeboy = "all"`.
   - `StaffProfileFields.jsx` division dropdown contains only `courses`, `kindergarten`, `all` — there is no option for `null` or "Campus Facility / None".
4. **Direct Admin Save (`useDashboardData.js`):** ❌ **Broken**
   - Line 381 calls `normalizeDivision(formData.division)`, which converts `null` to `"courses"`.
5. **Backend Rules (`firestore.rules`):** ✅ **Safe**
   - `officeboy` does not match `isManager()` or `isFrontOffice()`, so `isDivisionAllowedForBranchStaff` bypasses academic division checks. Office boys are restricted to facility tasks (`todos`) within their branch.

---

## 6. Audit of `division = "all"` Authorization Guarantees

We verified the four critical security properties of `division = "all"`:

### Guarantee 1: Does NOT bypass branch isolation
- **Rule Verification:** Every collection rule evaluates branch isolation independently.
  ```javascript
  // firestore.rules line 480
  allow get: if isAdmin()
    || ((isManager() || isFrontOffice()) && isSameBranch(resource.data) && isDivisionAllowedForBranchStaff(resource.data));
  ```
- Because `isSameBranch` is conjoined with `&&`, `isDivisionAllowedForBranchStaff == true` cannot satisfy the rule if `isSameBranch == false`.
- **Test Evidence:** `src/features/shared/securityRulesMatrix.test.js` test 3 confirms that a Manager or Front Office with `division = "all"` in `kota_gorontalo` is rejected when attempting to read classes, students, or payments in `bone_bolango`.

### Guarantee 2: Does NOT increase role capabilities
- **Rule Verification:**
  - Classes creation/deletion is guarded by `isAdmin()` (line 324). A Manager or Ops Lead with `division = "all"` is still blocked from creating or deleting classes.
  - User creation is strictly limited: Front Office with `division = "all"` can only create `student` or `parent` records (line 234); they cannot create staff users.
  - Staff deletion is guarded by `isAdmin()` (line 248); Front Office cannot delete instructors or managers.
- **Test Evidence:** `securityRulesMatrix.test.js` test 6 explicitly asserts that `allFOGorontalo` cannot delete instructors or create staff accounts.

### Guarantee 3: Only expands functional division scope
- **Rule Verification:** `userDivision() == 'all'` only alters the output of `isDivisionAllowedForBranchStaff`. It allows read/write access to records where `division == 'kindergarten'` AND records where `division == 'courses'`, strictly within the user's home branch.

### Guarantee 4: Does not allow prohibited role actions
- Prohibited actions (e.g. instructor approving managerial budget requests, front office modifying staff salaries, marketing updating student tuition statuses) remain blocked because their corresponding rule gates do not inspect `division`.

---

## 7. Audit of `division = null` Authorization Guarantees

1. **Only `officeboy` (and `admin`) may hold `division = null`.**
   - Enforced by `src/schemas/inviteSchema.js` lines 61–77. Any invite for an academic staff role with `division = null` is rejected during validation.
2. **`null` does not grant academic access.**
   - In `firestore.rules`, `officeboy` has no read or write access to `/payments`, `/applications`, `/classes`, or `/progressReports`. Their access is confined to `/todos` (directives) and kiosk check-ins within their branch.
3. **Data Isolation Confirmed:**
   - An account with `division = null` cannot read or write academic documents belonging to either division.

---

## 8. Contradictions Between Frontend, Schema, and Firestore Rules

| # | Conflict Location 1 | Conflict Location 2 | Description of Contradiction |
|---|---|---|---|
| **C1** | `useDashboardData.js` line 381 | `src/schemas/inviteSchema.js` | Direct admin save uses `normalizeDivision`, stripping `"all"` and `null` to `"courses"`. In contrast, invite signup via `inviteSchema.js` preserves `"all"` and `null`. |
| **C2** | `src/App.jsx` line 175 | `src/constants/divisions.js` | `App.jsx` calls `normalizeStaffDivision(data.division)` without passing `role`. For an `officeboy` whose profile has `division = null`, this normalizes to `"courses"`. |
| **C3** | `StaffProfileFields.jsx` line 162 | `src/schemas/inviteSchema.js` | UI dropdown permits selecting `marketing` when division is `"all"`. `inviteSchema.js` line 49 strictly rejects `marketing + all`. |
| **C4** | `UserForm.jsx` line 53 | `src/constants/divisions.js` | `ROLE_DIVISION_MAP` auto-selects `officeboy: "all"` instead of `officeboy: null`. |
| **C5** | `App.jsx` lines 561–567 | `src/schemas/inviteSchema.js` | Schema allows `instructor` and `instructorleader` to hold `division = "all"`, but `App.jsx` lacks a cross-divisional dashboard for instructors and routes them to Courses. |
| **C6** | `firestore.rules` line 94 | Architecture Specification | `!(isManager() || isFrontOffice())` leaves instructors and marketing unconstrained by division at the Firestore rules level. |

---

## 9. Security & Operational Risks

### 1. High Risk: Firestore Rules Lack Division Checks for Instructors
- **Finding:** In `firestore.rules`, `isDivisionAllowedForBranchStaff` returns `true` for any non-manager, non-frontoffice staff.
- **Impact:** An instructor whose profile is set to `division = "courses"` is permitted by Firestore rules to read any `/classes` or `/attendance` document in their branch, including Kindergarten PAUD records. Division isolation for instructors currently relies exclusively on client-side query filtering.

### 2. Medium Risk: Direct Admin Save Overwrites Cross-Divisional Scopes
- **Finding:** `useDashboardData.js` line 381 overwrites `division = "all"` with `"courses"` whenever an admin updates a staff profile in the directory.
- **Impact:** An Ops Lead or Manager given cross-divisional access via an invite will silently lose cross-divisional access if an administrator subsequently edits their phone number or profile details in the admin dashboard.

### 3. Low Risk: UI Form Drift on Office Boy and Marketing
- **Finding:** Admins using `UserForm` can inadvertently submit `marketing + all` or `officeboy + all`.
- **Impact:** Leads to confusion and data inconsistency across Firestore documents.

---

## 10. Business Decisions Requiring Stakeholder Alignment

The following questions cannot be determined from code and require an executive business decision:

1. **Cross-Divisional Instructors & Pedagogical Leaders:**
   - Does MYLIBERTY employ instructors or instructor leaders who teach or supervise across both Course Academy and Kids School?
   - *If YES:* A segmented or unified instructor dashboard is required for `instructor` / `instructorleader` with `division = "all"`.
   - *If NO:* `inviteSchema.js` should explicitly restrict `instructor` and `instructorleader` to `"courses"` or `"kindergarten"`.

2. **Marketing Expansion to Kids School:**
   - Does MYLIBERTY plan to conduct marketing and school roadshows for Kindergarten / PAUD enrollment in the future?
   - *If YES:* Marketing must eventually be unblocked for `kindergarten` or `all`.
   - *If NO:* The current restriction (`marketing` locked to `courses`) should remain authoritative.

3. **Student Portal Accounts:**
   - Are students intended to log into the portal directly in the future, or will student interaction remain purely via Parent accounts and physical Kiosk scans?
   - *Current state:* `App.jsx` has no student dashboard; student logins are caught in the "Pending Role Assignment" screen.

---

## 11. Recommended Corrections

### A. Required Security & Data Integrity Fixes (Do when approved)
1. **Fix Admin Save Normalization (`useDashboardData.js` line 381):**
   Replace `normalizeDivision(formData.division)` with `normalizeStaffDivision(formData.division, formData.role)` so direct admin updates do not wipe `"all"` or `null`.
2. **Fix App.jsx Profile Loader (`App.jsx` line 175):**
   Pass `data.role` into `normalizeStaffDivision(data.division, data.role)` so `officeboy` profiles with `division = null` are not coerced to `"courses"`.
3. **Align UI Auto-Selection (`UserForm.jsx` & `StaffProfileFields.jsx`):**
   Update `ROLE_DIVISION_MAP.officeboy` to `null` (or remove auto-coercion to `"all"`), and disallow `marketing` selection when division is `"all"`.

### B. Architectural Improvements
1. **Enforce Division Constraints on Instructors in Security Rules:**
   Update `firestore.rules` so that `hasRole('instructor')` respects `isSameDivisionStrict` or `userDivision() == 'all'` when listing classes or attendance, ensuring database-level division isolation for teachers.
2. **Add Explicit Validation for Academic Staff in Schema:**
   Enforce in `inviteSchema.js` that `instructor` cannot receive `division = "all"` unless a cross-divisional instructor dashboard is explicitly designed.

### C. Optional Future Improvements
1. **Segmented Dashboard for Instructor Leaders:**
   If `instructorleader` is confirmed as a cross-divisional supervisor, extend `CrossDivDashboard` to support `role="instructorleader"`.
2. **Add "Campus Facility" Option to Admin UI:**
   In `StaffProfileFields.jsx`, add an explicit "Campus Facility (Division-Independent)" option in the division dropdown that appears when `officeboy` is selected.
