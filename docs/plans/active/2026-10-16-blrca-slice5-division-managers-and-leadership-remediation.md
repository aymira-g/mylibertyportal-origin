# BLRCA Slice 5 Remediation Plan: Division Managers & Functional Leadership Across Campuses

**Date:** 2026-10-16  
**Status:** ACTIVE / RATIFIED BY OWNER KIFRY (Phase 5 Remediation Authorized)  
**Target Slice:** BLRCA Slice 5 (Division Managers & Functional Leadership Across Campuses)  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) v3.4 (`2026-10-13`)  
**Ratified Owner Decisions / ADRs:** 
- `OD-1`, `OD-2`, `OD-3`, `OD-4`, `G-001` through `G-012`
- ADR `2026-10-13`: *Branch Typology & Lean Satellite Governance Amendment*
- ADR `2026-10-13`: *Class Scheduling & Corporate Events Authority*

---

## 1. Overview & Architectural Guardrails

This remediation plan implements the bounded, evidence-based code fixes for the findings identified in BLRCA Slice 5 Phases 0–4:

### Key Architectural Guardrails
1. **Guardrail 1 (Main Campus Cross-Division Desk & Ops Lead Protection):**
   Do **NOT** remove `uDiv == 'all'` for `frontoffice` or `opslead` at Main Campus (`kota_gorontalo`). Main Campus reception desk staff (`<CrossDivDashboard role="frontoffice" />` in `App.jsx:616`) and Ops Lead legitimately use `division: "all"` across both Course and Kindergarten desks (verified by `divisionIsolation.test.js:779` Test #2). Instead, restrict `uDiv == 'all'` so it strictly NEVER applies to `role == 'manager'`.
2. **Guardrail 2 (Preserve Raw Daily Class Attendance Same-Branch Isolation):**
   Do **NOT** introduce cross-branch queries into `useInstructorLeaderWorkspace.js` for `/classAttendance` or `/users`. `firestore.rules:993` and `divisionIsolation.test.js:1006` intentionally enforce branch isolation on raw daily attendance records. Province-wide pedagogical oversight is already provided via `<ReportsDashboard isInstructorLeader={true} />` (which includes the "All Campuses" selector) and `ApprovalInbox` (`DOM05-GOV-04`).

---

## 2. File Modification & Safeguard Matrix

| Target File | Finding / Policy | Modification Summary | Architectural Safeguards |
|---|---|---|---|
| `firestore.rules` | `DOM09-GOV-03` / `DOM01-GOV-04`, `DOM04-SEC-05`, `DOM01-ALIAS-01`, `DOM05-GOV-04` | 1. Restrict `uDiv == 'all'` in `isDivisionAllowedForBranchStaff` to `role != 'manager'`.<br>2. Restrict `/payments` create from `isFrontOffice()` to `isFrontDeskStaff()`.<br>3. Recognize `operational_leader` and `operationalleader` aliases.<br>4. Allow Central Academic Lead (`isInstructorLeader() && userBranch() == 'kota_gorontalo'`) to `get` and `update` `/deskInquiries/{inquiryId}`. | Maintain parity with `securityRulesMatrix.helpers.js`. Preserves cashier-approver separation and enables cross-branch placement override approvals without opening arbitrary mutations. |
| `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` | Parity for Rules | Update `isDivisionAllowedForBranchStaff`, `canCreatePayment`, role helpers, and `canGetDeskInquiry`/`canUpdateDeskInquiry` to mirror `firestore.rules`. | Exact parity check for rule verification tests. |
| `src/features/shared/securityRulesMatrix/divisionIsolation.test.js` | `DOM09-GOV-03`, `DOM04-SEC-05`, `DOM05-GOV-04` | 1. Update Test #1 so `allManagerGorontalo` is denied `kindergarten` access while Test #2 (`allFOGorontalo`) passes.<br>2. Add test asserting `opslead` is denied `/payments` creation while `frontoffice` is allowed.<br>3. Add test asserting Central Academic Lead can get/update `/deskInquiries`. | Automated regression gate for Firestore rules. |
| `src/App.jsx` | `DOM09-GOV-03` | Remove `effectiveDivision === "all" ? <CrossDivDashboard role="manager" />` branch for `effectiveRole === "manager"`. Route `effectiveDivision === "kindergarten"` to `<KidsManagerDashboard />` and all others to `<ManagerDashboard />`. | Eliminates invalid catch-all "Operations Manager" dashboard routing. |
| `src/features/dashboard/CrossDivDashboard.jsx` | `DOM09-GOV-03` | Remove legacy `ManagerDashboard` / `KidsManagerDashboard` / `"Operations Manager"` branches; dedicate component to Main Campus `frontoffice` cross-division reception desk. | Prevents role privilege creep in UI. |
| `src/schemas/inviteSchema.js` | `DOM09-GOV-03`, `DOM01-GOV-05` | 1. Disallow `division === "all"` when `role === "manager"`.<br>2. Disallow `division: "kindergarten"` or `"all"` at Lean Satellite branches (`isLeanSatelliteBranch(branch)`).<br>3. Disallow `opslead` or `instructorleader` at Lean Satellite branches. | Schema-level fail-closed boundary on staff onboarding. |
| `src/schemas/schemas.test.js` | `DOM09-GOV-03`, `DOM01-GOV-05` | Add test cases verifying invite schema rejection of manager + "all", satellite + kindergarten, and satellite + leadership roles. | Test suite validation for onboarding. |
| `src/features/staff/InvitesPanel.jsx` | `DOM09-GOV-03`, `DOM01-GOV-05` | 1. In branch selection, disable/hide Kindergarten and "all" division options when a Lean Satellite branch is chosen.<br>2. Disable/hide `opslead` and `instructorleader` roles when a Lean Satellite branch is selected.<br>3. Disable "all" division when `role === "manager"`. | UI form prevents invalid invitation configurations. |
| `src/features/dashboard/kids/KidsManagerDashboard.jsx` | `DOM01-GOV-05`, `DOM06-GOV-02` | 1. Fail closed with governance notice if `isLeanSatelliteBranch(managerBranchId)`.<br>2. Pass `hasBranchOpsLead={true}` to `ClassesAndCoverageTab` at `kota_gorontalo`. | Satellite branches have no kindergarten. Main Campus always has dedicated Ops Lead. |
| `src/features/shared/roles.js` | `DOM01-ALIAS-01` | Add `operational_leader: "opslead"` and `operationalleader: "opslead"` to `LEGACY_ROLE_ALIASES`. | Prevents dead-code branches or unauthenticated roles on legacy tokens. |
| `src/features/shared/approvalGates.js` | `DOM09-GOV-04` | In `getSelfCorrectionApprover(requesterRole, options = {})`, route non-manager staff to `APPROVAL_ROLES.DIVISION_MANAGER` when `branchId && isLeanSatelliteBranch(branchId)`. | Solves dead-letter shift adjustments at satellite branches. |
| `src/features/shared/approvalGates.test.js` | `DOM09-GOV-04` | Add test cases verifying satellite non-manager staff routes to `manager`, while Main Campus routes to `opslead`. | Regression test for shift approval routing. |
| `src/features/dashboard/manager/ClassesAndCoverageTab.jsx` | `DOM06-GOV-02` | Use `normalizeRole(u.role) === "opslead"` when computing `hasBranchOpsLead`. | Accurate detection of active Ops Lead. |
| `src/features/classes/AvailableBatches.jsx` | `DOM06-GOV-02` | Accept `hasBranchOpsLead` prop; deny `canAdminister` to `manager` when `hasBranchOpsLead` is true. | Respects division of duties between Manager and Ops Lead at Main Campus. |

---

## 3. Step-by-Step Implementation Strategy

### Step 1: Firestore Security Rules & Matrix Parity (Fixes 1, 2, 4, 6)
- **Fix 1 (`DOM09-GOV-03`):** In `firestore.rules:177`, change `|| (uDiv == 'all')` to `|| (uDiv == 'all' && role != 'manager')`. In `securityRulesMatrix.helpers.js:177`, update helper accordingly. Update `divisionIsolation.test.js` Test #1 and Test #2.
- **Fix 2 (`DOM04-SEC-05`):** In `firestore.rules:1066`, replace `isFrontOffice()` with `isFrontDeskStaff()`. Update `securityRulesMatrix.helpers.js` and add a test in `divisionIsolation.test.js`.
- **Fix 4 (`DOM01-ALIAS-01`):** In `firestore.rules:63, 71, 79, 174, 206, 826, 827, 981, 1225`, include `'operational_leader'` and `'operationalleader'`.
- **Fix 6 (`DOM05-GOV-04`):** In `firestore.rules:1112` and `1119-1122`, add `|| (isInstructorLeader() && userBranch() == 'kota_gorontalo')`. Update `securityRulesMatrix.helpers.js` and add test coverage.

### Step 2: Shared Roles, Schemas, & Approval Gates (Fixes 1, 3, 4, 5)
- In `src/features/shared/roles.js`, add `operational_leader: "opslead"` and `operationalleader: "opslead"` to `LEGACY_ROLE_ALIASES`.
- In `src/schemas/inviteSchema.js`, add `.refine` validation for manager division and lean satellite constraints. Add unit tests in `schemas.test.js`.
- In `src/features/shared/approvalGates.js`, update `getSelfCorrectionApprover(requesterRole, options = {})` (supporting positional or options object `branchId`). Add unit tests in `approvalGates.test.js`.

### Step 3: UI & Dashboards (Fixes 1, 3, 7)
- In `src/App.jsx`, update manager dashboard routing to remove `CrossDivDashboard`.
- In `src/features/dashboard/CrossDivDashboard.jsx`, strip manager references.
- In `src/features/staff/InvitesPanel.jsx`, reactively constrain division and role options based on selected branch and role.
- In `src/features/dashboard/kids/KidsManagerDashboard.jsx`, fail closed on satellite branches; pass `hasBranchOpsLead={true}` at Kota Gorontalo.
- In `src/features/dashboard/manager/ClassesAndCoverageTab.jsx` and `src/features/classes/AvailableBatches.jsx`, normalize opslead role and pass `hasBranchOpsLead` prop.

---

## 4. Verification & Testing Plan

1. **Targeted Vitest Suites:**
   - `npx vitest run src/features/shared/securityRulesMatrix/`
   - `npx vitest run src/features/shared/approvalGates.test.js`
   - `npx vitest run src/schemas/schemas.test.js`
   - `npx vitest run src/features/dashboard/`
2. **Quality & Type Checking:**
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. **Audit Ledger & Documentation Handoff:**
   - Update `bug-ledger.md`:
     - `DOM09-GOV-03` $\rightarrow$ `PENDING_INDEPENDENT_VERIFICATION`
     - `DOM04-SEC-05` $\rightarrow$ `PENDING_INDEPENDENT_VERIFICATION`
     - `DOM01-GOV-05` $\rightarrow$ `PENDING_INDEPENDENT_VERIFICATION`
     - `DOM05-GOV-04` $\rightarrow$ `PENDING_INDEPENDENT_VERIFICATION`
     - `DOM01-ALIAS-01` $\rightarrow$ `CLOSED`
     - `DOM09-GOV-04` $\rightarrow$ `CLOSED`
     - `DOM09-GOV-06` $\rightarrow$ `CLOSED` (via existing ReportsDashboard province-wide view + DOM05-GOV-04)
     - `DOM06-GOV-02` $\rightarrow$ `CLOSED`
   - Update `role-business-logic-conformance-audit.md` (append Section 8.6 Remediation Execution Summary).
   - Update `role-function-conformance-ledger.md` (update outcomes to `PASS`).
   - Stop and hand off to Independent Advisor for BLRCA Phase 6 Verification.
