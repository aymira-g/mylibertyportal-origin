# Instructor Leader Dashboard — Phase 0: File Split Completion Report

> **Document Type:** Phase 0 Structural Architecture & File Split Completion Report  
> **Target Subsystem:** Instructor Leader Dashboard (`src/features/dashboard/InstructorLeaderDashboard.jsx`) & Instructor Dashboard (`src/features/dashboard/InstructorDashboard.jsx`)  
> **Governing Baselines:**  
> - Authoritative Blueprint v3.3 (§6.11 Instructor Leader, §6.12 Instructors, §6.15 Unresolved Kindergarten Staffing)  
> - Ratified Governance Decisions: G-003, G-005, G-011  
> - Plan Document: [`docs/plans/active/2026-10-08-instructor-leader-dashboard-phase0-file-split.md`](../../plans/active/2026-10-08-instructor-leader-dashboard-phase0-file-split.md)  
> **Status:** Phase 0 Implementation Complete & Verified  
> **Date:** 2026-10-08  

---

## 1. Established (Governance Anchors)

The implementation strictly follows the canonical governance hierarchy and ratified baselines:

1. **G-003 (Direct Reporting of All Instructors):**
   *"All branch Instructors report directly to the Instructor Leader."* This applies across both divisions (Courses and Kindergarten). The Instructor Leader operates at branch-wide academic scope, not within a single division.
2. **Division-Independent Leader Routing (Blueprint §6.11, G-003):**
   The Instructor Leader covers all academic instructors across both divisions. Following the Operational Leader pattern in `src/App.jsx` (`opslead` / `ops_lead` / `frontofficelead` → single `OpsLeadDashboard` regardless of division), the Instructor Leader is **never gated by division** when entering their portal.
3. **G-005 (Division-Specific Ordinary Instructors):**
   Ordinary instructors are division-bound: `division: "kindergarten"` lands on `KidsInstructorDashboard`, while `division: "courses"` or `"all"` lands on `InstructorDashboard`. No separate "Kindergarten Instructor Leader" role exists per Blueprint §6.15.
4. **G-011 (Peer Branch Leadership Invariant):**
   The Instructor Leader is a peer operational leader (alongside Operational Leader and Division Managers) and is never treated as Admin, Director, or Division Manager.

---

## 2. Observed (Pre-Split Implementation State)

Prior to this task, the codebase exhibited the following state:

1. **Routing Coupling:** In `src/App.jsx` (lines 569–579), ordinary instructors and instructor leaders were routed together inside a single block:
   ```jsx
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
2. **Defect for Kindergarten-Division Leaders:** An Instructor Leader whose profile had `division: "kindergarten"` was incorrectly routed into `KidsInstructorDashboard`, completely losing access to their leadership Academic Approvals tab and leadership features.
3. **Monolithic Component:** `InstructorDashboard.jsx` (213 lines) mixed ordinary instructor features with conditional leader features guarded by `isLeader` (`effectiveRole === "instructorleader" || effectiveRole === "instructor_leader" || effectiveRole === "head_instructor"`), dynamically injecting the Academic Approvals tab.
4. **Duplicated Data Logic Risk:** Extracting the leader dashboard without a shared hook would have duplicated Firestore listeners and roster data fetching.

---

## 3. Implemented (Exact Changes Made)

### 3.1 Created Shared Workspace Hook
- **File:** [`src/features/dashboard/instructor/useInstructorWorkspace.js`](file:///e:/myliberty-portal/src/features/dashboard/instructor/useInstructorWorkspace.js)
- Encapsulates:
  - `useInstructorRoster()` query;
  - `effectiveRole` and `effectiveBranch` resolution;
  - deduplicated assigned classes (`uniqueClasses`);
  - single Firestore active classes listener (`where("branchId", "==", branchId)`, `where("status", "==", "active")`);
  - `combinedAllClasses` merge guaranteeing cross-branch class visibility;
  - `useStaffDirectives("instructor")`.
- Re-exported via [`src/features/dashboard/instructor/index.js`](file:///e:/myliberty-portal/src/features/dashboard/instructor/index.js).

### 3.2 Created Dedicated `InstructorLeaderDashboard.jsx`
- **File:** [`src/features/dashboard/InstructorLeaderDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/InstructorLeaderDashboard.jsx)
- Structural twin of today's leader experience:
  - Renders all 9 tabs in exact order: Overview, Attendance, Directives, My Classes, Student Progress, Lesson Materials, Reports, Academic Approvals, AI Assistant;
  - Academic Approvals tab is unconditional;
  - `ApprovalInbox` props preserved verbatim:
    - `userRole="instructor_leader"`
    - `branchId={effectiveBranch}`
    - `title="Academic & Faculty Approval Registry"`
    - `subtitle="Dual-control authorization queue for placement level overrides and substitute instructor assignments."`
  - Real-time pending approvals count badge via `usePendingApprovalsCount("instructor_leader", effectiveBranch)`;
  - Preserved shell title `"Instructor Portal"`;
  - Preserved standalone attendance scanner kiosk modal and sidebar button.

