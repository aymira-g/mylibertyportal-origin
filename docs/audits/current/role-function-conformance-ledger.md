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

## 5. Slice 4: Data Exports, Downloads & Print Operations Across Roles

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation | Finding ID |
|---|---|---|---|---|---|---|---|---|
| Slice 4 | `admin` | Reports CSV Dataset Export | None | ❌ FORBIDDEN across business reporting datasets (Finance, Students, Attendance) | **PASS** | `ReportsDashboard.jsx:266` (Admin stripped from finance/admissions) | Automated build / lint clean | — |
| Slice 4 | `admin` | Multi-Campus Province Scope in Reports | None | ❌ FORBIDDEN: Admin has technical maintenance scope only; no province reporting | **PASS** | `ReportsDashboard.jsx:27` (`canAccessProvinceScope` decouples to `isExecutiveView || isInstructorLeader`, stripping `isActualAdmin`) | `ReportsDashboard.test.js` | `DOM11-GOV-05` (Closed) |
| Slice 4 | `admin` | Student / Staff ID Badge Print | None | ❌ FORBIDDEN: Admin does not issue student credentials | **PASS** | `AdminDashboard.jsx` (No BadgeModal mount) | UI Inspection | — |
| Slice 4 | `admin` | Copy Staff System Invite Links | Global | ✅ TECHNICAL AUTHORITY: Generate and copy staff registration tokens | **PASS** | `InvitesPanel.jsx:98-112` (`navigator.clipboard.writeText`) | Automated test suite | — |
| Slice 4 | `director` | Province-Wide Financial Reports CSV Export | Province-Wide | ✅ STRATEGIC OVERSIGHT: Export province-wide payment ledger & revenue analysis | **PASS** | `FinancialReportsTab.jsx:103`, `ReportsDashboard.jsx:91` | `FinancialReportsTab.test.js` | — |
| Slice 4 | `director` | Province-Wide Student Roster CSV Export | Province-Wide | ✅ EXECUTIVE AUTHORITY: Export student rosters across all branches | **PASS** | `StudentRoster.jsx:533-541` (`canExportRoster`) | Build & unit test clean | — |
| Slice 4 | `vice_director` | Student Roster CSV Export | Province-Wide | ✅ OPERATIONAL CONTROL: Vice Director must be able to export student rosters | **PASS** | `StudentRoster.jsx:533-541` (Decoupled from `!readOnly` to `canExportRoster`, restoring VD export) | `StudentRoster.jsx` | `DOM05-UX-03` (Closed) |
| Slice 4 | `vice_director` | Operational Reports CSV Export | Province-Wide | ✅ OPERATIONAL CONTROL: Export multi-branch attendance and duty logs | **PASS** | `ReportsDashboard.jsx:91-97`, `reportsRepository.js` | Automated test suite | — |
| Slice 4 | `manager` | Financial CSV Export Netting & Void Integrity | Branch+Division | 🔒 DATA INTEGRITY: Exported CSV must net voided rows and subtract reversals | **PASS** | `reportsUtils.js:computeFinancialExportRows` pre-collects `voidedIds`, zeroes void/reversal pairs | `FinancialReportsTab.test.js` | `DOM04-CSV-01` (Remediated) |
| Slice 4 | `manager` | Customer Digital Receipt Print / WhatsApp | Branch+Division | 🔒 CASHIER OVERSIGHT: Print customer receipts and send WhatsApp links | **PASS** | `DigitalReceiptTab.jsx:85-89` & `receiptMessages.js:70` suppress cashier `notes` (OD-EXP-1 Option A) | `receiptMessages.test.js` | `DOM04-PRIV-01` (Closed) |
| Slice 4 | `manager` | Branch Student Roster CSV Export | Branch+Division | 🔒 BRANCH+DIVISION SCOPE: Export students in assigned division | **PASS** | `StudentRoster.jsx:533-541`, `studentRosterExport.js` | Build clean | — |
| Slice 4 | `opslead` | Daily Operational Reports CSV Export | Branch-Local | 🔒 OPERATIONAL OVERSIGHT: Export check-ins, duty logs, and facility logs | **PASS** | `OpsLeadDashboard.jsx`, `ReportsDashboard.jsx:91` | `OpsLeadDashboard.test.js` | — |
| Slice 4 | `opslead` | Financial Reports CSV Bulk Export | None | ❌ FORBIDDEN: Operational Leader has no revenue report access | **PASS** | `ReportsDashboard.jsx:129` (Excluded from finance tab) | `OpsLeadDashboard.test.js` | — |
| Slice 4 | `frontoffice` | Digital Cashier Receipt Print | Branch-Local | ✅ CASHIER AUTHORITY: Print customer digital receipts upon payment entry | **PASS** | `DigitalReceiptTab.jsx:42-45`, `PaymentModal.jsx` | Build clean | — |
| Slice 4 | `frontoffice` | Official Student ID Badge Print | Branch-Local | ✅ CREDENTIAL ISSUANCE: Print student ID badges and download QR cards | **PASS** | `BadgeModal.jsx:136-155`, `StudentRosterTable.jsx` | Build clean | — |
| Slice 4 | `frontoffice` | Copy Parent Portal Linkage Code / PIN | Branch-Local | ✅ PARENT ONBOARDING: Copy 6-digit linkage PIN and magic WhatsApp link | **PASS** | `StudentParentLinkage.jsx:189-214` | Build clean | — |
| Slice 4 | `frontoffice` | Bulk Parent Phone Number Clipboard Copy | Branch-Local | 🔒 PRIVACY RESTRICTION: Unaudited bulk phone clipboard dump risks PII exfiltration | **PASS** | `ClassManager.jsx` & `BatchOutreachPanel.jsx:77-84` gate copy action behind operational roles | Build & test clean | `DOM06-PRIV-01` (Closed) |
| Slice 4 | `instructorleader` | Academic Progress & Assessment Export | Province-Wide | ✅ ACADEMIC SCOPE: Export assessment rubrics and progress evaluations | **PASS** | `ReportsDashboard.jsx:91`, `LearnerProgressTab.jsx` | Build clean | — |
| Slice 4 | `instructor` | Institutional Reports CSV Dataset Export | None | ❌ FORBIDDEN: Teaching instructors must NOT bulk export branch attendance/evaluations | **PASS** | `ReportsDashboard.jsx:29, 93-99` button and handler gated behind `canExportReports` | `ReportsDashboard.test.js` | `DOM11-PRIV-01` (Remediated) |
| Slice 4 | `instructor` | Official Student ID Badge View & Print | None | ❌ FORBIDDEN: Teachers must not view or print official student badges / QR credentials | **PASS** | `InstructorClasses.jsx:286` & `StudentRoster.jsx` suppress badge print for `instructor` | `StudentRosterTable.test.js` | `DOM05-PRIV-03` (Closed) |
| Slice 4 | `instructor` | Bulk Student Roster CSV Export | None | ❌ FORBIDDEN: Teachers blocked from downloading bulk student PII | **PASS** | `StudentRoster.jsx:533-541` (Button hidden & disabled for `instructor`) | Clean build / lint verification | — |
| Slice 4 | `marketing` | Bulk Financial or Student PII Export | None | ❌ FORBIDDEN: Marketing restricted strictly to lead and outreach records | **PASS** | `firestore.rules`, `ReportsDashboard.jsx` | Automated test suite | — |
| Slice 4 | `officeboy` | Any Export, Print, or Clipboard Operation | None | ❌ FORBIDDEN across all export/print interfaces | **PASS** | `OfficeBoyDashboard.jsx` (Zero export buttons) | UI & rules verification | — |
| Slice 4 | `parent` / `student` | Bulk Data Export | None | ❌ FORBIDDEN: External users have zero bulk export capability | **PASS** | `ParentDashboard.jsx`, `StudentDashboard.jsx` | UI & rules verification | — |

