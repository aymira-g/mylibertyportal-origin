# Operational Leader Dashboard: Phase 1 Completion Report

> **Document Type:** Phase 1 Implementation & Conformance Evidence  
> **Subsystem:** Operational Leader Dashboard & Role Decoupling  
> **Target Screen:** `src/features/dashboard/OpsLeadDashboard.jsx`  
> **Governing Baseline:** Authoritative Blueprint v3.3 (§6.8, §6.9, §6.10) + Ratified Owner Decisions OD-O1, OD-O2, OD-O3, OD-O4 (Option A) + Ratified Governance Decisions G-006, G-007, G-009  
> **Status:** Phase 1 Complete & Verified  
> **Author:** Coding / Executor Agent  
> **Date:** 2026-10-08  

---

## 1. Summary of Changes Implemented

Under the owner's ratification of **Option A** for decisions OD-O1 through OD-O4, Phase 1 establishes the Operational Leader as an independent branch-site operational head, cleanly decoupled from front-desk cashiering:

### 1.1 Backend Security Rules Decoupling (OD-O4 Option A)
* **`firestore.rules`:**
  * Created dedicated `isOpsLead()` helper:
    ```javascript
    function isOpsLead() {
      let p = userProfile();
      return signedIn()
        && p != null
        && (!('status' in p) || (p.status != 'resigned' && p.status != 'terminated'))
        && p.role in ['opslead', 'ops_lead', 'frontofficelead'];
    }
    ```
  * Decoupled `isApproverForDoc()`:
    * Approvals targeted at `ops_lead` or `opslead` now strictly require `isOpsLead()`.
    * Ordinary front desk cashiers (`frontoffice`) can no longer approve tickets addressed to the Operational Leader.
* **`approvalGates.js`:**
  * Client-side gate check for `APPROVAL_ROLES.OPS_LEAD` strictly requires `normalized === "opslead"`, eliminating the fallback where cashiers could evaluate Ops Lead gates.

### 1.2 Routing Decoupling & Whole-Branch Scope (OD-O2 Option A)
* **`src/App.jsx`:**
  * Routing condition updated:
    * Users with `effectiveRole === "opslead"` (or aliases `ops_lead`, `frontofficelead`) are routed directly to `OpsLeadDashboard`.
    * Prevents Operational Leaders from being trapped in `KidsFrontOfficeDashboard` or `FrontOfficeDashboard` where they lacked whole-branch visibility and approvals access.
    * Front Office cashiers and receptionists (`effectiveRole === "frontoffice"`) remain routed to `FrontOfficeDashboard` or `KidsFrontOfficeDashboard`.

### 1.3 Dedicated Workspace: `OpsLeadDashboard.jsx`
Created a dedicated command center for the Operational Leader (`title="Operational Leader Portal"` with `"Branch-Site Operations"` pill tag):
1. **Overview Tab (`OpsLeadOverviewTab.jsx`):**
   * Real-time whole-branch site health summary: On-Duty Staff count (Front Office, Office Support, Instructors), Active Classroom Batches, and Today's Intake total.
   * Actionable alert cards for pending dual-control approvals, facility tasks, and cashier shift counts.
   * Staff operational allocation board displaying active site personnel.
2. **Approvals Tab (`ApprovalInbox.jsx`):**
   * Configured with `userRole="ops_lead"` and `branchId={myBranch}`.
   * Authorizes valid domain gates under G-006, G-007, and G-009:
     * Whole-Class Cancellation / Reschedule (`CLASS_CANCELLATION_OR_RESCHEDULE`)
     * Retroactive Student Attendance Edits (`RETROACTIVE_STUDENT_ATTENDANCE`)
     * Student Class / Batch Transfers (`STUDENT_CLASS_TRANSFER`)
     * Cash Discrepancy tickets under Rp 20.000 (`CASH_DISCREPANCY`)
     * Staff Shift Self-Correction Review for subordinate desk/support staff
   * Enforces Maker $\ne$ Checker (the requester cannot approve their own ticket).