### 3.3 Slimmed `InstructorDashboard.jsx`
- **File:** [`src/features/dashboard/InstructorDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/InstructorDashboard.jsx)
- Removed `isLeader` check, `usePendingApprovalsCount`, and the conditional Academic Approvals tab.
- Renders exactly the 8 ordinary instructor tabs (Overview, Attendance, Directives, My Classes, Student Progress, Lesson Materials, Reports, AI Assistant).
- Consumes shared `useInstructorWorkspace`.

### 3.4 Decoupled Routing in `App.jsx`
- **File:** [`src/App.jsx`](file:///e:/myliberty-portal/src/App.jsx)
- Added lazy-retry import:
  ```jsx
  const InstructorLeaderDashboard = lazyWithRetry(() =>
    import("./features/dashboard/InstructorLeaderDashboard")
  );
  ```
- Split routing into two distinct role blocks:
  ```jsx
  {effectiveRole === "instructor" && (
    <ErrorBoundary label="Instructor dashboard">
      {effectiveDivision === "kindergarten" ? (
        <KidsInstructorDashboard />
      ) : (
        <InstructorDashboard role={effectiveRole} />
      )}
    </ErrorBoundary>
  )}
  {(effectiveRole === "instructorleader" ||
    effectiveRole === "instructor_leader") && (
    <ErrorBoundary label="Instructor Leader dashboard">
      <InstructorLeaderDashboard role={effectiveRole} />
    </ErrorBoundary>
  )}
  ```
- **Authorized routing correction:** Kindergarten-division Instructor Leaders now land on `InstructorLeaderDashboard` instead of losing leadership access.

### 3.5 Mechanical Architecture Listing Update
- **File:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)
- Added `InstructorLeaderDashboard.jsx` to the dashboard component listings (lines 157 and 572). Zero other architecture statements modified.

---

## 4. Verified (Verification Evidence & Metrics)

### 4.1 Automated Tooling & Test Results

1. **TypeScript Typecheck (`npm run typecheck`):**
   - Result: **PASSED (0 errors)**.
2. **ESLint Static Analysis (`npm run lint`):**
   - Result: **PASSED (0 errors, 0 warnings)**.
3. **Vitest Unit & Integration Test Suite (`npm test`):**
   - Result: **97 test files passed | 1 skipped emulator suite, 1,173 tests passed, 0 failures**.
   - Specific pinning tests executed and passing:
     - `src/features/dashboard/InstructorDashboard.test.js`: Verified ordinary instructor renders 8 tabs and strictly omits Academic Approvals.
     - `src/features/dashboard/InstructorLeaderDashboard.test.js`: Verified leader renders 9 tabs including Academic Approvals with verbatim `ApprovalInbox` props and badge.
     - `src/features/dashboard/instructor/instructorRouting.test.js`: 10/10 tests verified routing matrix across all roles and divisions.
4. **Vite Production Bundle Build (`npm run build`):**
   - Result: **PASSED (2.95s clean build)**.
   - Cleanly emitted separate code-split bundles:
     - `dist/assets/InstructorDashboard-DYVJ_Don.js (2.35 kB)`
     - `dist/assets/InstructorLeaderDashboard-BEeBtKTI.js (2.68 kB)`
     - `dist/assets/KidsInstructorDashboard-2fu0dMcn.js (2.70 kB)`

### 4.2 Routing Invariant Verification Matrix

| Effective Role | Effective Division | Destination Component | Automated Test Status |
|---|---|---|---|
| `instructor` | `"courses"` | `InstructorDashboard` (8 tabs) | **PASSED** |
| `instructor` | `"all"` | `InstructorDashboard` (8 tabs) | **PASSED** |
| `instructor` | unset / null | `InstructorDashboard` (8 tabs) | **PASSED** |
| `instructor` | `"kindergarten"` | `KidsInstructorDashboard` | **PASSED** |
| `instructorleader` | `"courses"` | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |
| `instructorleader` | `"kindergarten"` | `InstructorLeaderDashboard` (9 tabs) | **PASSED (Owner-authorized fix)** |
| `instructorleader` | `"all"` | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |
| `instructorleader` | unset / null | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |
| `instructor_leader` | `"courses"` | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |
| `instructor_leader` | `"kindergarten"` | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |
| `instructor_leader` | `"all"` | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |
| `instructor_leader` | unset / null | `InstructorLeaderDashboard` (9 tabs) | **PASSED** |

*(Note on Browser Subagent: In-IDE Playwright browser context encountered an external driver download network error, so manual browser session was substituted by the automated React render tests and routing test matrix above).*

---

## 5. Deferred (Reserved for Phase 1+ Dashboard Rebuild)

As mandated by Section 5 of the implementation plan, the following items remain intentionally deferred:

1. **Rebranding & Visual Redesign:** Renaming shell title from `"Instructor Portal"` to `"Instructor Leader Portal"`, adding distinct leadership badges or headers.
2. **Academic Leadership Cockpit & Metrics:** Course-vs-Kindergarten teacher load comparison, student completion rates, teacher observation workflows.
3. **Approvals Canonicalization:** Transitioning string alias `"instructor_leader"` in `ApprovalInbox` and `usePendingApprovalsCount` to canonical `"instructorleader"` without breaking legacy query indices.
4. **Kindergarten Pedagogical Tools for Leader:** Providing the Instructor Leader with Kindergarten-specific tools (e.g., class photo share, developmental observation logs) across both divisions.
5. **Ordinary Instructors with Division `"all"`:** Determining how multi-division instructors access kindergarten-specific tooling while teaching in courses.
6. **Raw `head_instructor` alias in `App.jsx`:** Observation: raw `head_instructor` in user documents is normalized to `instructorleader` by `roles.js`, but does not match raw literals in `App.jsx`. Retained unedited per plan.

---

## 6. Files Changed & Created

| File | Status | Description |
|---|---|---|
| [`src/features/dashboard/instructor/useInstructorWorkspace.js`](file:///e:/myliberty-portal/src/features/dashboard/instructor/useInstructorWorkspace.js) | **CREATED** | Shared workspace hook for roster, classes listener, and directives. |
| [`src/features/dashboard/instructor/index.js`](file:///e:/myliberty-portal/src/features/dashboard/instructor/index.js) | **MODIFIED** | Re-exported `useInstructorWorkspace`. |
| [`src/features/dashboard/InstructorDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/InstructorDashboard.jsx) | **MODIFIED** | Slimmed ordinary instructor dashboard (8 tabs, removed leader logic). |
| [`src/features/dashboard/InstructorLeaderDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/InstructorLeaderDashboard.jsx) | **CREATED** | Dedicated leader dashboard (9 tabs with unconditional Academic Approvals). |
| [`src/App.jsx`](file:///e:/myliberty-portal/src/App.jsx) | **MODIFIED** | Lazy loaded `InstructorLeaderDashboard` and split routing blocks. |
| [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md) | **MODIFIED** | Added `InstructorLeaderDashboard.jsx` to the 2 component listings. |
| [`src/features/dashboard/InstructorDashboard.test.js`](file:///e:/myliberty-portal/src/features/dashboard/InstructorDashboard.test.js) | **CREATED** | Pinned ordinary instructor 8-tab render & no approvals. |
| [`src/features/dashboard/InstructorLeaderDashboard.test.js`](file:///e:/myliberty-portal/src/features/dashboard/InstructorLeaderDashboard.test.js) | **CREATED** | Pinned leader 9-tab render, verbatim `ApprovalInbox` props & badge. |
| [`src/features/dashboard/instructor/instructorRouting.test.js`](file:///e:/myliberty-portal/src/features/dashboard/instructor/instructorRouting.test.js) | **CREATED** | Pinned routing dispatch matrix across all roles and divisions. |
| [`docs/reports/instructor-leader-dashboard/00-phase0-file-split.md`](file:///e:/myliberty-portal/docs/reports/instructor-leader-dashboard/00-phase0-file-split.md) | **CREATED** | This comprehensive completion report. |
