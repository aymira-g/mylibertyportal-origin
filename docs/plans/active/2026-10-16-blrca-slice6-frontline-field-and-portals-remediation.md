# BLRCA Slice 6 Remediation Plan: Facilities Privacy Isolation, Marketing Kindergarten Shielding & Student Account Card Cleanup

**Date:** 2026-10-16  
**Status:** ACTIVE / RATIFIED BY OWNER KIFRY (Phase 5 Remediation Authorized)  
**Target Slice:** BLRCA Slice 6 (Front-Line Operational, Teaching, Field, Executive Non-Financial & External Portal Roles)  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) v3.4 (`2026-10-13`)  
**Ratified Owner Decisions / ADRs:**
- `OD-STU-4` (Option A — Student Portal Scope & Routing)
- Blueprint v3.4 §5.0.1 (*Course Division Marketing & Kindergarten Shielding*)
- Blueprint v3.4 §6.10 (*Campus Support / Facilities Role Boundaries*)

---

## 1. Overview & Architectural Guardrails

This remediation plan implements bounded, evidence-based fixes for the three findings identified in the BLRCA Slice 6 Read-Only Audit:

### Critical Architectural Guardrails
1. **Guardrail 1 (Preserve Marketing & Admin Batch Visibility on `/classes`):**
   Do **NOT** strip `marketing` or `admin` from `/classes` read rules. `MarketingDashboard.jsx:414` legitimately reads `/classes` within branch scope to display available batch capacity and seats in `<AvailableBatches />`, and `divisionIsolation.test.js:842` asserts same-branch `/classes` read for `admin`. Instead, specifically exclude `'officeboy'` and `'cleaner'` from the `isStaff()` read clauses on `/users` (`firestore.rules:735, 745`), `/classes` (`firestore.rules:848, 856`), and `/attendance` (`firestore.rules:899, 901`), introducing `isNonFacilityStaff()` helper in `firestore.rules` and mirroring in `securityRulesMatrix.helpers.js`.
2. **Guardrail 2 (Strict Kindergarten Shielding for Marketing Regardless of Profile Division):**
   Even if a legacy or mis-configured `marketing` profile document contains `division == 'all'` or `division == 'kindergarten'`, Marketing belongs exclusively to the Course Division (`Blueprint v3.4 §5.0.1`) and must **NEVER** read or write `division == 'kindergarten'` records. Update `isDivisionAllowedForBranchStaff` in both `firestore.rules:171-181` and `securityRulesMatrix.helpers.js:174-182` so that when `role == 'marketing'`, `uDiv == 'all'` and `uDiv == 'kindergarten'` do NOT grant Kindergarten access (i.e. `role == 'marketing'` always requires `(!('division' in data) || data.division != 'kindergarten')`).

---

## 2. File Modification & Safeguard Matrix

| Target File | Finding / Policy | Modification Summary | Architectural Safeguards |
|---|---|---|---|
| `firestore.rules` | `DOM05-PRIV-04` (Tier 1 HIGH)<br>`DOM14-GOV-01` (Tier 2 MEDIUM) | 1. Add `function isNonFacilityStaff()`: `isStaff() && !(userProfile().role in ['officeboy', 'cleaner'])`.<br>2. Replace `isStaff()` with `isNonFacilityStaff()` in read rules on `/users` (lines 735, 745), `/classes` (lines 848, 856), and `/attendance` (lines 899, 901).<br>3. In `isDivisionAllowedForBranchStaff` (lines 171-181), enforce that `role == 'marketing'` is strictly locked to Course Division (`(!('division' in data) || data.division != 'kindergarten')`), ignoring `uDiv == 'all'` or `uDiv == 'kindergarten'`. | Retains `officeboy` access to own `/users/{uid}`, own `/shifts`, and `/todos`. Preserves `marketing` and `admin` `/classes` read. Completely blocks facilities from reading student/parent PII and class rosters. |
| `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` | Parity for Rules | 1. Add `isNonFacilityStaff(user)`.<br>2. Update `canGetUser`, `canListUsers`, `canGetClass`, `canListClasses`, `canGetAttendance`, `canListAttendance` to use `isNonFacilityStaff`.<br>3. Update `isDivisionAllowedForBranchStaff` to enforce `role === 'marketing'` Course Division restriction. | Guarantees exact behavioral parity between Firestore rules engine and JavaScript security matrix test harness. |
| `src/features/shared/securityRulesMatrix/divisionIsolation.test.js` | `DOM05-PRIV-04`<br>`DOM14-GOV-01` | 1. Add unit test asserting `officeboy` is denied `/users` (student/parent/instructor), `/classes`, and `/attendance`, while allowed own `/users/{uid}`, own `/shifts`, and `/todos`.<br>2. Add unit test asserting `marketing` with `division: "all"` or `"kindergarten"` is denied reading or listing Kindergarten `/applications` and `/deskInquiries`. | Automated regression coverage for privacy boundaries. |
| `src/features/dashboard/MarketingDashboard.jsx` | `DOM14-GOV-01` | 1. Remove `profileDivision === "all"` division switcher (`lines 194-200, 422-444`). Lock `divisionFilter` strictly to `"courses"`.<br>2. In `unsubApplications` (`lines 221-239`) and `unsubDeskInquiries` (`lines 241-255`), filter out `d.division === "kindergarten"` docs so Kindergarten records never enter state or KPI counts. | Eliminates UI toggle and prevents any Kindergarten records from leaking into Marketing dashboard. |
| `src/schemas/inviteSchema.js` | `DOM14-GOV-01` | Add schema refinement asserting that if `role === "marketing"`, `division` must strictly be `"courses"` (rejecting `"kindergarten"` and `"all"`). | Fails closed at schema validation on invitation creation. |
| `src/schemas/schemas.test.js` | `DOM14-GOV-01` | Add unit tests asserting `inviteSchema` rejects `role: "marketing"` with `division: "kindergarten"` or `division: "all"`. | Automated schema test validation. |
| `src/features/staff/InvitesPanel.jsx` | `DOM14-GOV-01` | When `inviteRole === "marketing"`, lock division selection to `"courses"` and hide/disable `"kindergarten"` and `"all"`. | UI form prevents sending invalid marketing invitations. |
| `src/features/shared/ApprovalInbox.jsx` | `DOM14-GOV-01` | In staff onboarding review, if `assignedRole === "marketing"`, force/default `assignedDivision` to `"courses"`. | Executive approval modal enforces marketing division lock. |
| `src/App.jsx` | `SL6-STU-01` / `OD-STU-4` | Remove dead `<a href="/portal">Go to Parent & Student Portal</a>` button (`lines 658-663`) on `effectiveRole === "student"` card, preserving informational copy and `Sign Out` button. | Implements ratified Owner Decision `OD-STU-4` Option A. |

