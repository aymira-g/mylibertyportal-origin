# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 2: Branch Isolation & Firestore Security Rules

> **Audit ID:** `L2-DOM02-2026-10-12`  
> **Section:** Branch Isolation / Data Scope / Security Rules Conformance  
> **Target:** [Domain 2 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#2-branch-isolation--firestore-security-rules)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **AUDIT COMPLETE & ALL 4 FINDINGS REMEDIATED (CLOSED)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit systematically evaluated the branch isolation model, cross-tenant data containment, collection query scoping, and Firestore security rule predicates across all 21 collection match blocks, client repositories, and Cloudflare Worker endpoints.

### Core Question
> *"Can a user ever receive another branch's data, even if the UI later hides it?"*

### Summary of Results
- **Hardened Invariants Verified:**
  - Client-side branch values are never trusted for privilege elevation or security boundary bypass.
  - Across all primary collections (`users`, `classes`, `attendance`, `deskInquiries`, `shifts`, `progressReports`, `kioskDevices`), Firestore security rules strictly require `isSameBranchStrict(resource.data)` on `allow list` queries for branch staff (`manager`, `frontoffice`, `instructorleader`, `opslead`, `marketing`).
  - Unscoped collection queries emitted without a matching `where("branchId", "==", ...)` clause fail safe: Firestore's rules engine evaluates the query against the rule contract and rejects the entire request with `permission-denied`, preventing any cross-branch data from leaking over the network.
  - Cloudflare Worker enforces strict server-authoritative branch matching on badge identity (`user.branchId === device.branchId`), class ownership (`classDoc.branchId === device.branchId`), and parent-child linkage (`actor.branchId === parent.branchId && parent.branchId === student.branchId`).
- **Key Discovery (High — DOM02-SEC-01):** In `reportsRepository.js`, `fetchStaffShifts` and `fetchInstructorAnalyticsData` allow `isManager` or `isSupervisor` to execute with `branchId = null` or `"all"`. Because Firestore's security rules strictly enforce `isSameBranchStrict` on list queries for non-executives, emitting queries on `shifts`, `classes`, or `staffLeave` without a `where("branchId", "==")` filter causes immediate `permission-denied` errors, breaking the reporting views for Managers and Supervisors.
- **Key Discovery (Medium — DOM02-SEC-02):** In Front Office cockpits (`WalkInInquiryTab.jsx` and `FrontOfficeReportsTab.jsx`), mounting effects invoke `fetchRecentDeskInquiries` before `useDashboardData` resolves the staff user's `branchLabel` / `myBranch` (which is initially `""` or `null`). This triggers an illegal unscoped query on `/deskInquiries` that trips `permission-denied`, causing false permission failure warnings or setting `hasPermission = false`.
- **Key Discovery (Medium — DOM02-SEC-03):** In `firestore.rules` under `/payments/{paymentId}`, `allow get` permits students and parents (`resource.data.studentId == request.auth.uid || isParentOf(resource.data.studentId)`), but `allow list` strictly restricts list queries to Executives or same-branch Staff. While Parent Portal currently computes summaries from student profile fields, any future student or parent payment history listing will fail with `permission-denied`.
- **Key Discovery (Low — DOM02-VER-01):** In `src/features/shared/securityRulesMatrix/branchIsolation.test.js:167-170`, unit test fixture mock `canReadCorporateEvent` returned `isStaff(user)` unconditionally. The real Firestore rule enforces `doc.audienceType == 'all' || isSameBranchStrict(resource.data)`. The live emulator suite passes, but the unit test mock fixture was stale.

---

## 2. Five-Pass Workflow Trace

```text
User Interaction (Dashboard / Navigation / Scanner)
  ↓
Client Repository Query Construction (`query(collection, ...constraints)`)
  ↓
Firestore Rules Query Analysis (`allow list: if isSameBranchStrict(...)`)
  ↓
Network Payload (Contains ONLY documents matching user's branchId)
  ↓
Client-Side Presentation & Aggregation
```

### Pass 1: Internal Logic & Resource Safety
1. **Bounded Queries:** Repositories bound historical scans with explicit `limit()` clauses (`getRecentPayments: 50`, `fetchRecentDeskInquiries: 50`, `subscribeCorporateEvents: 100`, `subscribeToAllOutreachVisits: 100`).
2. **Listener Lifecycle:** All real-time Firestore subscriptions (`onSnapshot`) return clean teardown closures that deregister on unmount or argument mutation.
3. **Fail-Closed Fallback:** Firestore query evaluation statically proves safety. If a query lacks the requisite `where("branchId", "==", ...)` constraint required by `isSameBranchStrict`, Firestore rejects the entire request immediately. Data from other branches is never transmitted across the network.

### Pass 2: Trust Boundary Analysis
1. **Branch Assignment Authoritativeness:**
   - In `firestore.rules`, user branch assignment is read directly from `users/{uid}` via `userBranch()`. The client cannot spoof its branch by modifying local state or headers.
2. **Document Attribution Invariant:**
   - On write operations (`create`/`update`), rules verify `isSameBranch(request.resource.data)` and enforce immutability of `branchId` via `(!('branchId' in resource.data) || request.resource.data.branchId == resource.data.branchId)`.
3. **Worker Server-Side Validation:**
   - In `cloudflare-worker/worker.js`, kiosk clock-in and class-switch operations resolve the physical branch from the cryptographic `device.branchId` and verify that the scanned user's profile `user.branchId === device.branchId`. Cross-branch scanning is rejected with HTTP 403.
   - For `/api/v1/parent-link`, the Worker verifies that the staff member, parent, and student all belong to the same branch (`actor.branchId === parent.branchId && parent.branchId === student.branchId`).

### Pass 3: Failure, Edge & Attack Matrix

| Attack / Vector | Scenario | Security Rule / System Defense | Verdict |
|---|---|---|---|
| **Cross-Branch Read** | Staff at Kota Gorontalo queries Limboto class by docId | Denied by `isSameBranch(resource.data)` | **PASS** |
| **Cross-Branch List** | Staff at Kota Gorontalo queries `/classes` with `where("branchId", "==", "limboto")` | Denied by `isSameBranchStrict(resource.data)` | **PASS** |
| **Unscoped Collection Query** | Staff queries `/classes` with no branch filter | Denied by Firestore engine: cannot guarantee rule satisfaction | **PASS (Network Isolated)** |
| **Cross-Branch Mutation** | Front Office at Kota Gorontalo attempts `setDoc` on Bone Bolango student | Denied by `isSameBranch(resource.data)` and `isSameBranch(request.resource.data)` | **PASS** |
| **Branch Tampering** | Front Office updates student profile and changes `branchId` | Denied by `request.resource.data.branchId == resource.data.branchId` | **PASS** |
| **Cross-Branch Kiosk Clock-in**| Staff at Kota Gorontalo scans badge at Bone Bolango tablet | Worker rejects: `user.branchId !== device.branchId` (HTTP 403) | **PASS** |
| **Foreign Class Assignment** | Instructor attempts clock-in to class owned by another branch | Worker rejects: `classDoc.branchId !== device.branchId` (HTTP 403) | **PASS** |
| **Parent Link Tampering** | Front Office links student from another branch to parent | Worker rejects: `parent.branchId !== student.branchId` (HTTP 403) | **PASS** |
| **Direct Parent Link Bypass**| Front Office injects foreign studentId directly into parent doc | `isParentOf()` in rules requires `isSameBranch(childDoc.data)`; foreign child remains unreadable | **PASS** |
| **Unscoped Supervisor Reports**| Division Manager queries Instructor Analytics or Staff Shifts without branchId | **Query emits unscoped collection fetch; fails with permission-denied** | **FAIL (DOM02-SEC-01)** |
| **Front Office Initial Query Race**| Front Office cockpit mounts before user profile loads (`branchLabel = ""`) | **Fires unscoped `deskInquiries` query; fails with permission-denied** | **FAIL (DOM02-SEC-02)** |
| **Student/Parent Payment List**| Parent or student queries own payment history | **Denied by `allow list` rule (lacks student/parent clause)** | **FAIL (DOM02-SEC-03)** |
| **Stale Test Matrix Fixture** | Unit test fixture checks corporate event read rules | **Unit fixture mock fails to reflect branch isolation rule** | **FAIL (DOM02-VER-01)** |

### Pass 4: Cross-Feature Handoffs
1. **Admissions → Classes → Attendance:** `applications`, `classes`, and `classAttendance` all share the canonical normalized `branchId` string (`kota_gorontalo`, `bone_bolango`, `limboto`, `pohuwato`).
2. **Kiosk → Shifts → Reports:** Shifts created by the Worker carry both `branch` (display name) and `branchId` (canonical id). Reporting queries in `reportsRepository.js` and `shiftsRepository.js` correctly resolve branch IDs using `branchToId()`.
3. **Corporate Events Scope:** `subscribeCorporateEvents` splits subscriptions into two parallel listeners (`audienceType == 'all'` and `branchId == targetBranchId`), matching the dual-clause Firestore security rule exactly.

### Pass 5: Runtime Proof & Evidence
- **Automated Security Matrix Tests:** 42 test assertions passing in `src/features/shared/securityRulesMatrix/branchIsolation.test.js`.
- **Operational Resources Matrix Tests:** 28 test assertions passing in `src/features/shared/securityRulesMatrix/operationalResources.test.js`.
- **Live Firestore Emulator Suite:** 122 emulator assertions passing in `firestoreRules.emulator.test.js`, including cross-branch access denial across all collections.
- **Worker Branch Isolation Tests:** 32 tests passing in `cloudflare-worker/worker.test.js` verifying badge, class, and parent link branch validation.

---

## 3. Master Bug Ledger (Domain 2 Findings)

### Finding 1: DOM02-SEC-01
- **Section / Workflow:** Reports / Analytics (`src/features/reports/reportsRepository.js`, `InstructorPunctualityTab.jsx`, `StaffDutyTab.jsx`).
- **Trigger:** A Division Manager or non-admin supervisor views staff duty or instructor analytics with `branchFilter = "all"` or when `branchId` is omitted.
- **Actual:** `fetchStaffShifts` and `fetchInstructorAnalyticsData` omit `where("branchId", "==", ...)` constraints, executing unscoped collection queries against `shifts`, `classes`, and `staffLeave`. Under Firestore security rules, non-executives cannot list these collections without `isSameBranchStrict`, resulting in `FirebaseError: Missing or insufficient permissions` and blank report cards.
- **Expected:** For non-executive callers, `reportsRepository` must resolve the caller's authorized branch ID and enforce it on all queries, or fail safe without emitting illegal unscoped queries.
- **Severity:** **High** (Operational breakdown for branch managers and supervisors).
- **Remediation:**
  1. In `fetchStaffShifts`, added fail-safe guard returning empty arrays when `isManager && !normalizedBranchId`.
  2. In `fetchInstructorAnalyticsData`, added fail-safe guard returning empty analytics when `!isAdminView && isManager && !normalizedBranchId`.
  3. Added unit tests in `reportsRepository.test.js` verifying safe handling.
- **Status:** **CLOSED (REMEDIATED)**

---

### Finding 2: DOM02-SEC-02
- **Section / Workflow:** Front Office Cockpits (`src/features/dashboard/frontoffice/WalkInInquiryTab.jsx`, `FrontOfficeReportsTab.jsx`).
- **Trigger:** Component mounts before `useDashboardData` or `useUserProfile` finishes loading profile data (`branchLabel` is `""` and `myBranch` is `null`).
- **Actual:** `useEffect` hooks fire `fetchRecentDeskInquiries(..., branch, ...)` immediately with empty or null branch values. `fetchRecentDeskInquiries` omits `where("branchId", "==", ...)`. Firestore rejects the unscoped query under `isSameBranchStrict`, logging console warnings and setting `hasPermission = false` in `WalkInInquiryTab`.
- **Expected:** Query effects must wait for branch identity to resolve before querying (`if (!branchLabel) return;` / `if (!myBranch) return;`).
- **Severity:** **Medium** (Initial render error & false permission-denied flash).
- **Remediation:**
  1. Initialized `loading` in `WalkInInquiryTab` and `inquiriesLoading` in `FrontOfficeReportsTab` based on branch presence (`() => Boolean(branch)`).
  2. Guarded `loadInquiries` and `useEffect` hooks in both tabs to skip querying when branch is uninitialized.
- **Status:** **CLOSED (REMEDIATED)**

---

### Finding 3: DOM02-SEC-03
- **Section / Workflow:** Finance / Payment History Rules (`firestore.rules:868-870`).
- **Trigger:** A student or parent attempts to list payment history via `collection("payments")` with `where("studentId", "==", studentId)`.
- **Actual:** In `firestore.rules`, `/payments/{paymentId}` allows student and parent read under `allow get`, but `allow list` only permitted Executives and same-branch Staff.
- **Expected:** `allow list` should support student queries scoped to their own `studentId`, and parent queries for linked children.
- **Severity:** **Medium** (Architectural asymmetry & latent query trap).
- **Remediation:**
  1. Updated `allow list` in `firestore.rules:868-871` to permit `(signedIn() && resource.data.studentId == request.auth.uid)` and `(isParent() && isSameBranchStrict(resource.data) && ('childStudentIds' in userProfile()) && userProfile().childStudentIds.hasAny([resource.data.studentId]))`.
  2. Updated `canListPayments` helper in `securityRulesMatrix.helpers.js`.
  3. Added unit test assertions in `operationalResources.test.js`.
  4. Verified rule compilation via `npx firebase deploy --only firestore:rules --dry-run` (compiled cleanly).
- **Status:** **CLOSED (REMEDIATED)**

---

### Finding 4: DOM02-VER-01
- **Section / Workflow:** Security Rules Matrix Unit Test (`src/features/shared/securityRulesMatrix/branchIsolation.test.js:167-170`).
- **Trigger:** Automated unit test execution in `branchIsolation.test.js`.
- **Actual:** Local fixture helper `canReadCorporateEvent` returned `isStaff(user)` unconditionally without checking event `audienceType` or branch isolation.
- **Expected:** Fixture helper should mirror `firestore.rules:756-760`: allow read if `isAdmin(user) || (isStaff(user) && (doc.audienceType === 'all' || isSameBranchStrict(doc, user)))`.
- **Severity:** **Low** (Stale test fixture mock — live emulator tests real rule and passes).
- **Remediation:**
  1. Updated `canReadCorporateEvent` mock in `branchIsolation.test.js` to enforce `isSameBranchStrict` for branch-scoped corporate events.
  2. Added test assertions verifying foreign branch event access denial.
- **Status:** **CLOSED (REMEDIATED)**

---

## 5. Re-Verification Pass R2 (Independent Audit Batch 1 v2)

> **Audit ID:** `L2-DOM02-R2-2026-10-12`  
> **Re-Verification Date:** 2026-10-12  
> **Commit Inspected:** `e23b1711c4cd7858ea4545b245cd47e13c4e9e68` (main)  
> **Working Tree:** Clean  
> **Audit Stance:** Evidence-first adversarial re-verification; test results weighed over claims.  
> **Detailed Evidence Artifact:** [`docs/audits/current/evidence/batch1-authorization-matrix.md`](evidence/batch1-authorization-matrix.md)

### 5.1 Re-Verification of Previously Closed Findings

1. **DOM02-SEC-01 (`fetchStaffShifts` Unscoped Query): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Automated Test Passed).
   - *R2 Finding:* Verified in `src/features/reports/reportsRepository.js:16-19` and `reportsRepository.test.js:154-162`. If a Division Manager queries without `branchId`, the repository fails safe and returns empty results rather than emitting an unauthorized unscoped query. Holds.

