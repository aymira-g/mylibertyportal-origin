# Front Office Dashboard: Phase 4 Completion Report — Intake Governance, Fail-Closed Security & Contact Mapping

> **Document Type:** Level 1 verification & implementation completion report  
> **Date:** 2026-10-10  
> **Governing Baseline:** Authoritative Blueprint v3.3 (ratified 2026-10-07)  
> **Companion Documents:** [`00-phase0-audit.md`](./00-phase0-audit.md), [`01-phase1-completion-report.md`](./01-phase1-completion-report.md), [`02-phase2-completion-report.md`](./02-phase2-completion-report.md), [`03-phase3-completion-report.md`](./03-phase3-completion-report.md), [`owner-decisions.md`](./owner-decisions.md)  
> **Scope:** Enrollment branch assignment, contact mapping, fail-closed permission denial (F-15 / FO-A), plain storage PII remediation (F-16 / FO-04), and desk UX refinements  
> **Status:** COMPLETED & TEST-VERIFIED (local only — **not deployed**)  

---

## 1. Executive Summary

Following the completion of Phase 3 (academic level decoupling), this phase addressed the remaining high-severity intake defects, data privacy leaks, and permission bypasses in the Front Office dashboard workflow:

1. **Intake Contact-Field Mapping & Honorific Disambiguation:**
   - Intake forms often capture a single `parentName` (e.g., "Ibu Maria" or "Bapak Hendra"). Previously, the codebase blindly duplicated the name and phone number into both `fatherName`/`fatherPhone` AND `motherName`/`motherPhone`.
   - Built `mapInquiryToEnrollment(inquiry, context)` in [`src/features/dashboard/frontoffice/walkInUtils.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/walkInUtils.js) which intelligently disambiguates Indonesian honorifics:
     - Mother honorifics (`Ibu`, `Mama`, `Ny.`, `Mrs`, `Umi`, `Bunda`) map to `motherName`/`motherPhone` without populating `fatherName`.
     - Father honorifics (`Bapak`, `Pak`, `Bpk`, `Mr`, `Papa`, `Ayah`, `Abi`) map to `fatherName`/`fatherPhone` without populating `motherName`.
     - Indeterminate parent names populate `parentName`/`parentPhone` as primary guardian without fabricating or duplicating into maternal/paternal fields.
   - Added a visible "Primary Contact / Guardian (Wali / Kontak Pendaftar)" card in [`src/features/students/StudentFamilyFields.jsx`](file:///e:/myliberty-portal/src/features/students/StudentFamilyFields.jsx) and mapped parity in [`src/features/students/applicationsRepository.js`](file:///e:/myliberty-portal/src/features/students/applicationsRepository.js).

2. **Dynamic Branch Assignment:**
   - Eliminated hardcoded `"Kota Gorontalo"` fallback. Inquiries dynamically inherit `inquiry.branch || branch || DEFAULT_BRANCH` and its canonical `branchId`.
   - Updated [`src/features/dashboard/useDashboardData.js`](file:///e:/myliberty-portal/src/features/dashboard/useDashboardData.js) so `handleAddStudent`, `handleAddStaff`, and `handleEdit` guarantee canonical `branchId` propagation alongside `branch`.

3. **Academic Level Honesty at Reception Intake:**
   - Replaced all fabricated `"warrior"` and `"nursery"` defaults and conversational `fluencyTier` inferences with the explicit `UNASSESSED` sentinel (`"unassessed"`).
   - Walk-in inquiries start with `currentLevel: ""` / `UNASSESSED`. An assessed level is only assigned if a formal placement test is recorded or verified (`hasAssessedLevel`), upholding Owner Decision OD-FO-3 / F-11.

4. **Fail-Closed Repository Enforcement (F-15 / FO-A & FO-01 Remediation):**
   - In [`src/features/dashboard/frontoffice/deskInquiriesRepository.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/deskInquiriesRepository.js), stripped catch blocks that swallowed `isPermissionError` and returned `{ ...localRecord, _permissionDenied: true }`.
   - Rejects mutations (`addPlacementTestToInquiry`, `updateDeskInquiryStatus`, `markInquiryConverted`) on unpersisted `local-` inquiries, requiring an authoritative server record.
   - Removed deceptive UI paths in [`src/features/dashboard/frontoffice/WalkInInquiryTab.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInInquiryTab.jsx):
     - Deleted fake "Prospect saved locally! Opening Student Registration form..." success toast on permission error.
     - Blocked registration form modal on failed writes, rendering authentic error toasts: `"Permission denied: You are not authorized to log inquiries for this branch or division."`
     - Guarded `handleSavePlacementTest`: permission errors and `_permissionDenied` flags are rejected, bubbling explicit permission-denied toasts without showing false success or triggering enrollment.
     - Blocked recording placement tests or enrolling unpersisted local records.
     - Removed shadow loading (`getLocalInquiries()`) in `loadInquiries()`. On permission failure, inquiries set to `[]` and `hasPermission` set to `false`.
     - Replaced misleading developer message ("Deploy firestore.rules to enable cloud sync...") with an honest "Access Restricted" alert.

5. **Elimination of Default Branch Fallback in Inquiries (FO-02 Remediation):**
   - In [`src/constants/branches.js`](file:///e:/myliberty-portal/src/constants/branches.js), exported `isValidBranch(raw)` to validate branches against canonical list, ID slugs, and legacy aliases.
   - In [`src/features/dashboard/frontoffice/deskInquiriesRepository.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/deskInquiriesRepository.js), `createDeskInquiry` requires an explicit, validated branch, throwing an error if missing or invalid instead of silently falling back to `DEFAULT_BRANCH_ID`.
   - In [`src/features/dashboard/frontoffice/WalkInInquiryTab.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInInquiryTab.jsx), stripped `branchLabel = DEFAULT_BRANCH` default prop and blocks saving if no active branch assignment is present.

6. **Plain Storage PII Remediation (F-16 / FO-04):**
   - Deprecated plain `localStorage` shadow writes of visitor and child PII.
   - Provided `clearLocalInquiries()` in `walkInUtils.js` to wipe residual storage caches safely.

7. **Dashboard UX Refinements & Governance Alignment:**
   - **Smart Action States in `WalkInTable.jsx`:**
     - Enrolled inquiries display an `Enrolled` badge with a checkmark, eliminating redundant registration clicks.
     - Inquiries with pending placement level overrides display a disabled `On Hold` button with an explanatory tooltip, preventing front desk staff from attempting enrollment while awaiting Instructor Leader approval.
     - Standard eligible prospects display the primary `Enroll` button.
   - **Governance Terminology Reconciliation:**
     - Reconciled legacy "branch manager" text in `WalkInInquiryTab.jsx` to "division manager or system administrator" in compliance with Blueprint v3.3 §5.5 (removal of Branch Manager role).

---

## 2. Changes Summary by Component

| File | Changes Made |
|---|---|
| [`src/constants/branches.js`](file:///e:/myliberty-portal/src/constants/branches.js) | Exported `isValidBranch(raw)` validator for canonical branches, slugs, and legacy aliases. |
| [`src/constants/branches.test.js`](file:///e:/myliberty-portal/src/constants/branches.test.js) | Added unit tests verifying `isValidBranch` against valid branches, slugs, aliases, and invalid names. |
| [`src/features/dashboard/frontoffice/walkInUtils.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/walkInUtils.js) | Implemented pure `mapInquiryToEnrollment`; Indonesian honorific parsing; dynamic branch assignment; honest `UNASSESSED` level; deprecated local shadow writes; added `clearLocalInquiries`. |
| [`src/features/dashboard/frontoffice/deskInquiriesRepository.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/deskInquiriesRepository.js) | Enforced fail-closed behavior on permission errors; validated required branch (FO-02); rejected unpersisted local inquiry mutations for placement tests, status updates, and conversions (FO-01). |
| [`src/features/dashboard/frontoffice/deskInquiriesRepository.test.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/deskInquiriesRepository.test.js) | Added tests for required branch validation (FO-02), fail-closed placement test permission errors, and local inquiry rejection (FO-01). |
| [`src/features/dashboard/frontoffice/WalkInInquiryTab.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInInquiryTab.jsx) | Stripped fake success toasts on permission errors; removed `DEFAULT_BRANCH` prop fallback (FO-02); guarded placement test and enrollment flows against unpersisted local records and permission denial (FO-01); reconciled legacy branch manager text. |
| [`src/features/dashboard/frontoffice/WalkInTable.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInTable.jsx) | Added smart button states: `Enrolled` badge for converted students, `On Hold` button for pending placement overrides, `Enroll` for eligible walk-ins. Added full JSDoc types. |
| [`src/features/dashboard/frontoffice/WalkInModal.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInModal.jsx) | Removed unused tier matching; initialized `currentLevel` honestly. |
| [`src/features/dashboard/FrontOfficeDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/FrontOfficeDashboard.jsx) | Integrated `mapInquiryToEnrollment`; cleaned unused imports. |
| [`src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx) | Integrated `mapInquiryToEnrollment`; cleaned unused imports. |
| [`src/features/dashboard/useDashboardData.js`](file:///e:/myliberty-portal/src/features/dashboard/useDashboardData.js) | Added `branchId` to `emptyFormData`, `handleAddStaff`, `handleAddStudent`, and `handleEdit` for branch isolation consistency. |
| [`src/features/students/StudentFamilyFields.jsx`](file:///e:/myliberty-portal/src/features/students/StudentFamilyFields.jsx) | Added primary guardian card (`parentName` / `parentPhone`) when specific maternal/paternal fields are blank. |
| [`src/features/students/applicationsRepository.js`](file:///e:/myliberty-portal/src/features/students/applicationsRepository.js) | Added `parentName` and `parentPhone` parity in student record construction. |
| [`src/features/dashboard/frontoffice/WalkInInquiryTab.test.js`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInInquiryTab.test.js) | Added 17 unit and static component tests covering mapping, honorific disambiguation, academic level honesty, PII storage clearing, and table button UX states. |

---

## 3. Test & Verification Evidence

All 4 quality gates pass cleanly across the entire workspace:

| Suite / Tool | Command | Scope | Result |
|---|---|---|---|
| **Vitest Unit & Component** | `npm test` | 102 test files | **1,283 passed, 114 skipped, 0 failed** |
| **ESLint** | `npm run lint` | Entire workspace | **0 errors, 0 warnings** |
| **TypeScript Typecheck** | `npm run typecheck` | Entire workspace (`tsc --noEmit`) | **0 errors** |
| **Production Build** | `npm run build` | Vite + PWA production bundle | **Built cleanly in 677ms**, 66 precached items |

---

## 4. Deployment Notice

In compliance with `AGENTS.md` and repository governance:
- **No changes have been deployed to production.**
- All verifications were executed locally in the development workspace.
