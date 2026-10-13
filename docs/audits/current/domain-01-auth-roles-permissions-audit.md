# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 1: Authentication, Roles & Permissions

> **Audit ID:** `L2-DOM01-2026-10-12`  
> **Section:** Authentication / Identity / Role Authorization  
> **Target:** [Domain 1 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#1-authentication--roles--permissions)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **AUDIT COMPLETE & ALL 4 FINDINGS REMEDIATED (CLOSED)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit inspected the complete authentication, session, role normalization, and permission enforcement chain across client UI, repositories, schemas, and Firestore security rules.

### Core Question
> *"Does every layer agree on what a user's role actually is, and can any client supply or mutate unauthorized authority?"*

### Summary of Results
- **Hardened Invariants Verified:** Role elevation, self-privilege escalation prevention, terminated staff lockout, invite token binding, and session listener lifecycles are **strictly enforced** and verified by automated emulator suites.
- **Key Discovery (High):** Direct staff creation modal in `AdminDashboard` and `ViceDirectorDashboard` (`handleAddStaff` → `createStaffAccount`) permanently fails with `permission-denied` because the recent OD-IL-ENF4 security rule hardening strictly requires an approved `NEW_STAFF_ACCOUNT` dual-control envelope or an invite token to create staff records. The legacy UI form does not attach an envelope.
- **Key Discovery (Medium):** The floating `DevQuickSwitcher` is exposed in production builds to executive users due to an `isExecutiveRole` fallback in `App.jsx`, leaking test account emails and dead controls in live environments.
- **Key Discovery (Low):** Terminology drift in `InvitesPanel.jsx` labels the `manager` role as "Campus Manager" rather than "Division Manager" (violating Authoritative Blueprint §5.4 / Principle 10).
- **Key Discovery (Low):** When an enrolled student (`role: "student"`) logs into the main web portal (`/`), `App.jsx` presents them with an "Account Pending Role Assignment" card prompting them to "Request Staff Role Approval".

---

## 2. Five-Pass Workflow Trace

```text
Login / Invite / Onboarding
  ↓
Firebase Auth Credential (UID / Email)
  ↓
users/{uid} Profile Fetch / Subscription (`useUserProfile.js` / `App.jsx`)
  ↓
Role Normalization & Branch Scoping (`roles.js`, `branches.js`, `divisions.js`)
  ↓
Dashboard Routing (`App.jsx` Role Switcher)
  ↓
Direct Mutation & Action Gates (`firestore.rules` & `approvalsRepository.js`)
```

### Pass 1: Internal Logic & Resource Safety
1. **Session & Idle Timeout:** `App.jsx` enforces a 30-minute idle timer (`IDLE_TIMEOUT`) with a 30-second warning dialog. Activity resets across `mousedown`, `mousemove`, `keypress`, `scroll`, and `touchstart`. Event listeners and timers are cleanly deregistered on unmount.
2. **Listener Cleanup:** `useUserProfile.js` manages profile subscriptions with clean cancellation of prior listeners on auth changes and unmount. `App.jsx` terminates the live active session monitor on sign-out.
3. **Quota & Bounded Queries:** Profile resolution is a single document `get`/`onSnapshot` on `users/{uid}`. No collection-wide queries or retry storms exist in the authentication path.

### Pass 2: Trust Boundary Analysis
1. **Role Attribution:** Client-supplied `role` strings are never trusted by Firestore rules. Every sensitive rule inspects `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`.
2. **Self-Profile Mutation:** In `firestore.rules:641-644`, users updating their own profile can ONLY modify `['displayName', 'phone', 'dob', 'photoURL', 'nickname']`. Mutations touching `role`, `status`, `branch`, `branchId`, or `division` are denied.
3. **Role Elevation:** Gated behind `isApprovedRoleElevation()` in `firestore.rules:326-340`, requiring an approved `STAFF_ROLE_ELEVATION` ticket decided by Director or Vice Director with anti-self-approval checks (`requestedByUid != decidedByUid` and `decidedByUid != targetUserId`).
4. **Deactivated Staff:** Every rule helper (`hasRole`, `isManager`, `isStaff`, `isFrontOffice`, `isOpsLead`, `isFrontDeskStaff`, `isInstructorLeader`) enforces `(!('status' in p) || (p.status != 'resigned' && p.status != 'terminated'))`. Deactivated staff immediately lose all read and write privileges.

### Pass 3: Failure, Edge & Attack Matrix

| Vector | Scenario / Test | System Behavior | Verdict |
|---|---|---|---|
| **Auth Bypass** | Unauthenticated user calls Firestore reads/writes | Denied by `signedIn()` | **PASS** |
| **Self-Promotion** | Staff writes `role: "admin"` to own document | Denied by `diff().affectedKeys().hasOnly(...)` | **PASS** |
| **Terminated Staff** | Resigned staff queries students or classes | Denied by `status != 'resigned'` in all rule helpers | **PASS** |
| **Active Termination** | Admin marks staff resigned while logged in | Real-time `onSnapshot` in `App.jsx` detects status and forces instant signout | **PASS** |
| **Invite Tampering** | User alters `role` or `branchId` during `/join/:token` | `isInviteValid()` validates fields against stored invite; write rejected | **PASS** |
| **Invite Replay** | User re-submits expired or already-used invite | Rejected by `completeStaffSignup` batch delete and `isInviteValid` | **PASS** |
| **Dual Account Collision**| User with existing email attempts new signup | `auth/email-already-in-use` caught, error surfaced cleanly | **PASS** |
| **Role Elevation Bypass**| Executive elevates role without approval envelope | Denied by `isApprovedRoleElevation` check in rules | **PASS** |
| **Self-Approval Elevation**| Approver elevates own account | Denied by `approval.decidedByUid != targetUserId` in rules | **PASS** |
| **Direct Staff Creation** | Admin creates staff account via UI modal | **DENIED by rules (OD-IL-ENF4)**; modal fails with error toast | **FAIL (DOM01-SEC-01)** |
| **Dev Switcher Leak** | Executive logs into production build | **DevQuickSwitcher floating button renders in production** | **FAIL (DOM01-SEC-02)** |
| **Student Login Routing**| Student logs in at `/` | **Prompts student to request staff role onboarding** | **FAIL (DOM01-UX-01)** |
| **Terminology Drift** | Generating invite for manager | **Role labelled "Campus Manager" instead of "Division Manager"** | **FAIL (DOM01-GOV-01)** |

### Pass 4: Cross-Feature Handoffs
1. **Invite → Signup → Dashboard:** Token created in `InvitesPanel.jsx` (`invitesRepository.createInvite`) writes canonical `branchId` and `division`. `StaffSignup.jsx` reads `/invites/{token}`, creates Firebase Auth credential, and atomically writes `/users/{uid}` while deleting the invite. On login, `App.jsx` normalizes role and mounts the correct dashboard cleanly.
2. **Onboarding → Approval Queue:** An unprovisioned user submitting a request triggers `submitStaffOnboardingRequest` (`approvalsRepository.js`), correctly routed to `approverRole: "director"` at province scope.

### Pass 5: Runtime Proof & Evidence
- **Automated Unit Tests:** 45 tests passing in `src/features/auth/` and `src/features/shared/roles.test.js` / `useUserProfile.test.js`.
- **Authorization Matrix Tests:** 13 security rules matrix assertions passing in `userAuthorization.test.js`.
- **Invites Repository Tests:** 6 tests passing in `invitesRepository.test.js`.
- **Live Emulator Suite:** 122 rules tests passing in `firestoreRules.emulator.test.js` (including `OD-IL-ENF4` new staff account tests and role elevation tests).

---

## 3. Master Bug Ledger (Domain 1 Findings & Remediations)

### Finding 1: DOM01-SEC-01
- **Section / Workflow:** Authentication / Staff Account Provisioning (`AdminDashboard.jsx`, `ViceDirectorDashboard.jsx`, `useDashboardData.js`, `StaffDirectory.jsx`).
- **Trigger:** An Administrator or Vice Director opened the staff directory, clicked "Add Staff", and attempted direct account creation without an invite token or approval envelope.
- **Actual:** Direct `setDoc` on `users/{uid}` failed with `permission-denied` under OD-IL-ENF4 rules enforcement (`firestore.rules:555-564`), causing secondary auth rollback and error toasts.
- **Remediation:**
  1. In `StaffDirectory.jsx`, removed `onAddStaff` prop and the `Add Staff Account` button; promoted `Invite Staff` as the primary action button (`bg-[#1a3a8f] text-white`).
  2. In `AdminDashboard.jsx`, removed `onAddStaff={handleAddStaff}` from `<StaffDirectory>`, changed the "System Quick Actions" launcher button from "Add Staff" to "Staff Directory" (`onClick={() => handleTabChange("directory")}`).
  3. In `ViceDirectorDashboard.jsx`, removed `onAddStaff={handleAddStaff}` from `<StaffDirectory>`.
  4. In `useDashboardData.js`, guarded `handleSave` so un-enveloped staff creation without an invite displays a clear security policy notice and redirects to `invites`. Updated `handleAddStaff` to redirect to `invites`.
- **Severity:** **High** (Operational workflow failure — direct staff creation is broken).
- **Status:** **CLOSED (REMEDIATED)**

### Finding 2: DOM01-SEC-02
- **Section / Workflow:** Authentication / Dev Presets & Switcher (`src/App.jsx:101`, `src/features/shared/DevQuickSwitcher.jsx`).
- **Trigger:** A Director, Vice Director, or Admin logged into the application in a production build (`import.meta.env.DEV === false`).
- **Actual:** In `App.jsx:101`, `canUseDevSwitcher` used an `|| isExecutiveRole(role)` fallback, causing the floating Dev Switcher to render in production builds and exposing test account credentials.
- **Remediation:** In `src/App.jsx`, changed `canUseDevSwitcher = Boolean(isDevSwitcherEnabled);` so the switcher strictly mounts only when `isDevSwitcherEnabled` (which requires `import.meta.env.DEV`) is true.
- **Severity:** **Medium** (Information disclosure & dead UI in production).
- **Status:** **CLOSED (REMEDIATED)**

### Finding 3: DOM01-GOV-01
- **Section / Workflow:** Staff Invites / Role Normalization (`src/features/staff/InvitesPanel.jsx:34, 242`).
- **Trigger:** Administrator or Executive selects a role when creating a new staff invitation.
- **Actual:** Dropdown option and role badge read "Campus Manager" / "Manager" rather than "Division Manager".
- **Remediation:** In `src/features/staff/InvitesPanel.jsx`, updated dropdown label to "Division Manager" and role badge display map `manager: "Division Manager"`, aligning with Authoritative Blueprint v3.3 §5.4 / Principle 10.
- **Severity:** **Low** (Governance terminology drift).
- **Status:** **CLOSED (REMEDIATED)**

### Finding 4: DOM01-UX-01
- **Section / Workflow:** Authentication / Student Login Routing (`src/App.jsx:619-660`).
- **Trigger:** An enrolled student with `role: "student"` signs in at the root web portal (`/`).
- **Actual:** Student fell through the staff/parent role check and was shown an amber card prompting them to "Request Staff Role Approval".
- **Remediation:** In `src/App.jsx`, added an explicit card for `effectiveRole === "student"` explaining that attendance is logged at physical campus kiosks and learning progress is accessible to parents at `/portal`, preventing spurious staff onboarding approval tickets.
- **Severity:** **Low** (UX ambiguity & risk of spurious approval tickets).
- **Status:** **CLOSED (REMEDIATED)**

---

## 4. Verification & Audit History Record

```text
Audit ID: L2-DOM01-2026-10-12
Section: Domain 1 — Authentication / Roles / Permissions
Workflow: Login, Session Management, Role Assignment, Staff Provisioning, Invites
Audit Level: Level 2 — Section Deep Audit
Started / Completed: 2026-10-12 / 2026-10-12
Findings Logged: 4
Findings Remediated / Closed: 4 (100% closed)
Open High/Critical Items: 0
Regression Verification:
  - npm test: 102 test files passed (1,292 passed, 121 skipped, 0 failed)
  - npm run lint: 0 errors, 0 warnings
  - npm run typecheck: 0 errors
  - npm run build: Built cleanly in 3.10s
Cost & Quota Impact: 0 additional reads/writes; 100% Spark tier compliant.
Next Scheduled Deep Audit: Domain 2 — Branch Isolation & Firestore Security Rules
```

---

## 5. Re-Verification Pass R2 (Independent Audit Batch 1 v2)

> **Audit ID:** `L2-DOM01-R2-2026-10-12`  
> **Re-Verification Date:** 2026-10-12  
> **Commit Inspected:** `e23b1711c4cd7858ea4545b245cd47e13c4e9e68` (main)  
> **Working Tree:** Clean  
> **Audit Stance:** Evidence-first adversarial re-verification; test results weighed over claims.  
> **Detailed Evidence Artifact:** [`docs/audits/current/evidence/batch1-authorization-matrix.md`](evidence/batch1-authorization-matrix.md)

### 5.1 Re-Verification of Previously Closed Findings

1. **DOM01-SEC-01 (Staff Creation Envelope Hardening): REGRESSED / BLOCKED**
   - *Status in Ledger:* Marked CLOSED (Automated Test Passed).
   - *R2 Finding:* While `firestore.rules:560-563` requires `isApprovedNewStaffAccount(userId, appliedFromApproval)`, the approval update rule on `/approvals/{approvalId}` at `firestore.rules:937` currently fails with `PERMISSION_DENIED: Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached` (see DOM02-SEC-04). Consequently, **no executive can actually approve the onboarding ticket in production**, completely blocking staff provisioning.
   - *Additional Boundary Gap (DOM01-SEC-04):* `isApprovedNewStaffAccount` checks only `approval.payload.uid == targetUserId`. It does **not** bind the target `role`, `branchId`, or `division`. An approving executive or a forged direct write could assign `role: "admin"` or `role: "director"` using an envelope generated for an instructor.
   - *Updated Status:* **RE-OPENED (BLOCKED BY ENGINE BUDGET DEFECT)**.

2. **DOM01-SEC-02 (`DevQuickSwitcher` Build Exposure): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Automated Test Passed).
   - *R2 Finding:* Confirmed. `DevQuickSwitcher` text is absent from production bundles.
   - *Lead L1 Discovery (DOM01-SEC-03):* However, inspection of built asset `dist/assets/divisions-eTZKqAQZ.js` revealed that `VITE_APPCHECK_DEBUG_TOKEN` (`BE6C6D71-A7B1-4C19-A9EB-DE5DE93C7977`) is inlined into production code due to `window.location?.hostname === "localhost"` preventing tree-shaking in `src/firebase.js:66-72`.
   - *Updated Status:* `DOM01-SEC-02` holds; new finding `DOM01-SEC-03` logged below.