---

---

## 6. Slice 5: Division Managers & Functional Leadership Across Campuses

| Slice | Role ID | Capability / Action | Scope Level | Expected Contract | Outcome | Evidence (File:Line) | Test Citation | Finding ID |
|---|---|---|---|---|---|---|---|---|
| Slice 5 | `manager` (Course, Main) | Course Division Data Isolation | Branch+Division | 🔒 DIVISION ISOLATION: Strict isolation to `division: "courses"`; zero read/write to `kindergarten` | **PASS** | `ManagerDashboard.jsx:113-207`, `firestore.rules:172-185` | `divisionIsolation.test.js` | — |
| Slice 5 | `manager` (Course, Main) | Cross-Division Supervision via "All" | None | ❌ FORBIDDEN: "Operations Manager · All Divisions" recreates removed Branch Manager | **PASS** | `firestore.rules:177` restricts `uDiv == 'all'` to `role != 'manager'`; `App.jsx:580`, `CrossDivDashboard.jsx` | `divisionIsolation.test.js:755` | `DOM09-GOV-03` / `DOM01-GOV-04` (Remediated) |
| Slice 5 | `manager` (Course, Main) | Batch Scheduling when Ops Lead Active | Branch+Division | 🔒 SUPERVISORY COOPERATION: Ops Lead is primary scheduler at Main Campus (ADR Option B) | **PASS** | `AvailableBatches.jsx:49-56` gates `canAdminister` when `hasBranchOpsLead` is true; `ClassesAndCoverageTab.jsx` passes prop | `batches.test.js` | `DOM06-GOV-02` (Closed) |
| Slice 5 | `manager` (Course, Satellite) | Lean Satellite Cohort Scheduling | Branch+Division | ✅ AUTHORIZED FALLBACK: Primary cohort scheduler for courses at lean satellite | **PASS** | `AvailableBatches.jsx:49-56`, `firestore.rules:863-864` | `batches.test.js` | — |
| Slice 5 | `manager` (Course, Satellite) | Lean Satellite Front Office Shift Review | Branch+Division | ✅ LOCAL CHECKER: Review and mark completed Front Office shifts | **PASS** | `firestore.rules:1252-1254` (`(isFO \|\| isMgr) && sameBranch && diffKeys.hasOnly(['reviewStatus'])`) | `shifts.test.js` | — |
| Slice 5 | `manager` (Course, Satellite) | Lean Satellite Cash Discrepancy (<20k) | Branch+Division | ✅ LOCAL CHECKER: Dual-control checker for drawer discrepancy < Rp 20k | **PASS** | `approvalGates.js:121-126`, `approvalGates.constants.js:195-205` | `approvalGates.test.js` | — |
| Slice 5 | `manager` (Course, Satellite) | Staff Shift Self-Correction Routing | Branch+Division | 🔒 SATELLITE SUPERVISION: Non-manager staff shift corrections route to Course Manager | **PASS** | `approvalGates.js:53-74` routes satellite staff shift self-corrections to `APPROVAL_ROLES.DIVISION_MANAGER` | `approvalGates.test.js` | `DOM09-GOV-04` (Closed) |
| Slice 5 | `manager` (Course, Both) | Executive Financial Gate Approval | None | ❌ FORBIDDEN: Cannot approve discounts, refunds, voids, or discrepancies $\ge 20k$ | **PASS** | `approvalGates.constants.js`, `firestore.rules:1145-1150` | `securityRulesMatrix/approvals.test.js` | — |
| Slice 5 | `manager` (Course, Both) | Staff Account & Role Elevation | None | ❌ FORBIDDEN: Cannot create staff accounts or elevate roles | **PASS** | `approvalGates.constants.js:77-145`, `firestore.rules:1145-1150` | `securityRulesMatrix/approvals.test.js` | — |
| Slice 5 | `manager` (Course, Both) | Self-Approval of Own Requests | None | ❌ FORBIDDEN: Maker $\ne$ Checker strictly enforced on manager requests | **PASS** | `ApprovalInbox.jsx:297-300`, `firestore.rules:1156` | `ApprovalInbox.test.js` | — |
| Slice 5 | `manager` (Kindergarten, Main) | Strict Division Isolation | Branch+Division | 🔒 STRICT ISOLATION: Zero access to course academy records, students, or leads | **PASS** | `KidsManagerDashboard.jsx:123-207`, `firestore.rules:178` | `divisionIsolation.test.js` | — |
| Slice 5 | `manager` (Kindergarten, Satellite) | Assignment to Lean Satellite Branch | None | ❌ FORBIDDEN: Kindergarten is inactive at lean satellite campuses (G-012) | **PASS** | `inviteSchema.js:84-106` rejects kindergarten at satellites; `InvitesPanel.jsx`, `KidsManagerDashboard.jsx` fails closed | `schemas.test.js` | `DOM01-GOV-05` (Remediated) |
| Slice 5 | `opslead` (Main Campus) | Cash Desk Intake & Direct Payment Create | None | ❌ FORBIDDEN: Supervisor and checker; NO cashier intake or payment write | **PASS** | `firestore.rules:1066` restricts payment creation to `isFrontDeskStaff()`, stripping `opslead` | `divisionIsolation.test.js` Test #7 | `DOM04-SEC-05` (Remediated) |
| Slice 5 | `opslead` (Main Campus) | Daily Shift Reconciliation Oversight | Branch-Local | ✅ OPERATIONAL SUPERVISOR: Read-only till breakdown & cash drawer verification | **PASS** | `OpsLeadDashboard.jsx:168-180`, `OpsLeadReconciliationTab.jsx` | `OpsLeadDashboard.test.js` | — |
| Slice 5 | `opslead` (Main Campus) | Operational Dual-Control Approvals | Branch-Local | ✅ LOCAL CHECKER: Class cancel, attendance edit, transfer, discrepancy <20k | **PASS** | `approvalGates.constants.js:310-390`, `ApprovalInbox.jsx` | `approvalEnforcement.test.js` | — |
| Slice 5 | `opslead` (Both) | Role Identity Normalization | Branch-Local | 🔒 ROLE CANONICALIZATION: Normalize `operational_leader` / `operationalleader` | **PASS** | `roles.js:34-36` maps aliases to `opslead`; `firestore.rules` & `securityRulesMatrix` parity | `securityRulesMatrix` tests | `DOM01-ALIAS-01` (Closed) |
| Slice 5 | `instructorleader` | Province-Wide Academic Approvals | Province-Wide | ✅ CENTRAL ACADEMIC LEAD: Dual-control authority over placement overrides & subs | **PASS** | `approvalsRepository.js:68-74`, `firestore.rules:isApproverForDoc` | `approvalsRepository.test.js:157` | — |
| Slice 5 | `instructorleader` | Province-Wide Progress Reports Read | Province-Wide | ✅ ACADEMIC MONITORING: Read evaluations across all 4 campuses (G-012) | **PASS** | `firestore.rules:1186, 1205`, `AcademicProgressLeader.jsx` | `divisionIsolation.test.js` | — |
| Slice 5 | `instructorleader` | Multi-Campus Dashboard View Switcher | Province-Wide | 🔒 PROVINCE-WIDE OVERSIGHT: Switch campus to view satellite teams & coverage | **PASS** | `ReportsDashboard.jsx:27` provides province-wide view with campus switcher; `firestore.rules:1111-1126` permits desk inquiry access | `divisionIsolation.test.js` Test #8 | `DOM09-GOV-06` / `DOM05-GOV-04` (Closed) |
| Slice 5 | `instructorleader` | Financial & Cash Collection Authority | None | ❌ FORBIDDEN: Strictly excluded from cash drawer, payments, and discounts | **PASS** | `InstructorLeaderDashboard.jsx` (Zero financial tabs), `firestore.rules:canGetPayment` | `InstructorLeaderDashboard.test.js` | — |

