# MYLIBERTY — Universal Staff Division Foundation Audit

> **Document Type:** Architectural Baseline & Foundation Gap Audit  
> **Status:** Authoritative Audit Report  
> **Scope:** Full repository inspection against the universal **ROLE × BRANCH × DIVISION** access model.  
> **Constraint:** Pure audit. No application code or behavioral changes were made.

---

## 1. Current Architecture vs. Desired Architecture

### Current Architecture (Tightly Coupled & Mixed)

In the current implementation, division scope is frequently treated as an **intrinsic property of a role**, rather than an independent dimension:

1. **Role-Bound Division Assumptions:**
   - `marketing` is hard-coded to `courses` in schema validation and UI dropdowns.
   - `officeboy` is conflated between `all` (in UI forms) and `null` (in schemas), while login loaders coerce it to `"courses"`.
   - `instructor` and `instructorleader` structurally accept `all` in the schema, but the application UI routes them strictly to Courses dashboards without cross-divisional capability.
2. **Layer Inconsistencies:**
   - **Schema Layer:** `inviteSchema.js` rejects `marketing + kindergarten` and `marketing + all`, and forces `officeboy` to `null`.
   - **Form Layer:** `UserForm.jsx` and `InvitesPanel.jsx` enforce synthetic auto-mappings (`ROLE_DIVISION_MAP`) that mutate state across dimensions.
   - **Write Layer:** `useDashboardData.js` still calls `normalizeDivision` (which only knows `"courses"` and `"kindergarten"`), stripping `"all"` and `null` on admin edits.
   - **Rule Layer:** `firestore.rules` enforces division **only** for `isManager()` and `isFrontOffice()`. All other staff roles (`instructor`, `marketing`, `officeboy`) evaluate `!(isManager() || isFrontOffice()) == true` and bypass database-level division checks.

### Desired Architecture (Universal Orthogonal Dimensions)

The access model is strictly defined by three independent orthogonal axes:

$$\text{User Access Scope} = \text{ROLE} \times \text{BRANCH} \times \text{DIVISION}$$

| Dimension | Architectural Question | Valid Structural Values for Staff | Authority & Invariants |
|---|---|---|---|
| **ROLE** | *What is the staff member allowed to do?* | `admin`, `manager`, `opslead`, `frontoffice`, `instructor`, `instructorleader`, `marketing`, `officeboy` | Governs CRUD capabilities, approval gates, and write barriers. Division scope never increases role capabilities. |
| **BRANCH** | *Where is the staff member allowed to operate?* | `kota_gorontalo`, `bone_bolango`, `pohuwato`, `limboto` | Strict physical data boundary. Division scope never crosses branch boundaries for non-admin staff. |
| **DIVISION** | *Which functional/academic scope does the staff member operate within?* | `"courses"`, `"kindergarten"`, `"all"`, or `null` *(division-independent facility)* | Governs the academic/functional stream of records. `"all"` grants authorization across both divisions within the branch. |

### Core Invariants of the Desired Foundation
1. **Universal Representability:** The foundation must allow **every** staff role to be assigned `"courses"`, `"kindergarten"`, or `"all"`.
2. **Separation of Architecture from Business Rules:** Restricting a role (e.g. "marketing does not do kindergarten today") belongs in a configurable business-rule layer or workflow constraint, not hard-coded into the foundational schema or data model.
3. **`all` $\neq$ `null`:**
   - `division = "all"`: Authorized across all academic streams (`courses` + `kindergarten`).
   - `division = null`: Deliberately **division-independent** (campus facility/support like `officeboy`). `null` is neither `"all"` nor `"courses"`.
4. **Scope Monotonicity:** `division = "all"` expands **only** the functional division scope. It never elevates role permissions, never bypasses branch isolation, and never unlocks collections prohibited to the role.

---

## 2. Comprehensive Inventory of Hard-Coded Role/Division Assumptions

Every place in the current repository where code assumes `role X can only use division Y` or couples role to division has been inspected and classified into one of five categories:
- **FOUNDATION:** Genuinely required by the system architecture.
- **BUSINESS RULE:** A current operational business decision that should be separated from foundation types.
- **UX/WORKFLOW:** Requires a UX design or workflow decision, not an architectural limitation.
- **SECURITY:** An authorization constraint that must remain strictly enforced.
- **LEGACY/DRIFT:** An obsolete assumption or incomplete refactor that should eventually be cleaned up.

---

### A. Schemas & Validation