3. **DOM01-GOV-01 (`InvitesPanel.jsx` Role Label): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Code-proven).
   - *R2 Finding:* Confirmed. `InvitesPanel.jsx` labels `manager` as "Division Manager" (Courses / Kindergarten). No reference to removed "Campus Manager" remains. Holds.

4. **DOM01-UX-01 (Student Login Route Card): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Code-proven).
   - *R2 Finding:* Confirmed. `App.jsx:327-347` renders dedicated student guidance card without exposing staff role request form. Holds.

---

### 5.2 New Findings in Domain 1

#### Finding DOM01-SEC-03: Firebase App Check Debug Token Inlined in Production Bundle
- **Classification:** Security Vulnerability
- **Severity:** **HIGH**
- **Affected Files:** [`src/firebase.js:66-73`](file:///e:/myliberty-portal/src/firebase.js#L66-L73), [`dist/assets/divisions-eTZKqAQZ.js`](file:///e:/myliberty-portal/dist/assets/divisions-eTZKqAQZ.js)
- **Governing Policy:** Blueprint v3.3 §7 (Technical Boundary Security) & AGENTS.md (No credentials or secrets in production artifacts).
- **Evidence:** Literal token value `BE6C6D71-A7B1-4C19-A9EB-DE5DE93C7977` is present in `dist/assets/divisions-eTZKqAQZ.js`:
  ```javascript
  window.location?.hostname === "localhost" && (self.FIREBASE_APPCHECK_DEBUG_TOKEN = "BE6C6D71-A7B1-4C19-A9EB-DE5DE93C7977")
  ```
- **Why It Matters:** Any caller inspecting the client JavaScript bundle can extract the debug token and supply it to backend Firestore/Storage requests to bypass App Check verification.
- **Corrective Direction:** Gate the debug token strictly behind `import.meta.env.DEV` without the `hostname === "localhost"` runtime clause, so Vite statically eliminates the token from production builds.
- **Blocking Status:** Blocks release until resolved.

#### Finding DOM01-GOV-02: System Admin Retains Unsanctioned Business Operational Authority
- **Classification:** Governance Conflict / Privilege Escalation
- **Severity:** **HIGH**
- **Affected Rules:** [`firestore.rules:484, 687-688, 1000, 1009, 1038`](file:///e:/myliberty-portal/firestore.rules#L484)
- **Governing Requirement:** Blueprint v3.3 §7 & §26 (G-002), Principle 3: *System Admin is a technical system-access role, not an organizational position. It does not inherit Director, Vice Director, Division Manager, or business operational authority.*
- **Evidence:**
  1. `firestore.rules:484`: `canManageClassAttendance(classId)` explicitly includes `isAdmin()`. Admin can falsify student attendance.
  2. `firestore.rules:687-688`: `allow create, update: if isAdmin() || isExecutive()`. Admin can create and update academic classes, while Division Managers are completely locked out!
  3. `firestore.rules:1000, 1009`: Admin can create and update staff shifts, with unrestricted update rights on line 1009.
  4. `firestore.rules:1000, 1009, 1038`: Admin can create and update desk inquiries and applications.
- **Why It Matters:** Breaches separation of duties and allows technical administrators to forge academic, operational, and financial records.
- **Corrective Direction:** Remove `isAdmin()` from `canManageClassAttendance`, `/classes` mutations (delegating to Executive & Division Managers), and `/shifts` mutations.
- **Blocking Status:** Must fix before production release.

#### Finding DOM01-SEC-04: Unconstrained Role and Scope Binding on `NEW_STAFF_ACCOUNT` Envelopes
- **Classification:** Security Vulnerability / Data Integrity
- **Severity:** **MEDIUM**
- **Affected Files:** [`firestore.rules:444-455`](file:///e:/myliberty-portal/firestore.rules#L444-L455), [`src/features/shared/ApprovalInbox.jsx:176-198`](file:///e:/myliberty-portal/src/features/shared/ApprovalInbox.jsx#L176-L198)
- **Governing Requirement:** Blueprint v3.3 §5.4 & G-007 (Named approvers per action; single-use, tightly bound envelopes).
- **Evidence:** `isApprovedNewStaffAccount(targetUserId, approvalId)` verifies only `approval.payload.uid == targetUserId`. It does not compare `request.resource.data.role`, `branchId`, or `division` against the ticket.
- **Why It Matters:** An executive approving an onboarding ticket can arbitrarily elevate the account to `admin` or `director`, or change their assigned branch, without an audit trail of that specific entitlement being requested.
- **Corrective Direction:** Bind `payload.role`, `payload.branchId`, and `payload.division` inside the approval document and verify exact equality in `isApprovedNewStaffAccount`.
- **Blocking Status:** Fix before completion.

---

### 5.3 Execution Summary & R2 Metric Log
- **Total Test Files Evaluated:** 105
- **Unit & Integration Tests Passed:** 1,367
- **Firestore Emulator Tests:** 118 passed / 5 failed (123 total)
- **Domain 1 Posture:** 2 closed findings re-verified; 1 finding re-opened due to rules engine ceiling crash; 3 new findings logged (1 High Vuln, 1 High Gov, 1 Med Sec).