---

## 6. Slice 6 Conformance Matrix (Front-Line Operational, Teaching, Field, Executive Non-Financial & External Portals)

| Slice | Role | Workflow / Feature Surface | Authorized Scope | Expected Governance / Architectural Contract | Observed Conformance Status | Implementation & Security Rules Evidence | Vitest / Playwright Verification | Defect / Governance Ref |
|---|---|---|---|---|---|---|---|---|
| Slice 6 | `director` | Strategic Control: Staff Role Elevation | Province-Wide | ✅ STRATEGIC CONTROL: Sole authority to approve `STAFF_ROLE_ELEVATION` | **PASS** | `firestore.rules:342-358` strictly restricts `STAFF_ROLE_ELEVATION` to `isDirector()`; `approvalGates.constants.js:150` | `approvalGates.test.js` | — |
| Slice 6 | `director` | Strategic Control: Staff Deactivation / Termination | Province-Wide | ✅ STRATEGIC CONTROL: Sole authority to approve `STAFF_DEACTIVATION` | **PASS** | `firestore.rules:360-376` strictly restricts `STAFF_DEACTIVATION` to `isDirector()`; `approvalGates.constants.js:158` | `approvalGates.test.js` | — |
| Slice 6 | `vice_director` | Operational Control: Staff Deactivation Maker | Province-Wide | ✅ OPERATIONAL MAKER: Submits staff deactivation requests; cannot self-approve | **PASS** | `StaffDirectory.jsx:154-184` allows Vice Director maker submission; `approvalGates.js:37` routes to Director | `approvalGates.test.js` | — |
| Slice 6 | `director` & `vice_director` | Executive Non-Financial: New Staff Onboarding | Province-Wide | ✅ DUAL CONTROL: Either executive may approve `NEW_STAFF_ACCOUNT` | **PASS** | `firestore.rules:325-334` allows `(isDirector() || isViceDirector())`; `approvalGates.js:16` | `approvalGates.test.js` | — |
| Slice 6 | `vice_director` | Executive Delegation: Acting Director Mode | Province-Wide | 🔒 GOVERNED DELEGATION: Active Director leave ticket required; self-elevation blocked | **PASS** | `approvalsRepository.js:295-340` (`validateDelegation`) enforces Director leave, blocks self-elevation and acting on own requests | `approvalsRepository.test.js` | — |
| Slice 6 | `director` & `vice_director` | Corporate School Calendar Events | Province-Wide / Branch | 🔒 EXECUTIVE CALENDAR: Company-wide events (`audienceType != 'branch'`) executive-only | **PASS** | `firestore.rules:921-955` restricts company-wide events to executives; branch events to same-branch staff | `securityRulesMatrix` tests | — |
| Slice 6 | `director` & `vice_director` | Cross-Branch Visibility vs Operational Mutation | Province-Wide Read / No Direct Op Writes | 🔒 SEPARATION OF CONTROL: Broad read visibility does NOT grant operational execution | **PASS** | `ExecutiveDashboard.jsx` & `ViceDirectorDashboard.jsx` read-only; mutations (attendance, progress, enrollment) require domain roles | `ExecutiveDashboard.test.js` | — |
| Slice 6 | `frontoffice` | Desk Inquiries & Placement Level Overrides | Branch-Local | 🔒 DUAL CONTROL: Graded level requires rubric or `PLACEMENT_LEVEL_OVERRIDE` approval | **PASS** | `firestore.rules:1116-1120`, `WalkInInquiryTab.jsx:128-145` blocks unassessed graded level creation; routes to Central Lead | `inquiriesRepository.test.js` | — |
| Slice 6 | `frontoffice` | Student Cohort Transfer | Branch-Local | 🔒 DUAL CONTROL: Class transfer requires approved `STUDENT_CLASS_TRANSFER` envelope | **PASS** | `StudentRoster.jsx` & `FrontOfficeDashboard.jsx` gate transfers behind approval ticket to Division Manager | `approvalEnforcement.test.js` | — |
| Slice 6 | `frontoffice` | Kiosk QR Attendance & Staff Shift Scans | Branch-Local | ✅ RECEPTION DESK: Real-time scan intake; cannot forge past dates without approval | **PASS** | `StandaloneKioskPage.jsx`, `firestore.rules:902-918` (attendance), `firestore.rules:1275-1285` (shifts) | `StandaloneKioskPage.test.js` | — |
| Slice 6 | `frontoffice` | Staff Status & Leave Maker Separation | Branch-Local | 🔒 MAKER-CHECKER: Front desk staff cannot submit or approve their own status/leave | **PASS** | `approvalGates.js:46-51` (`getStaffStatusApprover`) enforces maker cannot be subject of status ticket | `approvalGates.test.js` | — |
| Slice 6 | `instructor` | Teaching Class & Student Scope Isolation | Assigned Classes | 🔒 TEACHING BOUNDARY: Read/manage classes strictly where `instructorId` or substitute | **PASS** | `firestore.rules:849-852, 857-860`, `InstructorDashboard.jsx`, `useInstructorRoster.js` | `InstructorDashboard.test.js` | — |
| Slice 6 | `instructor` | Daily Class Attendance Marking | Assigned Classes | 🔒 SAME-DAY BOUNDARY: Same-day attendance only; retroactive backfill requires approved gate | **PASS** | `firestore.rules:1007-1026`, `InstructorAttendanceView.jsx:130` enforces same-day attendance date | `classAttendanceRepository.test.js` | — |
| Slice 6 | `instructor` | Progress Report Authoring | Assigned Classes | 🔒 ACADEMIC INTEGRITY: Creation strictly restricted to assigned instructor on class doc | **PASS** | `firestore.rules:1207-1214`, `StudentProgressForm.jsx` validates teacher assignment and student enrollment | `divisionIsolation.test.js` | — |
| Slice 6 | `instructor` | ID Badges, CSV Exports & Payments Shielding | None | ❌ FORBIDDEN: Teachers stripped of ID printing, bulk phone copy, CSV export, payments read | **PASS** | `InstructorClasses.jsx:286` (no badge modal), `StudentRoster.jsx:533` (no export), `firestore.rules:1041` (no payments) | `StudentRosterTable.test.js` | `DOM05-PRIV-03`, `DOM11-PRIV-01` |
| Slice 6 | `marketing` | School Outreach & Course Admissions | Branch-Local (Courses) | 🔒 DIVISION CONFINEMENT: School visits & course leads; Kindergarten PAUD strictly shielded | **PASS** | `MarketingDashboard.jsx` locks `activeDivision = "courses"`, filters out `d.division === "kindergarten"`, and strips division toggle; `firestore.rules:171-181` & `securityRulesMatrix.helpers.js:174-182` strictly deny kindergarten access to `marketing`; `inviteSchema.js`, `InvitesPanel.jsx`, & `ApprovalInbox.jsx` constrain marketing to courses | `divisionIsolation.test.js:Section 3.1`, `schemas.test.js` | `DOM14-GOV-01` (Closed) |
| Slice 6 | `officeboy` | Campus Facilities Support & Data Shielding | Branch-Local (Tasks) | ❌ FORBIDDEN: General affairs only; zero access to student/parent PII, classes, attendance | **PASS** | `firestore.rules` introduces `isNonFacilityStaff() = isStaff() && !(userProfile().role in ['officeboy', 'cleaner'])`, gating `/users`, `/classes`, and `/attendance` read paths; mirrored in `securityRulesMatrix.helpers.js`; retains own profile, own `/shifts`, and `/todos`; verified by live emulator test suites (`usersAndProfiles`, `classesAndAcademic`, `attendanceAndShifts`) | `divisionIsolation.test.js:Section 3.3`, `firestoreRulesEmulator` | `DOM05-PRIV-04` (Closed) |
| Slice 6 | `parent` | Linked Child Data Isolation | Linked Children | 🔒 GUARDIAN SCOPE: Read-only access to linked children (`isParentOf`), schedules, attendance | **PASS** | `ParentDashboard.jsx`, `parentPortalRepository.js:78-183`, `firestore.rules:741, 854, 985, 1051, 1199` | `ParentDashboard.test.js` | P-01 (Accepted Risk) |
| Slice 6 | `parent` & `student` | Profile Details Self-Update Whitelist | Own Profile | 🔒 ATTRIBUTE WHITELIST: Updates strictly constrained to `displayName`, `phone`, `dob`, `photoURL`, `nickname` | **PASS** | `firestore.rules:717-720`, `ProfilePanel.jsx:63` (`updateProfileDetails`), `authRepository.js` | `securityRulesMatrix` tests | — |
| Slice 6 | `student` | Student Account Routing & Portal Boundary | Own Attendance | 🔒 ACCOUNT CARD: Informational card with kiosk notice and Sign Out button; dead link removed | **PASS** | `App.jsx:657-663` removes dead `<a href="/portal">` button per ratified Option A (`OD-STU-4`), preserving kiosk attendance advice and Sign Out | Static / Build clean | `SL6-STU-01` / `OD-STU-4` (Closed) |

