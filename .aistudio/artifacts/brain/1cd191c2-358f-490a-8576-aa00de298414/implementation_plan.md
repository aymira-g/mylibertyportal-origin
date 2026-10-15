# Role & Business Logic Conformance Audit — Slice 1: System Admin Execution Plan

Adopt the ratified Role & Business Logic Conformance Audit methodology and systematically audit, verify, and document the technical-only boundary of the System Admin (`admin`) role across all user-facing surfaces, repositories, and Firestore security rules.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the owner in Phase 1:
> - **Audit Adoption & Objective:** The audit design in `docs/audits/Role & Business Logic Conformance Audit/MyLiberty-Role-Business-Logic-Conformance-Audit-Design.md` is adopted as the operational campaign procedure, and the immediate target is **Slice 1: System Admin**.
> - **Register Logging:** All findings will be recorded into the canonical `docs/audits/current/bug-ledger.md` and verification evidence into `docs/audits/current/regression-log.md`, maintaining single-source traceability without creating conflicting register files.
> - **Audit-Only Discipline:** During this audit pass, no production business logic or rules will be silently modified without explicit remediation handoff; findings will be proven through static inspection and automated emulator test assertions.

- **Confirmed Decision 1**: Adopt the proposed BLRCA design and execute Slice 1 (System Admin).
- **Confirmed Decision 2**: Use existing canonical registers (`bug-ledger.md`, `regression-log.md`, `blueprint-conformance-matrix.md`).
- **Open Decision / Recommended Default**: Keep the audit procedure directory intact and add a kebab-case symbolic pointer or index if needed to prevent CLI path-escaping issues.

---

## 1. Overview & Core Concept

- **What It Does**: Conducts a comprehensive, evidence-based audit of the `admin` (System Admin) role across the portal to ensure technical administrators cannot view, query, export, or mutate business operational data (financial records, student progress, teacher evaluations, admissions, cash discrepancy approvals).
- **Target Audience / Persona**: System Administrators, School Executives (Director, Vice Director), and Auditors verifying adherence to Blueprint Principle 3 and Owner Decision 2 (OD-2).
- **Key Value**: Enforces strict separation of system infrastructure maintenance from organizational business intelligence and financial authority, eliminating accidental business data leakage.

---

## 2. User Experience & Verification Surface

- **System Admin UI Boundary (`AdminDashboard.jsx`)**:
  - Review all mounted tabs: Staff Directory, Invites, Tasks, Terminals/Kiosks, and Reports.
  - Scrutinize the inclusion of `<ReportsDashboard isAdminView={true} ... />`: verify whether System Admin is exposed to the "Financial & Tuition" revenue tab, "Admissions & Leads", or province-wide filters.
  - Verify that System Admin sees only infrastructure metrics, device provisionings, staff accounts, and log-retention housekeeping.
- **Fail-Closed Presentation & Cache Hygiene**:
  - Inspect `financialCache` and shared memory maps on front-desk/admin devices to guarantee no cross-session data leakage upon user logout or role switch.
  - Ensure any permission-denied queries render unambiguous error states rather than misrepresenting failures as "Rp 0" or empty lists.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Audit-First vs. Instant Code Fix**
  - *Chosen Approach*: Execute Slice 1 as an evidence-gathering audit, producing reproducible emulator test cases and cataloged bug ledger entries before opening an approved remediation batch.
  - *Why*: Conforms strictly to the agent governance instructions; prevents unvetted regressions in shared components.
- **Decision 2: Backend Rules Disentanglement (`isExecutive` vs `isOrgExecutive`)**
  - *Chosen Approach*: Audit all 46 occurrences of `isExecutive()` in `firestore.rules`. System Admin (`isAdmin()`) must be isolated to technical collections (`terminals`, `system_logs`, `todos`, `invites`) and stripped from business documents (`payments`, `applications`, `progressReports`).
  - *Why*: Align with OD-2 and Blueprint §7: technical access must never grant read or write access to financial or confidential business records.
- **Decision 3: Zero-Cost Verification via Firestore Emulator**
  - *Chosen Approach*: Execute test suites locally using `npm run test:rules` (`firebase emulators:exec`).
  - *Why*: Eliminates cloud read/write costs, preserving the project's zero-budget mandate.

---

## 4. Technical Architecture & Data Strategy (Technical Reference)

```
┌────────────────────────────────────────────────────────┐
│                   System Admin Surface                 │
│                 (Role: 'admin', Scope: All)             │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
    ┌───────────────────────┐ ┌───────────────────────┐
    │  Authorized Technical │ │   Prohibited Business │
    │       Operations      │ │        Operations     │
    │  - Staff Invites      │ │  - Financial Reports  │
    │  - Terminal Kiosks    │ │  - Payment Queries    │
    │  - Log Retention      │ │  - Discount Approvals │
    │  - System Todos       │ │  - Student Records    │
    └──────────┬────────────┘ └──────────┬────────────┘
               │                         │
               ▼                         ▼
      [ Firestore Rules ]        [ Firestore Rules ]
      allow: if isAdmin()        DENY: if isAdmin()
         (Status: PASS)          (Target: Verify & Audit)
```

### Audit Trace Matrix for Slice 1:

1. **Static UI & Component Audit:**
   - Trace `src/features/dashboard/AdminDashboard.jsx` lines 274–280 (`ReportsDashboard`).
   - Trace `src/features/reports/ReportsDashboard.jsx` lines 24–36 (`isActualAdmin`, `canAccessProvinceScope`, `subTab === 'finance'`).
   - Trace `src/features/reports/tabs/FinancialReportsTab.jsx` line 18 (`financialCache`) and query handling.

2. **Repository & Data Access Audit:**
   - Trace `fetchPaymentsForWindow` in `src/features/finance/paymentsRepository.js`.
   - Trace student applications and progress reports repositories for `isAdmin` branches.

3. **Backend Security Rules Audit:**
   - Map all 46 usages of `isExecutive()` across `firestore.rules`.
   - Identify endpoints where `isAdmin()` receives unintended read or write permissions to `/payments/{paymentId}`, `/applications/{appId}`, and `/approvals/{approvalId}`.

4. **Emulator Test Suite & Proof:**
   - Write/run automated emulator assertions verifying that an authenticated `admin` token receives `PERMISSION_DENIED` on `/payments` collection queries.
   - Log findings into `docs/audits/current/bug-ledger.md` and evidence into `docs/audits/current/regression-log.md`.
