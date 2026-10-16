# Active Proposal & Plan: BLRCA Slice 3 — Student, Child & Parent Personal Data Remediation

> **Date:** 2026-10-16  
> **Campaign:** Role & Business Logic Conformance Audit (BLRCA) — Level 2  
> **Target:** Slice 3 (Student, Child & Parent Personal Data Across Roles)  
> **Status:** `APPROVED BY OWNER KIFRY (OD-STU-1, OD-STU-2, OD-STU-3 RATIFIED)`  
> **Governing Authorities:** Blueprint v3.4 (§6, §7, §11, §12, §19, §20, §26 G-003, G-012); Invariants `INV-02`, `INV-04`, `INV-08`; Ratified Decisions `OD-STU-1`, `OD-STU-2`, `OD-STU-3`.  

---

## 1. Scope & Objective

Remediate all confirmed findings, governance conflicts, and privacy vulnerabilities identified during the **BLRCA Slice 3 Personal Data Audit** ([`docs/audits/current/role-business-logic-conformance-audit.md`](../../audits/current/role-business-logic-conformance-audit.md)):

1. **`DOM05-SEC-02` / `DOM11-SEC-01` (High — System Admin /users Personal Data Exposure & Unscoped Listener):**
   - Decouple `admin` from student and parent document access in `firestore.rules`. Allow `admin` to read, list, and update only staff accounts (`role in ['admin', 'director', 'vice_director', 'manager', 'instructor', 'frontoffice', 'opslead', 'marketing', 'officeboy', 'instructorleader', 'instructor_leader', 'ops_lead', 'frontofficelead', 'cleaner']` or unassigned accounts `!('role' in resource.data) || !(resource.data.role in ['student', 'parent'])`).
   - In `useDashboardData.js`, when `userRole === "admin"`, constrain `/users` query with `where("role", "in", STAFF_QUERY_ROLES)` so child dossiers and parent contacts are never downloaded into browser memory.
2. **`DOM05-UX-02` / `DOM11-GOV-04` (Medium — Admissions Tab Exposed to Admin with Crashing Unscoped Query):**
   - Remove `isActualAdmin` from Admissions & Leads tab visibility and render guard in `ReportsDashboard.jsx`.
   - Strip `isAdminView` fallback in `reportsRepository.js:258-264`.
3. **`DOM05-GOV-02` (High — Student Withdrawal & Freeze Dual-Control Gate Unhooked per OD-STU-1):**
   - Hook `STUDENT_WITHDRAWAL_OR_FREEZE` in `StudentRoster.jsx` when non-executives/non-managers (e.g. Front Office) change student status to `inactive`, `graduated`, or `archived`.
   - Wire execution into `ApprovalInbox.jsx` (`executeDownstreamAction`) so approving the ticket calls `updateStudentStatus` with `appliedFromApproval: approval.id` and seals the ticket.
   - Enforce the approval gate in `firestore.rules` `canUpdateUser` when student `status` transitions to `['inactive', 'graduated', 'archived']`.
4. **`DOM05-PRIV-01` (High — Bulk CSV Export of Child PII and Parent WhatsApp Numbers on Instructor Roster):**
   - In `StudentRoster.jsx`, hide and disable the `Export CSV` button and handler when `readOnly` is true or `userRole === "instructor"`.
5. **`DOM05-SEC-03` (Low — Facilities / Office Boy Granted Access on Prospect Leads):**
   - In `firestore.rules` under `/deskInquiries/{inquiryId}`, replace `isStaff()` with `(isOrgExecutive() || isManager() || isFrontOffice() || hasRole('marketing'))`.
6. **`DOM05-GOV-03` (Medium — Central Academic Lead Blocked on Satellite Progress Reports):**
   - In `firestore.rules` under `/progressReports/{reportId}`, allow `isInstructorLeader()` to get and list progress reports province-wide per Blueprint v3.4 §4, §5, G-012.