---

## 3. Step-by-Step Implementation Strategy

### Step 1: Firestore Security Rules & Matrix Parity (Fixes 1 & 2)
- Update `firestore.rules`:
  - Define `function isNonFacilityStaff() { return isStaff() && !(userProfile().role in ['officeboy', 'cleaner']); }`.
  - In `isDivisionAllowedForBranchStaff(data)`:
    ```javascript
    function isDivisionAllowedForBranchStaff(data) {
      let p = userProfile();
      let role = p != null && 'role' in p ? p.role : '';
      let isStaffRole = role in ['manager', 'frontoffice', 'opslead', 'ops_lead', 'operational_leader', 'operationalleader', 'frontofficelead', 'marketing'];
      let uDiv = userDivision();
      return !isStaffRole
        || (role == 'marketing'
          ? (!('division' in data) || data.division != 'kindergarten')
          : (
            (uDiv == 'all' && role != 'manager')
            || (uDiv == 'kindergarten'
              ? (data != null && 'division' in data && data.division == 'kindergarten')
              : (!('division' in data) || data.division != 'kindergarten'))
          ));
    }
    ```
  - In `/users/{userId}` read rules (lines 735, 745), replace `isStaff()` with `isNonFacilityStaff()`.
  - In `/classes/{classId}` read rules (lines 848, 856), replace `isStaff()` with `isNonFacilityStaff()`.
  - In `/attendance/{attendanceId}` read rules (lines 899, 901), replace `isStaff()` with `isNonFacilityStaff()`.
- Update `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`:
  - Mirror `isNonFacilityStaff(user)`.
  - Mirror `isDivisionAllowedForBranchStaff(data, user)`.
  - Update `canGetUser`, `canListUsers`, `canGetClass`, `canListClasses`, `canGetAttendance`, `canListAttendance`.
- Update `src/features/shared/securityRulesMatrix/divisionIsolation.test.js`:
  - Add comprehensive test assertions for `officeboy` denial on `/users`, `/classes`, `/attendance`.
  - Add comprehensive test assertions for `marketing` Kindergarten denial on `/applications` and `/deskInquiries`.

### Step 2: Marketing Dashboard & Schemas (Fix 2)
- In `src/features/dashboard/MarketingDashboard.jsx`:
  - Remove `divisionFilter` state toggle; bind queries and tabs strictly to `"courses"`.
  - Add client-side filter `d.division !== "kindergarten"` in application and inquiry listeners.
- In `src/schemas/inviteSchema.js`:
  - Add refinement disallowing `role === "marketing" && division !== "courses"`.
- In `src/features/staff/InvitesPanel.jsx` & `src/features/shared/ApprovalInbox.jsx`:
  - Lock `division` to `"courses"` when `role === "marketing"`.
- In `src/schemas/schemas.test.js`:
  - Add test coverage for marketing division constraints.

### Step 3: Student Account Card Cleanup (Fix 3)
- In `src/App.jsx:658-663`:
  - Remove the dead `<a href="/portal">` link button. Retain informational note and `Sign Out`.

---

## 4. Verification & Stop Boundary

1. Run targeted Vitest test suites:
   - `npx vitest run src/features/shared/securityRulesMatrix/`
   - `npx vitest run src/schemas/schemas.test.js`
   - `npx vitest run src/features/dashboard/`
   - `npx vitest run src/App.test.jsx` (or full suite)
2. Run quality checks: `npm run lint`, `npm run typecheck`, `npm run build`.
3. Register updates:
   - `bug-ledger.md`: `DOM05-PRIV-04` $\rightarrow$ `PENDING_INDEPENDENT_VERIFICATION`; `DOM14-GOV-01` $\rightarrow$ `CLOSED`.
   - `role-function-conformance-ledger.md`: Update `SL6-16` and `SL6-17` to `PASS`; update summary.
   - `role-business-logic-conformance-audit.md`: Append Section 9.7 Remediation Summary.
   - `audit-log.md`: Log Phase 5 execution.
4. Stop and hand off to Independent Advisor for BLRCA Slice 6 Phase 6 verification.
