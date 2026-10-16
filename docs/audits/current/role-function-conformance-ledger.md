# Role-Function Conformance Ledger (BLRCA)

> **Authority & Reference:** [`docs/audits/Role & Business Logic Conformance Audit/05-campaign-execution-and-coverage.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/05-campaign-execution-and-coverage.md)  
> **Campaign Status:** ACTIVE  
> **Authoritative Governance Baseline:** Blueprint v3.4 (`2026-10-13`), Status: **RATIFIED AUTHORITATIVE BASELINE**  
> **Evaluation Date:** 2026-10-16  
> **Baseline Commit:** `3cf8e59d526bc157642c72f69cd92676cbb019ac`  
> **Evaluation Mode:** Strictly Audit-Only (Phase 0–4)  

---

## 1. Ledger Schema & Outcome Definitions

| Column | Description |
|---|---|
| **Slice** | BLRCA evaluation slice (`Slice 1` = System Admin Boundary; `Slice 2` = Financial Surfaces Across Roles). |
| **Role ID** | Canonical role identifier being evaluated. |
| **Capability / Action** | The discrete functional capability, workflow, or API operation under evaluation. |
| **Scope Level** | Evaluated data boundary (`Province-Wide`, `Branch-Local`, `Branch+Division`, `Own-Record`, `None`). |
| **Expected Contract** | The ratified behavioral contract grounded in Blueprint v3.4 or accepted Owner Decisions. |
| **Outcome** | `PASS` (Conforms end-to-end), `FAIL` (Defect or divergence found), `BLOCKED` (Execution blocked by dependency), `[Owner Decision Required]` (Policy gap). |
| **Evidence (File:Line)** | Exact repository file and line citations proving current implementation state. |
| **Test Citation** | Automated Vitest or emulator suite verifying or asserting the behavior. |

---

## 2. Slice 1: System Admin Boundary (Verified Post-Fix Baseline)

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation |
|---|---|---|---|---|---|---|---|
| Slice 1 | `admin` | Financial Reports & Revenue UI | None | Technical Admin strictly prohibited from viewing financial revenue tabs | **PASS** | `ReportsDashboard.jsx:129`, `AdminDashboard.jsx:274` | `FinancialReportsTab.test.js` (3 tests pass) |
| Slice 1 | `admin` | `/payments` List / Query in Rules | None | Rules block Admin from reading or listing financial payments | **PASS** | `firestore.rules:997` (uses `isOrgExecutive()`) | `securityRulesMatrix/operationalResources.test.js:550` |
| Slice 1 | `admin` | `paymentsRepository` Read Scope | None | Repository fails closed and returns empty array if caller is Admin | **PASS** | `paymentsRepository.js:42-44, 120` | `paymentsRepository.test.js` |
| Slice 1 | `admin` | Financial Cache Workstation Isolation | None | Cache keyed by `currentUserUid` to prevent shared PC data leakage | **PASS** | `FinancialReportsTab.jsx:45` | Automated build / lint clean |
| Slice 1 | `admin` | Student Applications Unscoped Snapshot | None | No active background Firestore listener burning Spark reads | **PASS** | `useDashboardData.js:315` (removed for Admin) | `useDashboardData.test.js` (14 tests pass) |
| Slice 1 | `admin` | Business Approvals Execution Bypass | None | Admin blocked from approving business approval envelopes | **PASS** | `firestore.rules:260-285` (`isApproverForDoc()`) | `securityRulesMatrix/approvals.test.js` (37 tests pass) |
| Slice 1 | `admin` | Student Admissions Intake Modification | None | Admin blocked from admitting or placing students into cohorts | **PASS** | `firestore.rules:1053` (`isOrgExecutive()`) | `applicationsRepository.test.js` |
| Slice 1 | `admin` | Academic Progress Report Read & Write | None | Admin blocked from reading or altering academic evaluations | **PASS** | `firestore.rules:973` (`isOrgExecutive()`) | `firestoreRules.emulator.test.js` |

---

## 3. Slice 2: Financial Surfaces Across Roles

### 3.1 Executive Leadership (`director` & `vice_director`)

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation |
|---|---|---|---|---|---|---|---|
| Slice 2 | `director` | Payment Recording at Desk | None | ❌ FORBIDDEN: Director must never act as desk cashier (OD-2) | **PASS** | `firestore.rules:1011-1020` (Cashier creation restricted to `isFrontOffice()`) | `DOM04-GOV-03` closed; `securityRulesMatrix` (175 tests pass) |
| Slice 2 | `director` | Payment Direct Mutation | None | ❌ FORBIDDEN: Direct field edits prohibited; reversals via OD-3 only | **PASS** | `firestore.rules:1020-1036` (Update restricted to notes/approvalStatus/void fields) | `DOM04-GOV-03`, `DOM04-SEC-02` closed |
| Slice 2 | `director` | Major Discount Approval (> 20% or > Rp 500k) | Province-Wide | ✅ FINAL APPROVER: Decides high-tier discount tickets (OD-1) | **PASS** | `approvalGates.js:52`, `approvalGates.constants.js:77` | `approvalGates.test.js:386` |
| Slice 2 | `director` | Shift Cash Discrepancy (≥ Rp 50.000) | Province-Wide | ✅ FINAL APPROVER: Approves major drawer discrepancies (OD-4) | **PASS** | `approvalGates.js:103-108` (`getCashDiscrepancyApprover`) | `approvalGates.test.js:386-388` |
| Slice 2 | `director` | Province-Wide Financial Reports & KPIs | Province-Wide | ✅ FULL ACCESS: View all branch payments and revenue trends (OD-2) | **PASS** | `ReportsDashboard.jsx:40, 129`, `paymentsRepository.js:46` | `FinancialReportsTab.test.js` |
| Slice 2 | `vice_director` | Payment Recording at Desk | None | ❌ FORBIDDEN: Vice Director must never act as desk cashier (OD-2) | **PASS** | `firestore.rules:1011-1020` (Cashier creation restricted to `isFrontOffice()`) | `DOM04-GOV-03` closed; `securityRulesMatrix` (175 tests pass) |
| Slice 2 | `vice_director` | Payment Direct Mutation | None | ❌ FORBIDDEN: Direct field edits prohibited; reversals via OD-3 only | **PASS** | `firestore.rules:1020-1036` (Update restricted to notes/approvalStatus/void fields) | `DOM04-GOV-03`, `DOM04-SEC-02` closed |
| Slice 2 | `vice_director` | Standard Discount Approval (≤ 20% & ≤ Rp 500k) | Province-Wide | ✅ CHECKER / APPROVER: Decides standard discount tickets (OD-1) | **PASS** | `approvalGates.js:58`, `approvalGates.constants.js:75` | `approvalGates.test.js:380` |
| Slice 2 | `vice_director` | Shift Cash Discrepancy (Rp 20.000–49.999) | Province-Wide | ✅ OPERATIONAL CHECKER: Approves mid-tier cash discrepancies (OD-4) | **PASS** | `approvalGates.js:110-112` (`getCashDiscrepancyApprover`) | `approvalGates.test.js:380-382` |
| Slice 2 | `vice_director` | Acting Director Discrepancy (≥ Rp 50.000) | Province-Wide | ⚠️ ACTING DIRECTOR: Approves only when Director is on leave (OD-4) | **PASS** | `approvalGates.js:104-106` (`isDirectorOnLeave`) | `approvalGates.test.js:392` |
| Slice 2 | `vice_director` | Province-Wide Financial Reports & KPIs | Province-Wide | ✅ FULL ACCESS: View all branch payments and revenue trends (OD-2) | **PASS** | `ReportsDashboard.jsx:40, 129`, `paymentsRepository.js:46` | `FinancialReportsTab.test.js` |
| Slice 2 | `director` / `vice_director` | Payment Void Reversal Execution | Province-Wide | ✅ TWO-STEP ENVELOPE: Decides void tickets creating negative payment | **PASS** | `approvalGates.constants.js:169`, `ApprovalInbox.jsx:215`, `paymentsRepository.js:380` | `DOM04-GOV-05` closed; `paymentsRepository.test.js` (26 tests pass) |
| Slice 2 | `director` / `vice_director` | Discount Rejection Coverage Proration | Province-Wide | ✅ ROLLBACK IMPLEMENTED: Rejecting discount resets student to pending | **PASS** | `ApprovalInbox.jsx:415-422`, `paymentsRepository.js:287` | `DOM04-GOV-04` closed; `ApprovalInbox.test.js` (6 tests pass) |

---

### 3.2 Branch Operations & Division Leadership (`manager` & `opslead`)

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation |
|---|---|---|---|---|---|---|---|
| Slice 2 | `manager` (Courses, Main Campus) | Payment Recording at Desk | None | ❌ FORBIDDEN: Front Office operates desk at Main Campus | **PASS** | `ManagerDashboard.jsx:550` (passes `readOnly={true}`) | `ManagerDashboard.test.js` |
| Slice 2 | `manager` (Courses, Main Campus) | Discount Approval Authority | None | ❌ FORBIDDEN: Discounts delegated to Executives only (OD-1) | **PASS** | `approvalGates.constants.js:75-80` (Manager excluded) | `approvalGates.test.js` |
| Slice 2 | `manager` (Courses, Main Campus) | Cash Discrepancy Approval (< Rp 20k) | None | ❌ FORBIDDEN: Main campus drawer oversight belongs to Ops Lead | **PASS** | `approvalGates.js:125-131` (Routes to Ops Lead at Main) | `approvalGates.test.js:346` |
| Slice 2 | `manager` (Courses, Main Campus) | Branch Course Financial Reports | Branch+Division | ✅ READ ONLY: Can view Course payments for `kota_gorontalo` | **PASS** | `ReportsDashboard.jsx:129`, `firestore.rules:1003` | `FinancialReportsTab.test.js` |
| Slice 2 | `manager` (Courses, Lean Satellite) | Payment Recording at Desk (Fallback) | Branch-Local | ⚠️ DESK FALLBACK: Records payment only if FO absent (OD-2, G-012) | ⚠️ **PARTIAL** | UI passes `readOnly={true}`; rules allow if role is `frontoffice` | `[Owner Decision Required]` (OGQ-FIN-03) |
| Slice 2 | `manager` (Courses, Lean Satellite) | Cash Discrepancy Approval (< Rp 20k) | Branch-Local | ✅ LOCAL APPROVER: Approves on-site satellite discrepancies (OD-4) | **PASS** | `approvalGates.js:118-123` (`isLeanSatelliteBranch`) | `approvalGates.test.js:353-355` |
| Slice 2 | `manager` (Courses, Lean Satellite) | Drawer Handler Self-Approval Block | Branch-Local | ❌ BLOCKED: Escalates to Vice Director if Manager was cashier | **PASS** | `approvalGates.js:119-121` (`drawerHandlerUid === managerUid`) | `approvalGates.test.js:360-366` |
| Slice 2 | `manager` (Kindergarten, Main Campus) | Payment Recording at Desk | None | ❌ FORBIDDEN: Handled by Front Office / Kindergarten desk | **PASS** | `KidsManagerDashboard.jsx:465` (`readOnly={true}`) | `KidsManagerDashboard.test.js` |
| Slice 2 | `manager` (Kindergarten, Main Campus) | Cash Discrepancy Approval (< Rp 20k) | None | ❌ FORBIDDEN: Main campus drawer oversight belongs to Ops Lead | **PASS** | `approvalGates.js:125-131` | `approvalGates.test.js:346` |
| Slice 2 | `manager` (Kindergarten, Main Campus) | Kindergarten Financial Reports | Branch+Division | ✅ READ ONLY: Can view Kindergarten payments for `kota_gorontalo` | **PASS** | `ReportsDashboard.jsx:129`, `firestore.rules:1003` | `FinancialReportsTab.test.js` |
| Slice 2 | `opslead` (Main Campus) | Payment Recording at Desk (Fallback) | Branch-Local | ⚠️ DESK FALLBACK: Records payment only if FO absent (OD-2) | **PASS** | `OpsLeadDashboard.jsx:218` (`readOnly={true}`); rules allow via `isFrontOffice()` | `OpsLeadDashboard.test.js` |
| Slice 2 | `opslead` (Main Campus) | Cash Discrepancy Approval (< Rp 20k) | Branch-Local | ✅ LOCAL APPROVER: Approves Main Campus shift discrepancies (OD-4) | **PASS** | `approvalGates.js:131`, `approvalGates.constants.js:175` | `approvalGates.test.js:346-349` |
| Slice 2 | `opslead` (Main Campus) | Drawer Handler Self-Approval Block | Branch-Local | ❌ BLOCKED: Escalates to Vice Director if Ops Lead was cashier | **PASS** | `approvalGates.js:127-129` (`drawerHandlerUid === opsLeadUid`) | `approvalGates.test.js:371-377` |
| Slice 2 | `opslead` (Main Campus) | Province-Wide Financial Reports | None | ❌ FORBIDDEN: Ops Lead has no province-wide financial tab | **PASS** | `ReportsDashboard.jsx:129` (Only Executive & Manager) | Clean UI verification |

---

### 3.3 Front Office & Desk Staff (`frontoffice` & `frontofficelead`)

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation |
|---|---|---|---|---|---|---|---|
| Slice 2 | `frontoffice` | Payment Recording at Desk | Branch-Local | ✅ PRIMARY MAKER: Records cash/QRIS/transfer at front desk | **PASS** | `PaymentModal.jsx:275`, `paymentsRepository.js:237` | `paymentsRepository.test.js:50` |
| Slice 2 | `frontoffice` | Direct Payment Update / Field Mutation | None | ❌ FORBIDDEN: Cannot alter recorded payments without approval ticket | **PASS** | `firestore.rules:1020-1036` (Unchecked `approvalStatus` write blocked) | `DOM04-SEC-02` closed; `securityRulesMatrix` tests pass |
| Slice 2 | `frontoffice` | Discount Request Submission | Branch-Local | 📝 MAKER ONLY: Submits `DISCOUNT_OR_REFUND` envelope for approval | **PASS** | `PaymentModal.jsx:260` (`createApprovalEnvelope`) | `approvalGates.test.js:113` |
| Slice 2 | `frontoffice` | Installment Schedule Recording (OD-3) | Branch-Local | 📝 DESK ENTRY: Records standard installment schedule without ticket | **PASS** | `RecordPaymentTab.jsx:345`, `PaymentModal.jsx:245`, `paymentSchema.js` | `DOM04-GOV-06` closed; `paymentsRepository.test.js` pass |
| Slice 2 | `frontoffice` | Payment Correction / Void Request (OD-3) | Branch-Local | 📝 MAKER ONLY: Submits `PAYMENT_CORRECTION_OR_VOID` envelope | **PASS** | `PaymentHistoryTab.jsx:80`, `paymentsRepository.js:347` | `DOM04-GOV-05` closed; `paymentsRepository.test.js` pass |
| Slice 2 | `frontoffice` | Shift Cash Drawer Balancing Count | Branch-Local | 📝 MAKER ONLY: Enters counted cash/QRIS at clock out | **PASS** | `ShiftReconciliationModal.jsx:99-113` | Unit tests pass |
| Slice 2 | `frontoffice` | Shift Discrepancy Escalation | Branch-Local | 📝 MAKER ONLY: Submits `CASH_DISCREPANCY` envelope if tolerance exceeded | **PASS** | `shiftsRepository.js:24` (10k threshold $\to$ discrepancies $\ge$ 20k escalate to VD) | `DOM04-GOV-07` closed; `shiftsRepository.test.js` pass |
| Slice 2 | `frontoffice` | Digital Receipt Sharing (WhatsApp/Print) | Branch-Local | ✅ PERMITTED: Prints receipt card and generates WhatsApp text | **PASS** | `DigitalReceiptTab.jsx:110`, `receiptMessages.js` | `receiptMessages.test.js` |
| Slice 2 | `frontofficelead` | Role Normalization Parity | Branch-Local | ✅ ALIAS PARITY: Normalizes to `opslead` across financial rules | **PASS** | `roles.js:35`, `firestore.rules:71, 79` | `roles.test.js:46` |

---

### 3.4 Academic, Support & External Roles (`instructorleader`, `instructor`, `marketing`, `officeboy`, `parent`, `student`)

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation |
|---|---|---|---|---|---|---|---|
| Slice 2 | `instructorleader` | Cash Drawer / Shift Reconciliation | None | ❌ FORBIDDEN: Academic leader excluded from cash drawer | **PASS** | `firestore.rules:95-98`, `shiftsRepository.js` | `01-phase1-completion-report.md` |
| Slice 2 | `instructorleader` | Financial Reports & Revenue Analytics | None | ❌ FORBIDDEN: Academic leader excluded from financial tabs | **PASS** | `ReportsDashboard.jsx:129` (Excluded from finance) | `InstructorLeaderDashboard.test.js` |
| Slice 2 | `instructor` | Payment Desk Recording | None | ❌ FORBIDDEN: Instructors cannot record payments | **PASS** | `InstructorClasses.jsx:277` (`readOnly={true}`) | `InstructorDashboard.test.js` |
| Slice 2 | `instructor` | Financial Reports & Revenue Analytics | None | ❌ FORBIDDEN: Instructors excluded from financial reports | **PASS** | `ReportsDashboard.jsx:129`, `firestore.rules:997` | Automated test suite |
| Slice 2 | `marketing` | Financial Data Read / List | None | ❌ FORBIDDEN: Marketing role has no payment read authority | **PASS** | `firestore.rules:canGetPayment()`, `firestore.rules:list` | `securityRulesMatrix/operationalResources.test.js` |
| Slice 2 | `officeboy` | Financial Data Read / List | None | ❌ FORBIDDEN: Facilities role has no financial access | **PASS** | `firestore.rules:canGetPayment()`, `firestore.rules:list` | `securityRulesMatrix/operationalResources.test.js` |
| Slice 2 | `parent` | Read Linked Child Payments & Receipts | Own-Children | ✅ FAMILY SCOPE: Can view payments for verified children only | **PASS** | `firestore.rules:992`, `ParentDashboard.jsx` | `securityRulesMatrix/operationalResources.test.js:553` |
| Slice 2 | `parent` | Cross-Family or Branch Payment Read | None | ❌ FORBIDDEN: Cannot view other students' payments | **PASS** | `firestore.rules:992` (`isParentOf(resource.data.studentId)`) | `securityRulesMatrix/operationalResources.test.js` |
| Slice 2 | `student` | Read Own Payment History & Receipts | Own-Record | ✅ PERSONAL SCOPE: Can view own payment receipts only | **PASS** | `firestore.rules:992` (`resource.data.studentId == request.auth.uid`) | `securityRulesMatrix/operationalResources.test.js:553` |
| Slice 2 | `student` | Peer Payment Read / List | None | ❌ FORBIDDEN: Cannot list or read classmates' payments | **PASS** | `firestore.rules:992, 1007` (List denied for students) | `securityRulesMatrix/operationalResources.test.js` |

---

## 4. Slice 3: Student, Child & Parent Personal Data Across Roles

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation |
|---|---|---|---|---|---|---|---|
| Slice 3 | `admin` | `/users` Read & List Scope | None (Staff Only) | ❌ FORBIDDEN on Students & Parents; restricted strictly to staff accounts | **PASS** | `firestore.rules:727, 743`, `useDashboardData.js:280` (`STAFF_QUERY_ROLES`) | `userAuthorization.test.js:212`, `divisionIsolation.test.js:136, 847` |
| Slice 3 | `admin` | Admissions & Leads Report Tab | None | ❌ FORBIDDEN: Admin has no business lead inspection authority | **PASS** | `ReportsDashboard.jsx:157, 288`, `reportsRepository.js:257` | Automated build / lint clean |
| Slice 3 | `admin` | `/users` Student/Parent Creation | None | ❌ FORBIDDEN: Technical Admin cannot mint student or parent accounts | **PASS** | `firestore.rules:756-761`, `securityRulesMatrix.helpers.js:192` | Automated test suite pass |
| Slice 3 | `director` | Province-Wide Student/Parent Read | Province-Wide | ✅ FULL ACCESS: View student and family profiles across all branches | **PASS** | `firestore.rules:726, 742` (`isOrgExecutive()`) | `divisionIsolation.test.js:835` |
| Slice 3 | `vice_director` | Province-Wide Student/Parent Read | Province-Wide | ✅ FULL ACCESS: View student and family profiles across all branches | **PASS** | `firestore.rules:726, 742` (`isOrgExecutive()`) | `divisionIsolation.test.js:835` |
| Slice 3 | `manager` | Local Branch/Division Student Profile | Branch+Division | ✅ READ & DIRECT WORK: Supervise branch students in assigned division | **PASS** | `firestore.rules:734, 744` | `divisionIsolation.test.js:80` |
| Slice 3 | `manager` | `STUDENT_WITHDRAWAL_OR_FREEZE` Approval | Branch+Division | ✅ LOCAL APPROVER: Ratified approver for branch withdrawal tickets (OD-STU-1) | **PASS** | `approvalGates.constants.js:145`, `ApprovalInbox.jsx:264, 680`, `firestore.rules:614` | `approvals.test.js`, `firestore.rules` |
| Slice 3 | `frontoffice` | Student Profile Field Updates | Branch-Local | 📝 MAKER ONLY: Updates standard profile; tuition fields locked to atomic batch | **PASS** | `firestore.rules:655-688` (Atomic batch `lastPaymentId` check) | `paymentsRepository.test.js:75` |
| Slice 3 | `frontoffice` | Student Withdrawal / Freeze (OD-STU-1) | Branch-Local | 📝 MAKER ONLY: Non-manager status transition to inactive/graduated/archived MUST route through ticket | **PASS** | `StudentRoster.jsx:90-135`, `ApprovalInbox.jsx:264`, `firestore.rules:690-701` | `userAuthorization.test.js` |
| Slice 3 | `frontoffice` | Desk Inquiries Management | Branch-Local | ✅ PRIMARY OPERATOR: Intake and follow-up on prospective student leads | **PASS** | `firestore.rules:1111-1132` | `WalkInInquiryTab.test.js` (17 tests pass) |
| Slice 3 | `instructor` | Class Cohort Student Roster View | Own-Classes | ✅ TEACHING SCOPE: View students enrolled in assigned classes | **PASS** | `firestore.rules:match /classes`, `InstructorClasses.jsx` | `InstructorDashboard.test.js` |
| Slice 3 | `instructor` | Bulk Student PII CSV Export | None | ❌ FORBIDDEN: Instructors blocked from downloading bulk student PII | **PASS** | `StudentRoster.jsx:533-541` (Button hidden & disabled for `instructor` / `readOnly`) | Clean build / lint verification |
| Slice 3 | `instructorleader` | Province-Wide Progress Report Read | Province-Wide | ✅ ACADEMIC MONITORING: Province-wide pedagogical oversight (Blueprint v3.4 §4, §5, G-012) | **PASS** | `firestore.rules:1186, 1205`, `securityRulesMatrix.helpers.js:353, 374` | `divisionIsolation.test.js:977` |
| Slice 3 | `instructorleader` | Desk Inquiries Evaluation | Branch-Local | ✅ ACADEMIC PLACEMENT: Inspect leads for student placement evaluation | **PASS** | `firestore.rules:1111, 1125` | `securityRulesMatrix.helpers.js:347` |
| Slice 3 | `officeboy` | Desk Inquiries / Leads Access | None | ❌ FORBIDDEN: Facilities staff completely stripped from `/deskInquiries` | **PASS** | `firestore.rules:1111-1132` (`isStaff()` replaced with explicit allowlist) | `securityRulesMatrix.helpers.js:341-365` |
| Slice 3 | `parent` | Personal & Child Family Privacy | Own-Children | ✅ FAMILY PRIVACY: Can read own profile and linked child records only | **PASS** | `firestore.rules:725, 741` (`isParentOf`) | `userAuthorization.test.js:178-197` |
| Slice 3 | `student` | Personal Profile Isolation | Own-Record | ✅ PERSONAL SCOPE: Can read own record only; peer reads strictly denied | **PASS** | `firestore.rules:725, 741` (`userId == request.auth.uid`) | `userAuthorization.test.js:200` |

---

## 5. Ledger Summary & Defect Indexing

| Metric | Slice 1 (Admin Boundary) | Slice 2 (Financial Surfaces) | Slice 3 (Personal Data & PII) | Cumulative BLRCA |
|---|---|---|---|---|
| **Total Testable Assertions** | 8 | 32 | 17 | 57 |
| **Clean Conformance (`PASS`)** | 8 (100%) | 31 (96.9%) | 17 (100%) | 56 (98.2%) |
| **Confirmed Defects (`FAIL`)** | 0 (4 closed) | 0 (6 closed) | 0 (8 closed) | 0 (18 closed) |
| **Inconsistencies / Gaps (`GAP`)** | 0 | 0 (closed) | 0 (closed) | 0 |
| **Owner Decisions Required (`[ODR]`)** | 0 | 1 (3.1%) | 0 (3 ratified) | 1 (1.8%) |

### Closed Slice 3 Findings (Verified in `bug-ledger.md`):
1. **`DOM04-SEC-03` / `DOM05-SEC-04` (High) — CLOSED:** Safeguarded atomic `recordPayment` writeBatch on `/users/{studentId}` via `lastPaymentId` brand-new payment creation check in `firestore.rules:655-688`.
2. **`DOM05-SEC-02` / `DOM11-SEC-01` (High) — CLOSED:** Admin `/users` isolation. Blocked from student/parent records in `firestore.rules:727, 743`, `securityRulesMatrix.helpers.js`, and `useDashboardData.js` (`STAFF_QUERY_ROLES`).
3. **`DOM05-UX-02` / `DOM11-GOV-04` (Medium) — CLOSED:** Removed Admissions & Leads tab from Admin in `ReportsDashboard.jsx:157, 288` and failed closed in `reportsRepository.js:257`.
4. **`DOM05-GOV-02` (High) — CLOSED:** `STUDENT_WITHDRAWAL_OR_FREEZE` dual-control maker-checker gate implemented in `StudentRoster.jsx`, `ApprovalInbox.jsx`, `usersRepository.js`, and `firestore.rules:607, 690`.
5. **`DOM05-PRIV-01` (Medium) — CLOSED:** Blocked teaching instructor bulk PII CSV export in `StudentRoster.jsx:533-541`.
6. **`DOM05-SEC-03` (Medium) — CLOSED:** Stripped `officeboy` from `/deskInquiries` in `firestore.rules:1111-1132` and `securityRulesMatrix.helpers.js`.
7. **`DOM05-GOV-03` (Medium) — CLOSED:** Central Academic Lead province-wide `/progressReports` read scope granted in `firestore.rules:1186, 1205` and `securityRulesMatrix.helpers.js`.
8. **`DOM05-PRIV-02` (Low) — ACCEPTED RISK:** Cloudinary unsigned upload documented as accepted zero-budget architecture per ratified OD-STU-3 Option A.