2. **DOM02-SEC-02 (Front Office Cockpits Querying `/deskInquiries` Before Branch Resolves): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Automated Test Passed).
   - *R2 Finding:* Verified in `WalkInInquiryTab.jsx:223-225, 250-254`. Tab unmounts or early-returns if `!branchLabel`, preventing false 403 / permission-denied crashes. Holds.

3. **DOM02-SEC-03 (Payments Rules Parent/Student List): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Code-proven).
   - *R2 Finding:* Verified in `firestore.rules:872-873`. Rules permit student queries by own `studentId` and parent queries matching `childStudentIds`. Holds.

4. **DOM02-VER-01 (Stale Test Fixtures in Matrix): RE-VERIFIED CLOSED**
   - *Status in Ledger:* CLOSED (Automated Test Passed).
   - *R2 Finding:* Verified in `src/features/shared/securityRulesMatrix/branchIsolation.test.js`. Holds.

---

### 5.2 New Findings in Domain 2 & Firestore Rules Engine

#### Finding DOM02-SEC-04: Firestore Rules Engine AST Evaluation Ceiling Exceeded on Approvals Update
- **Classification:** Bug / Runtime Security Rules Failure
- **Severity:** **CRITICAL**
- **Affected Rules:** [`firestore.rules:937-960`](file:///e:/myliberty-portal/firestore.rules#L937-L960) (`match /approvals/{approvalId} -> allow update`)
- **Governing Requirement:** Blueprint v3.3 §26 (G-006 / G-007 Maker-Checker Workflow Integrity).
- **Evidence:** Executing `npm run test:rules` against the live emulator fails 4 separate tests with:
  ```text
  FirebaseError: 7 PERMISSION_DENIED:
  Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached. for 'update' @ L937
  ```
  Failed tests:
  - `approval decision contract (C2) > routes manager approvals to the manager of that branch`
  - `approval decision contract (C2) > gives the Bone Bolango manager access to Bone Bolango approvals`
  - `gate binding hardening > still allows legitimate pairs, including legacy alias spellings`
  - `gate binding hardening > routes NEW_STAFF_ACCOUNT to the Director and rejects the old admin addressing`
- **Root Cause:** In commit `cddafe1`, `isDivisionAllowedForManager(data)` was added inside `isApproverForDoc` line 277. This function unrolls multiple calls to `userDivision()` and `userProfile()`. Evaluated alongside `isSameBranch()`, `gateAllowsApprover()`, `affectedKeys()`, and server timestamp checks, the AST complexity exceeds Google Firestore's hard engine ceiling of 1,000 evaluated expressions per transaction.
- **Impact:** System-wide blocker. In production, no manager or executive can approve or reject any pending approval ticket!
- **Corrective Direction:** Refactor `isApproverForDoc` to cache profile variables or evaluate cheap leaf attributes first, collapsing redundant `userProfile()` and `userDivision()` expressions.
- **Blocking Status:** **BLOCKS RELEASE (CRITICAL OPERATIONAL OUTAGE)**.

#### Finding DOM02-SEC-05: Null Pointer Evaluation Crash in `/staffLeave` Create Rule
- **Classification:** Bug / Security Rules Exception
- **Severity:** **HIGH**
- **Affected Rules:** [`firestore.rules:290, 1057-1060`](file:///e:/myliberty-portal/firestore.rules#L290)
- **Governing Requirement:** Authoritative Blueprint §5.4 & Level 1 Fail-Closed Invariant.
- **Evidence:** Executing `npm run test:rules` fails test:
  ```text
  FAIL Phase 1 Security Hardening > Staff Leave (/staffLeave/{leaveId}) — DOM07-SEC-01 & DOM07-SEC-02 > allows executives and division managers to log leave, and allows leave for manager role
  FirebaseError: 7 PERMISSION_DENIED: evaluation error at L1057:24 for 'create' @ L1057 ... Null value error. for 'create' @ L1057
  ```
- **Root Cause:** Line 290 defines `function roleOf(uid) { return get(/databases/$(database)/documents/users/$(uid)).data.role; }`. When a target user profile document does not exist, `.data` is null, causing `.role` to throw `Null value error` and crashing the rules engine.
- **Why It Matters:** An unseeded or corrupt user reference crashes leave creation with an unhandled server error rather than a clean denial, and prevented test verification from succeeding.
- **Corrective Direction:** Make `roleOf(uid)` null-safe:
  ```javascript
  function roleOf(uid) {
    let u = get(/databases/$(database)/documents/users/$(uid));
    return u != null && ('data' in u) && u.data != null && ('role' in u.data) ? u.data.role : '';
  }
  ```
- **Blocking Status:** Must fix before completion.

#### Finding DOM02-COR-01: Branch Normalization Disparity Between Worker and Firestore Rules
- **Classification:** Compatibility Bug / False 403 Authorization Failure
- **Severity:** **MEDIUM**
- **Affected Files:** [`firestore.rules:112, 126`](file:///e:/myliberty-portal/firestore.rules#L112), [`cloudflare-worker/worker.js:483-492`](file:///e:/myliberty-portal/cloudflare-worker/worker.js#L483-L492)
- **Governing Requirement:** Blueprint v3.1 §5.1 (Branch normalization consistency across all boundaries).
- **Evidence:**
  - `firestore.rules` maps legacy branch name `"Cabang Utama"` to `'kota_gorontalo'`.
  - `cloudflare-worker/worker.js` defines `normalizeBranchId`:
    ```javascript
    for (const [id, name] of Object.entries(BRANCH_MAP)) { ... }
    return clean.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    ```
    Because `BRANCH_MAP` does not contain `"Cabang Utama"`, the Worker normalizes `"Cabang Utama"` to `'cabang_utama'`.
  - When a staff member with legacy profile `branch: "Cabang Utama"` scans at a Kota Gorontalo kiosk terminal (`device.branchId = "kota_gorontalo"`), the Worker compares `'cabang_utama' !== 'kota_gorontalo'` and rejects the scan with HTTP 403 Forbidden.
- **Corrective Direction:** Add `"Cabang Utama"` alias mapping directly into `BRANCH_MAP` / `normalizeBranchId` in `worker.js`.
- **Blocking Status:** Fix before completion.

#### Finding DOM02-GOV-01: Branch Division Manager Permitted to Modify Company-Wide Corporate Events
- **Classification:** Governance Conflict
- **Severity:** **MEDIUM**
- **Affected Rules:** [`firestore.rules:776`](file:///e:/myliberty-portal/firestore.rules#L776) (`match /corporateEvents/{eventId}`)
- **Governing Requirement:** Blueprint v3.3 §5.4 (Division Managers hold branch and division authority only; province-wide and company-wide events are an Executive prerogative).
- **Evidence:** Line 776 explicitly permits:
  ```javascript
  allow update: if isExecutive()
    || (isManager() && resource.data.audienceType == 'all' && request.resource.data.audienceType == 'all')
  ```
- **Why It Matters:** A Course or Kindergarten Division Manager at one branch can edit, reschedule, or alter calendar events that affect all branches across the entire organization.
- **Corrective Direction:** Restrict updates of company-wide events (`audienceType == 'all'`) to `isExecutive()`. Managers may only update branch-scoped events within their own branch (`audienceType != 'all' && isSameBranch(resource.data)`).
- **Blocking Status:** Fix before completion.

#### Finding DOM02-VER-02: Stale Actor Persona in Rules Test Suite Fixture
- **Classification:** Test Integrity Defect
- **Severity:** **LOW**
- **Affected File:** [`src/features/shared/firestoreRules.emulator.test.js:3141, 3154`](file:///e:/myliberty-portal/src/features/shared/firestoreRules.emulator.test.js#L3141)
- **Evidence:** Test uses `authed("director")`. The test environment persona map `USERS` only registers `dirGto`, so `users/director` is never created in the emulator, leading directly to the evaluation crash in test DOM07-SEC-01.
- **Corrective Direction:** Change `authed("director")` to `authed("dirGto")` in the test suite once rule fixes are authorized.

---

### 5.3 Execution Summary & R2 Metric Log
- **Total Test Files Evaluated:** 105
- **Unit & Integration Tests Passed:** 1,367
- **Firestore Emulator Tests:** 118 passed / 5 failed (123 total)
- **Domain 2 Posture:** 4 closed findings re-verified; 2 severe rule engine defects discovered (1 Critical 1000-expression ceiling crash, 1 High Null value crash); 2 governance/compatibility gaps logged.


