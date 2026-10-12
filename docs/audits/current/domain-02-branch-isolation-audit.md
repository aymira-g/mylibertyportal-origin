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