#### 1. Marketing Division Lock in `inviteSchema.js`
- **Location:** [`src/schemas/inviteSchema.js:L48-L59`](file:///e:/myliberty-portal/src/schemas/inviteSchema.js#L48-L59)
  ```javascript
  .refine(
    (data) => {
      // Marketing is currently locked to courses division only.
      if (
        data.role === "marketing" &&
        (data.division === "kindergarten" || data.division === "all")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Marketing role is not available for Kindergarten division.",
      path: ["role"],
    }
  )
  ```
- **Classification:** **BUSINESS RULE**
- **Analysis:** This rule enforces MYLIBERTY's current business practice (marketing currently only handles high-school and campus courses roadshows). Architecturally, marketing outreach could exist for early childhood / kindergarten in the future. The schema currently prevents the foundation from even storing `marketing + kindergarten` or `marketing + all`.

#### 2. Academic Roles Prohibited from `division = null` in `inviteSchema.js`
- **Location:** [`src/schemas/inviteSchema.js:L61-L77`](file:///e:/myliberty-portal/src/schemas/inviteSchema.js#L61-L77)
  ```javascript
  .refine(
    (data) => {
      // Academic staff cannot have division = null
      if (
        !isDivisionIndependentRole(data.role) &&
        data.role !== "admin" &&
        !data.division
      ) {
        return false;
      }
      return true;
    },
    {
      message: "An academic division (courses, kindergarten, or all) is required for this role.",
      path: ["division"],
    }
  )
  ```
- **Classification:** **FOUNDATION**
- **Analysis:** This enforces the fundamental distinction between academic roles (which must operate in an academic scope: `courses`, `kindergarten`, or `all`) and facility support roles (which are division-independent). This is architectural, not a temporary business rule.

#### 3. Automatic Coercion of `officeboy` to `null` in `inviteSchema.js`
- **Location:** [`src/schemas/inviteSchema.js:L40-L46`](file:///e:/myliberty-portal/src/schemas/inviteSchema.js#L40-L46)
  ```javascript
  division: isDivisionIndependentRole(data.role)
    ? null
    : normalizeStaffDivision(data.division, data.role),
  ```
- **Classification:** **FOUNDATION**
- **Analysis:** Preserves `division = null` for division-independent roles and prevents accidental academic division assignment.

---

### B. User Creation & Profile Forms

#### 4. Synthetic `ROLE_DIVISION_MAP` in `UserForm.jsx`
- **Location:** [`src/features/students/UserForm.jsx:L49-L62`](file:///e:/myliberty-portal/src/features/students/UserForm.jsx#L49-L62)
  ```javascript
  const ROLE_DIVISION_MAP = {
    instructorleader: "all",
    manager: "all",
    opslead: "all",
    officeboy: "all",
    marketing: "courses",
  };
  const handleRoleChange = (newRole) => {
    field("role", newRole);
    if (ROLE_DIVISION_MAP[newRole] !== undefined) {
      field("division", ROLE_DIVISION_MAP[newRole]);
    }
  };
  ```
- **Classification:** **LEGACY/DRIFT**
- **Analysis:** Coupling role selection to automatic division overwrite conflates role with division scope. Crucially, it sets `officeboy: "all"`—violating the architectural principle that `officeboy` is `null` (division-independent), not `all`.

#### 5. Role Reset on Division Change in `UserForm.jsx`
- **Location:** [`src/features/students/UserForm.jsx:L38-L46`](file:///e:/myliberty-portal/src/features/students/UserForm.jsx#L38-L46)
  ```javascript
  const handleDivisionChange = (newDiv) => {
    field("division", newDiv);
    if (
      newDiv === "kindergarten" &&
      (formData.role === "marketing" || formData.role === "officeboy")
    ) {
      field("role", "instructor");
    }
  };
  ```
- **Classification:** **LEGACY/DRIFT**
- **Analysis:** Automatically mutating `role` to `"instructor"` when the user selects Kindergarten is a disruptive UI side-effect based on legacy assumptions that only instructors exist in Kindergarten.

#### 6. Dropdown Options Filtering in `StaffProfileFields.jsx`
- **Location:** [`src/features/students/StaffProfileFields.jsx:L162-L168`](file:///e:/myliberty-portal/src/features/students/StaffProfileFields.jsx#L162-L168)
  ```javascript
  {normalizeStaffDivision(formData.division) !== "kindergarten" && (
    <>
      <option value="marketing">Marketing Staff</option>
      <option value="officeboy">Office Support (Office Boy)</option>
    </>
  )}
  ```
- **Classification:** **LEGACY/DRIFT**
- **Analysis:** Completely hides `marketing` and `officeboy` from the role dropdown whenever the division is set to Kindergarten.

#### 7. Synthetic `ROLE_DIVISION_MAP` & Role Mutator in `InvitesPanel.jsx`
- **Location:** [`src/features/staff/InvitesPanel.jsx:L107-L127`](file:///e:/myliberty-portal/src/features/staff/InvitesPanel.jsx#L107-L127) and [`L250-L256`](file:///e:/myliberty-portal/src/features/staff/InvitesPanel.jsx#L250-L256)
  ```javascript
  const ROLE_DIVISION_MAP = {
    instructorleader: "all",
    manager: "all",
    opslead: "all",
    officeboy: "all",
    marketing: "courses",
  };
  // ...
  if (newDiv === "kindergarten" && inviteRole === "marketing") {
    setInviteRole("instructor");
  }
  ```
- **Classification:** **LEGACY/DRIFT**
- **Analysis:** Mirrors the same UI mutations as `UserForm.jsx`. In addition, line 250 hides `marketing` and `officeboy` if division is `kindergarten`, but leaves them visible if division is `all`—causing an immediate validation error upon submit because `inviteSchema` rejects `marketing + all`.

---

### C. Write Paths & State Normalization

#### 8. Direct Admin Save Overwrites Division in `useDashboardData.js`
- **Location:** [`src/features/dashboard/useDashboardData.js:L381`](file:///e:/myliberty-portal/src/features/dashboard/useDashboardData.js#L381)
  ```javascript
  division: normalizeDivision(formData.division),
  ```
  and [`L481-L483`](file:///e:/myliberty-portal/src/features/dashboard/useDashboardData.js#L481-L483):
  ```javascript
  division: normalizeDivision(
    user.division || (user.role === "student" ? divisionOfProgram(...) : "courses")
  ),
  ```
- **Classification:** **LEGACY/DRIFT** (High Priority Bug)
- **Analysis:** `normalizeDivision()` only supports `"courses"` and `"kindergarten"`. Any staff record holding `division = "all"` or `division = null` is silently coerced into `"courses"` whenever an admin edits their profile in the Staff Directory.

#### 9. Omission of `role` in `App.jsx` Profile Initialization
- **Location:** [`src/App.jsx:L175`](file:///e:/myliberty-portal/src/App.jsx#L175)
  ```javascript
  setDivision(normalizeStaffDivision(data.division));
  ```
  and [`src/features/auth/StaffSignup.jsx:L139`](file:///e:/myliberty-portal/src/features/auth/StaffSignup.jsx#L139):
  ```javascript
  division: normalizeStaffDivision(invite.division),
  ```
- **Classification:** **LEGACY/DRIFT**
- **Analysis:** `normalizeStaffDivision(raw, role)` requires `role` to know whether `null` is intentional (`isDivisionIndependentRole`). Because `role` is not passed, `normalizeStaffDivision(null)` falls back to `DEFAULT_DIVISION` (`"courses"`).

---

### D. App Routing & Dashboards

#### 10. Binary Routing for Instructors in `App.jsx`
- **Location:** [`src/App.jsx:L558-L567`](file:///e:/myliberty-portal/src/App.jsx#L558-L567)
  ```javascript
  {(effectiveRole === "instructor" ||
    effectiveRole === "instructorleader" ||
    effectiveRole === "instructor_leader") && (
    <ErrorBoundary label="Instructor dashboard">
      {effectiveDivision === "kindergarten" ? (
        <KidsInstructorDashboard />
      ) : (
        <InstructorDashboard role={effectiveRole} />
      )}
    </ErrorBoundary>
  )}
  ```
- **Classification:** **UX/WORKFLOW**
- **Analysis:** An instructor with `division = "all"` falls through to `<InstructorDashboard role={effectiveRole} />` (Courses). The architecture can represent `instructor + all`, but the UI lacks a cross-divisional dashboard or tab switcher for instructors.

#### 11. Marketing Ignores Division Scope in `App.jsx`
- **Location:** [`src/App.jsx:L583-L587`](file:///e:/myliberty-portal/src/App.jsx#L583-L587)
  ```javascript
  {effectiveRole === "marketing" && (
    <ErrorBoundary label="Marketing dashboard">
      <MarketingDashboard />
    </ErrorBoundary>
  )}
  ```
- **Classification:** **UX/WORKFLOW**
- **Analysis:** Marketing routing completely ignores `effectiveDivision`. The existing `MarketingDashboard` is built exclusively around Courses high-school outreach. If `marketing + kindergarten` is enabled in the future, it will require a dedicated Kids marketing view or segmented container.

#### 12. CrossDivDashboard Hard-Coded Role Switcher
- **Location:** [`src/features/dashboard/CrossDivDashboard.jsx:L188-L205`](file:///e:/myliberty-portal/src/features/dashboard/CrossDivDashboard.jsx#L188-L205)
  ```javascript
  {isManager ? (
    <ManagerDashboard />
  ) : (
    <FrontOfficeDashboard role={role} />
  )}
  ```
- **Classification:** **UX/WORKFLOW**
- **Analysis:** `CrossDivDashboard` currently only accommodates `manager` and `frontoffice`/`opslead`. If `instructorleader` or `marketing` is given cross-divisional scope, `CrossDivDashboard` will need to render their respective operational tabs.

---

### E. Directives & Task Workflows

#### 13. Cross-Divisional Staff Filtered Out in `useStaffDirectives.js`
- **Location:** [`src/features/staff/useStaffDirectives.js:L68-L77`](file:///e:/myliberty-portal/src/features/staff/useStaffDirectives.js#L68-L77)
  ```javascript
  const userDiv = profileDivision || null;
  return todos.filter((t) => {
    // Division gating: must be "all", missing, or matching user's division
    if (userDiv && t.division && t.division !== "all" && t.division !== userDiv) {
      return false;
    }
    // ...
  });
  ```
- **Classification:** **FOUNDATION** (Logic Bug)
- **Analysis:** If a staff member has `userDiv = "all"`, then for any task with `t.division = "courses"`, `t.division !== userDiv` evaluates to `true` (`"courses" !== "all"`). As a result, **cross-divisional staff are filtered out from seeing courses-specific and kindergarten-specific directives**! A user with `division = "all"` should see directives for `courses`, `kindergarten`, and `all`.

---

### F. Firestore Security Rules

#### 14. Non-Manager / Non-FO Division Bypass in `firestore.rules`
- **Location:** [`firestore.rules:L93-L99`](file:///e:/myliberty-portal/firestore.rules#L93-L99)
  ```javascript
  function isDivisionAllowedForBranchStaff(data) {
    return !(isManager() || isFrontOffice())
      || (userDivision() == 'all')
      || (userDivision() == 'kindergarten'
        ? (data != null && 'division' in data && data.division == 'kindergarten')
        : (!('division' in data) || data.division != 'kindergarten'));
  }
  ```
- **Classification:** **SECURITY** & **FOUNDATION**
- **Analysis:** `!(isManager() || isFrontOffice())` evaluates to `true` for `instructor`, `instructorleader`, `marketing`, and `officeboy`. This means Firestore rules **do not enforce division boundaries for teachers or marketing**. An instructor assigned to Courses can technically read and list Kindergarten PAUD classes and attendance within their branch at the database level.

---

### G. Automated Tests Encoding Old Assumptions

#### 15. Explicit Test for Marketing Rejection in `schemas.test.js`
- **Location:** [`src/schemas/schemas.test.js:L63-L71`](file:///e:/myliberty-portal/src/schemas/schemas.test.js#L63-L71)
  ```javascript
  it("rejects marketing role for kindergarten division", () => {
    expect(() =>
      inviteSchema.parse({
        email: "market@myliberty.id",
        role: "marketing",
        division: "kindergarten",
      })
    ).toThrow(/Marketing role is not available for Kindergarten division/);
  });
  ```
- **Classification:** **BUSINESS RULE** Test
- **Analysis:** Encodes the business restriction as an explicit passing assertion. When the foundation is generalized, this test must either be removed or moved to a business-rules test suite.

---

## 3. Security Implications

1. **`division = all` Guarantees:**
   - **Branch Isolation:** Evaluated strictly with `&&` across all collections (`isSameBranch(data) && isDivisionAllowedForBranchStaff(data)`). Branch isolation cannot be bypassed by `division = "all"`.
   - **Role Capabilities:** Collection write barriers (e.g. `isAdmin()` on classes/invites, `isFrontOffice()` on student creation) are completely independent of division. `division = "all"` never elevates a user's role.
2. **Current Database Asymmetry:**
   - While `manager` and `frontoffice` are strictly gated by `division` in `firestore.rules`, `instructor` is not. To make the foundation robust across all roles, `firestore.rules` must eventually evaluate division for all academic roles.

---

## 4. Data Model Implications

1. **Storage Format on `/users/{uid}`:**
   - Every staff record stores `division: "courses" | "kindergarten" | "all" | null`.
   - `null` is explicitly reserved for division-independent facility staff (`officeboy`) and root admin.
2. **Legacy Document Migration & Defaulting:**
   - Staff records created prior to multi-division support may lack a `division` field.
   - For academic roles (`manager`, `frontoffice`, `opslead`, `instructor`, `instructorleader`, `marketing`), missing division must safely default to `"courses"`.
   - For `officeboy`, missing division must normalize to `null`.
3. **Admin Edit Integrity:**
   - Updating `useDashboardData.js` to call `normalizeStaffDivision(val, role)` ensures that saving a user document in the UI will not corrupt `"all"` or `null` values in Firestore.

---

## 5. UI & Routing Implications

1. **Separation of Foundation from UX:**
   - The foundation should permit storing `instructor + all` or `marketing + kindergarten` without throwing schema validation errors.
   - What the user *sees* when logged in can be handled gracefully:
     - If a dedicated cross-divisional UI does not yet exist for that role (e.g. `instructor + all`), route to a sensible fallback (or segmented view) without crashing or corrupting data.
2. **Elimination of Form Mutations:**
   - Removing `ROLE_DIVISION_MAP` from `UserForm.jsx` and `InvitesPanel.jsx` allows admins to independently select Role and Division without unexpected auto-swapping.

---

## 6. Recommended Changes

### Phase A: Foundational Decoupling (Ready to Implement)

1. **Update `inviteSchema.js`:**
   - Define universal staff division support: allow `"courses" | "kindergarten" | "all"` for all staff roles.
   - Preserve `null` strictly for division-independent roles (`isDivisionIndependentRole(role)`).
   - Move `marketing` division restrictions out of the foundational schema (or isolate into an optional business-policy layer).
2. **Fix `useDashboardData.js` Normalization Bug:**
   - Line 381: Replace `normalizeDivision(formData.division)` with `normalizeStaffDivision(formData.division, formData.role)`.
   - Line 481: Update `handleEdit` to use `normalizeStaffDivision(user.division, user.role)`.
3. **Fix `App.jsx` and `StaffSignup.jsx` Loader:**
   - Pass `role` to `normalizeStaffDivision(data.division, data.role)` so `officeboy` is preserved as `null`.
4. **Fix `useStaffDirectives.js` Directive Filter:**
   - Update line 70 so that `userDiv === "all"` allows all directives (`courses`, `kindergarten`, `all`).
5. **Decouple UI Dropdowns in `UserForm.jsx`, `StaffProfileFields.jsx`, and `InvitesPanel.jsx`:**
   - Remove `ROLE_DIVISION_MAP` auto-swapping.
   - Allow independent selection of Role and Division.
   - Add explicit "Campus Facility / Division-Independent" indicator for `officeboy`.

---

## 7. Changes That Should NOT Be Made Yet

1. **Do NOT build a full cross-divisional dashboard for Instructors:**
   - An instructor with `division = "all"` can structurally exist now; designing their multi-schedule view, batch switching, and teaching tools is a separate UX phase.
2. **Do NOT build a Kindergarten Marketing Dashboard:**
   - Enabling `marketing + kindergarten` in the foundation does not require inventing a new PAUD marketing workflow today.
3. **Do NOT alter Branch Isolation Rules:**
   - No changes to `isSameBranch` or `branchId` handling.
4. **Do NOT alter Role Permissions:**
   - Front office, instructors, and marketing must retain their exact current operational permissions.

---

## 8. Summary of Gaps & Resolution Matrix

| Issue Location | Current Behavior | Target Foundational Behavior | Classification |
|---|---|---|---|
| `src/schemas/inviteSchema.js:L48` | Rejects `marketing` with `kindergarten` or `all` | Allows all academic staff to hold `courses`, `kindergarten`, or `all` | **BUSINESS RULE** |
| `src/features/dashboard/useDashboardData.js:L381` | Direct save strips `all`/`null` to `courses` | Preserves `all` and `null` using `normalizeStaffDivision` | **LEGACY/DRIFT** |
| `src/features/students/UserForm.jsx:L49` | `ROLE_DIVISION_MAP` sets `officeboy: "all"` | Decoupled; `officeboy` defaults to `null` | **LEGACY/DRIFT** |
| `src/features/students/UserForm.jsx:L41` | Switching to Kindergarten changes role to instructor | No role mutation on division change | **LEGACY/DRIFT** |
| `src/features/staff/useStaffDirectives.js:L70` | Filters out `all` staff from single-div tasks | `all` staff receive `courses`, `kindergarten`, and `all` tasks | **FOUNDATION** |
| `src/App.jsx:L175` | Ignores role, coerces `null` to `courses` | Passes role to preserve `null` for officeboy | **LEGACY/DRIFT** |
| `firestore.rules:L94` | Non-manager staff bypass division check | Keep rules safe; plan academic division check for instructors in security update | **SECURITY** |
