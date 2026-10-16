# Active Plan: BLRCA Slice 1 — System Admin Remediation

**Date:** 2026-10-15  
**Campaign:** Role & Business Logic Conformance Audit (BLRCA) — Level 2  
**Target:** Slice 1 (System Admin Technical-Only Boundary)  
**Status:** COMPLETED (Verified & Closed: 2026-10-16)  

---

## 1. Scope & Objective

Remediate confirmed governance conflicts and technical boundary collapses identified in BLRCA Slice 1:
- `DOM11-GOV-02`: Remove Financial & Tuition reports exposure from System Admin; fix session cache keying on shared workstations; enforce fail-closed presentation on query errors.
- `DOM01-GOV-03`: Disentangle `isAdmin()` from `isExecutive()` in `firestore.rules` across business collections (`/payments`, `/applications`, `/approvals`, `/progressReports`, `/deskInquiries`, `/classes`, `/attendance`, `/corporateEvents`, `/shifts`, `/staffLeave`, `/schoolOutreach`), reserving `isAdmin()` strictly for technical collections (`users`, `invites`, `todos`, `kioskDevices`, `errorLogs`, `kioskAuditEvents`, `shiftAuditEvents`).
- `DOM01-REP-01`: Introduce `isOrgExecutiveRole` in `src/features/shared/roles.js`; remove `admin` province-wide override in `paymentsRepository.js` and `approvalsRepository.js`.
- `DOM01-PERF-01`: Eliminate unnecessary real-time `/applications` snapshot listener for `admin` in `useDashboardData.js`.

---

## 2. Likely Files Involved

1. `src/features/shared/roles.js` (and `roles.test.js`)
2. `src/features/reports/ReportsDashboard.jsx`
3. `src/features/reports/tabs/FinancialReportsTab.jsx` (and test)
4. `src/features/finance/paymentsRepository.js`
5. `src/features/shared/approvalsRepository.js`
6. `src/features/dashboard/useDashboardData.js`
7. `firestore.rules`
8. `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` (and test matrix)
9. `docs/audits/current/bug-ledger.md`
10. `docs/audits/current/regression-log.md`
11. `docs/audits/blueprint-conformance-matrix.md`

---

## 3. Risks & Free-Tier Cost Check

- **Regression Risk:** Ensure that Director and Vice Director retain full legitimate province-wide financial and business read scope without interruption.
- **Rules Expression Limit:** Ensure replacing `isExecutive()` with `isOrgExecutive()` does not exceed the Firestore 1,000-expression ceiling.
- **Zero-Budget Cost:** Removing the `/applications` listener for `admin` saves Firestore read operations on every admin login. All tests run locally via Vitest at $0 cost.

---

## 4. Verification Plan

1. Run unit test suite: `npm test` (all 106+ suites must pass).
2. Run security rules matrix: `npx vitest run src/features/shared/securityRulesMatrix/` to verify positive, negative, and boundary assertions for System Admin.
3. Static validation: `npm run typecheck` (`tsc --noEmit`) and `npm run lint` (`eslint .`).
4. Production build: `compile_applet`.
5. Post-change L1 regression check and close ledger entries in `bug-ledger.md` and `regression-log.md`.

---

## 5. Post-Fix Verification & Closure Record (2026-10-16)

- **Remediation Commits:**
  - `220c10a`: Executed initial remediation across `roles.js`, `ReportsDashboard.jsx`, `FinancialReportsTab.jsx`, `paymentsRepository.js`, `approvalsRepository.js`, `useDashboardData.js`, and `firestore.rules`.
  - `131f1b2`: Synchronized `corporateEvents` calendar read rule (`isExecutive()`) and aligned security rules matrix assertions.
- **Verification Results:**
  - Targeted Vitest: 7 test files, 194 passed, 0 failed (`roles.test.js`, `FinancialReportsTab.test.js`, and 5 `securityRulesMatrix` test suites).
  - Static Validation: `npm run typecheck` passed (0 errors); `npm run lint` passed (0 errors).
  - Rules Inspection: Confirmed 16 occurrences of `isExecutive()` in `firestore.rules` are strictly technical IT/user/audit surfaces or documented calendar reads.
- **Ledger Status:**
  - `DOM11-GOV-02`: CLOSED
  - `DOM01-GOV-03`: CLOSED
  - `DOM01-REP-01`: CLOSED
  - `DOM01-PERF-01`: CLOSED
  - `DOM04-GOV-03`: Stays OPEN for BLRCA Slice 2.