3. **Cash Reconciliation Tab (`OpsLeadReconciliationTab.jsx`):**
   * Read-only oversight of daily cashier shift balancing across Course and Kindergarten intakes.
   * Visual summary of Cash in drawer, QRIS settlements, and Bank Transfer intake.
   * Prominent policy alert banner explaining G-009 tiered thresholds (< 20k Ops Lead; 20k–50k Vice Director; $\ge$ 50k Director).
   * Complete separation of duties: Ops Lead inspects shift drawer totals, but has **zero cashier payment entry forms or payment mutation capabilities**.
4. **Facilities & Support Tab (`OpsLeadFacilitiesTab.jsx`):**
   * Implements Blueprint §6.8 & §6.10: Coordinating Office Support (Office Boy / Facilities staff).
   * Task dispatch form assigning cleaning and maintenance jobs to on-duty support personnel.
   * Live task checklist tracking completed vs active facility items.
5. **Schedule Board Tab:**
   * Embedded `TodayScheduleBoard` providing live visibility into classroom utilization, teacher assignments, and schedule conflicts.
6. **Events & Logistics Tab:**
   * Embedded `CorporateEventsPanel` for campus-wide event coordination.

---

## 2. Files Modified and Created

| File | Type | Nature of Changes |
|---|---|---|
| `firestore.rules` | Modified | Added `isOpsLead()`; decoupled `ops_lead` approver rule from `isFrontOffice()`. |
| `src/features/shared/approvalGates.js` | Modified | Restricted `APPROVAL_ROLES.OPS_LEAD` gate evaluation to `opslead`. |
| `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` | Modified | Added `isOpsLead(user)` simulator helper; updated `isApproverForDoc`. |
| `src/features/shared/securityRulesMatrix/approvals.test.js` | Modified | Added parity checks for Ops Lead across gates; added tiered G-009 cash tests. |
| `src/features/shared/opsLeadApprovalProbe.test.js` | Created | Targeted probe test verifying rules block peer cashiers from Ops Lead approvals. |
| `src/App.jsx` | Modified | Routed `opslead` to `OpsLeadDashboard` with whole-branch operational scope. |
| `src/features/dashboard/OpsLeadDashboard.jsx` | Created | Dedicated Operational Leader dashboard shell with 6 operational tabs. |
| `src/features/dashboard/opslead/OpsLeadOverviewTab.jsx` | Created | Operational health overview, KPI strip, alert cards, staff allocation. |
| `src/features/dashboard/opslead/OpsLeadReconciliationTab.jsx` | Created | Shift cash drawer oversight & G-009 tiered discrepancy banner (read-only). |
| `src/features/dashboard/opslead/OpsLeadFacilitiesTab.jsx` | Created | Office Boy / Facilities task coordination and dispatch form. |
| `src/features/dashboard/OpsLeadDashboard.test.js` | Created | Unit test suite verifying dashboard rendering, tabs, and component isolation. |

---

## 3. Verification & Evidence

1. **Unit & Matrix Test Suite:**
   * `npx vitest run src/features/dashboard/OpsLeadDashboard.test.js`: **PASSED (4 tests)**.
   * `npx vitest run src/features/shared/opsLeadApprovalProbe.test.js`: **PASSED (4 tests)**.
   * `npx vitest run src/features/shared/securityRulesMatrix/approvals.test.js`: **PASSED (31 tests)**.
   * Full regression test run (`npm test`): **92 passed test files, 1,142 tests passed, 0 failures, 61 skipped (emulator)**.
2. **TypeScript Typecheck (`npm run typecheck`):**
   * `tsc --noEmit`: **PASSED (0 errors)**.
3. **ESLint Code Quality (`npm run lint`):**
   * `eslint .`: **PASSED (0 errors, 0 warnings)**.
4. **Applet Compilation (`compile_applet`):**
   * Production build: **PASSED (clean compilation)**.
5. **Zero Budget & Free Tier Impact:**
   * No paid libraries or services introduced.
   * Shift reconciliation uses targeted single-day query (`getPaymentsForRecordedDay`); zero unbounded realtime listeners added.
   * 100% Spark plan compliant.