---

## 7. Ledger Summary & Defect Indexing

| Metric | Slice 1 (Admin Boundary) | Slice 2 (Financial Surfaces) | Slice 3 (Personal Data & PII) | Slice 4 (Exports & Prints) | Slice 5 (Division Managers & Leadership) | Slice 6 (Front-Line, Teaching, Field, Exec Non-Fin, Portals) | Cumulative BLRCA |
|---|---|---|---|---|---|---|---|
| **Total Testable Assertions** | 8 | 32 | 17 | 24 | 20 | 20 | 121 |
| **Clean Conformance (`PASS`)** | 8 (100%) | 31 (96.9%) | 17 (100%) | 24 (100%) | 20 (100%) | 20 (100%) | 121 (100%) |
| **Confirmed Defects (`FAIL`)** | 0 (4 closed) | 0 (6 closed) | 0 (8 closed) | 0 (6 closed) | 0 (5 closed) | 0 (3 closed) | 0 (32 closed) |
| **Inconsistencies / Gaps (`GAP`)** | 0 | 0 (closed) | 0 (closed) | 0 (1 closed) | 0 (2 closed) | 0 (1 resolved) | 0 (4 closed) |
| **Owner Decisions Required (`[ODR]`)** | 0 | 1 (closed) | 0 (3 ratified) | 0 (OD-EXP-1 ratified Option A) | 0 (All governed by ratified Bp v3.4 & ADRs) | 0 (OD-STU-4 ratified Option A) | 0 (6 resolved) |