7. **`DOM04-SEC-03` / `DOM05-SEC-04` (High — Direct Student Tuition Field Updates Bypass Payments per OD-STU-2):**
   - Guard tuition field updates in `firestore.rules` (`canUpdateUser`) for `isStaffOrMgr` on `student` docs: require `lastPaymentId` verifying an atomic batch with a brand-new `/payments/{lastPaymentId}` record.
   - Add `lastPaymentId: paymentRef.id` to `studentUpdate` in `paymentsRepository.js:recordPayment`.
   - Add `lastPaymentId`, `isInstallment`, `outstandingBalance`, `totalAgreedAmount`, `nextDueDate` to allowed `diffKeys.hasOnly` on student docs.
8. **`DOM05-PRIV-02` (Advisory — Child Headshot Storage on Cloudinary):**
   - Documented as accepted risk for free-tier $0 budget operations per ratified `OD-STU-3`.

---

## 2. Likely Files Involved

### Backend Security Rules & Emulator Helpers
- `firestore.rules` (`canUpdateUser`, `/users/{userId}` get/list, `/deskInquiries`, `/progressReports`)
- `src/features/shared/securityRulesMatrix.helpers.js` (Simulated rules matrix for unit tests)
- `src/features/shared/securityRulesMatrix/userAuthorization.test.js`
- `src/features/shared/securityRulesMatrix/operationalResources.test.js`

### UI Components & Data Hooks
- `src/features/dashboard/useDashboardData.js` (Admin staff-only `/users` query constraint)
- `src/features/reports/ReportsDashboard.jsx` (Strip Admissions tab from Admin)
- `src/features/reports/reportsRepository.js` (Strip Admin fallback on applications query)
- `src/features/students/StudentRoster.jsx` (Dual-control withdrawal hook & instructor CSV export suppression)
- `src/features/shared/ApprovalInbox.jsx` (Execution of `STUDENT_WITHDRAWAL_OR_FREEZE` downstream action)
- `src/features/finance/paymentsRepository.js` (Include `lastPaymentId` in `recordPayment` batch update)

### Master Audit Registries
- `docs/audits/current/bug-ledger.md`
- `docs/audits/current/role-function-conformance-ledger.md`
- `docs/audits/current/role-business-logic-conformance-audit.md`
- `docs/audits/current/regression-log.md`
- `docs/audits/audit-log.md`

---

## 3. Mandatory Architectural Safeguards

1. **`recordPayment` Atomic Batch Integrity:**
   - Client calls `recordPayment` in `paymentsRepository.js` using `writeBatch`.
   - The batch must simultaneously write to `/payments/{paymentId}` and `/users/{studentId}`.
   - Setting `lastPaymentId: paymentRef.id` in `studentUpdate` satisfies the rule guard:
     `!exists(/databases/$(database)/documents/payments/$(req.lastPaymentId)) && getAfter(/databases/$(database)/documents/payments/$(req.lastPaymentId)).data.studentId == userId`.
   - Direct manual edits from dev console or non-batch calls lacking a new payment doc are rejected.
2. **Admin Staff Access Without Dropping Extended Roles:**
   - Firestore's `in` operator allows up to 30 elements.
   - We query canonical and legacy staff roles: `['admin', 'director', 'vice_director', 'manager', 'instructor', 'frontoffice', 'opslead', 'marketing', 'officeboy', 'instructorleader']`.
   - Student and parent roles are strictly excluded.
3. **Dual-Control Graceful Routing:**
   - Division Manager approving their own branch student withdrawal acts as the authorized approver per `OD-STU-1`.
   - Front Office submits `STUDENT_WITHDRAWAL_OR_FREEZE` ticket to `manager`.

---

## 4. Verification & Quality Gates

- `npm test` (all 106+ test suites must pass).
- `npm run typecheck` (0 errors).
- `npm run lint` (0 errors).
- `npm run build` (clean Vite bundle).