### Slice 5 Findings Status (Verified & Closed in `bug-ledger.md`):
1. **`DOM09-GOV-03` / `DOM01-GOV-04` (Critical / High):** CLOSED (Phase 6 independent verification approved; `firestore.rules:177` restricts `uDiv == 'all'` to `role != 'manager'`; `App.jsx:580` removes CrossDivDashboard for manager; `inviteSchema.js` disallows manager + "all"; verified in `divisionIsolation.test.js`).
2. **`DOM01-GOV-05` (High):** CLOSED (Phase 6 independent verification approved; `inviteSchema.js:84-106` rejects kindergarten and leadership roles at lean satellite branches; `InvitesPanel.jsx` & `ApprovalInbox.jsx` sanitize dropdowns; `KidsManagerDashboard.jsx` fails closed on satellite branch; 42/42 `schemas.test.js` pass).
3. **`DOM04-SEC-05` (High):** CLOSED (Phase 6 independent verification approved; `firestore.rules:1066` replaces `isFrontOffice()` with `isFrontDeskStaff()`, stripping Ops Lead payment create; verified in `divisionIsolation.test.js` Test #7).
4. **`DOM05-GOV-04` (High):** CLOSED (Phase 6 independent verification approved; `firestore.rules:1112, 1119-1122` allows Central Instructor Leader to get and update `/deskInquiries` cross-branch; verified in `divisionIsolation.test.js` Test #8).
5. **`DOM01-ALIAS-01` (Medium):** CLOSED (`roles.js:34-36` maps `operational_leader` and `operationalleader` to `opslead`; `firestore.rules` and `securityRulesMatrix.helpers.js` recognize aliases).
6. **`DOM09-GOV-04` (Medium):** CLOSED (`approvalGates.js:53-74` routes non-manager staff shift corrections at satellite branches to `manager`; 34/34 `approvalGates.test.js` pass).
7. **`DOM09-GOV-06` / `SL5-LEAD-01` (Low):** CLOSED (Resolved via existing `ReportsDashboard.jsx` province-wide view + `DOM05-GOV-04` ticket update rules).
8. **`DOM06-GOV-02` (Low):** CLOSED (`ClassesAndCoverageTab.jsx` normalizes `opslead` and passes `hasBranchOpsLead`; `AvailableBatches.jsx:49-56` gates `canAdminister` when Ops Lead is active).

### Slice 6 Findings Status (Verified & Closed in `bug-ledger.md`):
1. **`DOM05-PRIV-04` / `SL6-FAC-01` (Tier 1 High):** CLOSED (`firestore.rules` helper `isNonFacilityStaff()` introduced to decouple `'officeboy'` and `'cleaner'` from `/users`, `/classes`, and `/attendance` read access while preserving own `/shifts`, own `/users/{uid}`, and `/todos`; mirrored in `securityRulesMatrix.helpers.js`; 145/145 live Firestore emulator tests pass across all 7 emulator suites, including explicit read denial assertions on `/users`, `/classes`, and `/attendance` and allow assertions on own profile/shifts; 77/77 `divisionIsolation.test.js` matrix tests pass; independent Phase 6 verification complete).
2. **`DOM14-GOV-01` / `SL6-MKT-01` (Tier 2 Medium):** CLOSED (`MarketingDashboard.jsx` locks `activeDivision = "courses"`, filters out `d.division === "kindergarten"` from application and desk inquiry listeners, and strips division toggle; `firestore.rules:171-181` and `securityRulesMatrix.helpers.js:174-182` strictly deny kindergarten access to `marketing` regardless of `uDiv`; `inviteSchema.js`, `InvitesPanel.jsx`, and `ApprovalInbox.jsx` constrain marketing to `courses`; 42/42 `schemas.test.js` and `divisionIsolation.test.js:Section 3.1` tests pass).
3. **`SL6-STU-01` / `OD-STU-4` (Tier 3 Info / UX):** CLOSED (Owner Decision `OD-STU-4` Option A ratified by Owner Kifry on 2026-10-16; dead `<a href="/portal">` link removed in `src/App.jsx:657-663` while preserving informational kiosk notice and Sign Out button; build and lint clean).




