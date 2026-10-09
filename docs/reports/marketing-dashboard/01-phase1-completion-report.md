# Marketing Dashboard: Phase 1 Refinement & Security Hardening Completion Report

> **Document Type:** Level 1 Verification & Implementation Completion Report  
> **Audited & Implemented By:** Coding / Executor Agent  
> **Governing Baseline:** Authoritative Blueprint v3.3 (Ratified 2026-10-07)  
> **Governing Decisions:** [`owner-decisions.md`](./owner-decisions.md) (OD-MKT-1 through OD-MKT-13)  
> **Reference Brief:** [`docs/audit-prompts/2026-10-09-marketing-dashboard-phase1-brief.md`](../../audit-prompts/2026-10-09-marketing-dashboard-phase1-brief.md)  
> **Date:** 2026-10-09  
> **Status:** COMPLETED & VERIFIED (Zero-Budget, Local-Only, Pre-Deployment)  

---

## 1. Executive Summary

Phase 1 refinement of the Marketing Dashboard and its governing security rules has been completed in strict accordance with the Authoritative Governance Blueprint v3.3 and the ratified owner decisions in `owner-decisions.md`.

All 7 scoped implementation tasks (Tasks 0–6) have been completed, verified against the real Firestore emulator, checked for TypeScript and ESLint compliance, and validated with full unit test coverage. Zero regressions were introduced, expression evaluation budgets were preserved, and no unapproved deployment has occurred.

---

## 2. Ratified Owner Decisions Summary

The owner (Kifry) ratified decisions OD-MKT-1 through OD-MKT-13 on 2026-10-09:

| Decision ID | Summary | Ratified Option | Status |
|---|---|---|---|
| **OD-MKT-1** | Overview KPI Metrics & Inquiry Source of Truth | Option A: Split into Walk-In Inquiries (`deskInquiries`) and Online Applications (`applications`) | COMPLETED |
| **OD-MKT-2** | Marketing Role Division Scope | Option A: Division-bound (`courses` / `kindergarten`) with `all` toggle | COMPLETED |
| **OD-MKT-3** | Ownership of Legacy Branchless Records | Option A: Ratify Kota Gorontalo legacy ownership; backfill dry-run first | GOVERNED |
| **OD-MKT-4** | System Admin Business Record Deletion Authority | Option A: Revoke `isAdmin()` delete on all 11 business/financial collections | COMPLETED |
| **OD-MKT-5** | Staff Invite Role Restriction & Privilege Escalation | Option A: Require `isDirector()` when creating invites for `admin`, `director`, `vice_director` | COMPLETED |
| **OD-MKT-6** | Surviving Branch Manager Approval Authority | Option A: Remove `branch_manager` from all gate approver sets | COMPLETED |
| **OD-MKT-7** | Inquiry Follow-Up Tracking Fields | Option A: Add `nextFollowUpDate` and `lastContactedAt` to `deskInquiries` | GOVERNED (Phase 2) |
| **OD-MKT-8** | Admissions Record Deletion Boundary | Option A: Restrict deletion strictly to Executive Dual-Control (Director / Vice Director) | COMPLETED |
| **OD-MKT-9** | Division Manager Class Management Authority | Option A: Record as explicit governance gap for §26 owner amendment | GOVERNED (Phase 2) |
| **OD-MKT-10** | Complete Repo-Wide `branch_manager` Removal | Option B: Remove across rules, backend, client, helpers, and tests | COMPLETED |
| **OD-MKT-11** | Production Parity & Rule Deployment Control | Option A: Local emulator suite verification; zero deploy without approval | COMPLETED |
| **OD-MKT-12** | `isExecutive()` Architecture Refactor Boundary | Option A: Explicitly out of scope for Phase 1; baseline monitored | COMPLETED |
| **OD-MKT-13** | Class Write Rules Boundary | Option A: Explicitly out of scope for Phase 1; capacity reads only | COMPLETED |

### Prerequisite Data Verification (OD-MKT-10)
Before executing repo-wide removal of `branch_manager`, the Owner performed a live database check on production Firestore:
- **Result:** **0 documents** in the `users` collection carry `role: "branch_manager"`.
- `manager.test@myliberty.id` was verified to already carry canonical `role: "manager"`.
- Because zero live documents carry the deprecated role, repo-wide removal proceeded safely with no danger of breaking real user accounts.

---

## 3. Implementation Details by Task

### Task 0 — Audit Errata & Ground Truth Alignment
Appended the **"Errata (verification pass)"** section to [`00-phase0-audit.md`](./00-phase0-audit.md) without rewriting historical findings (Blueprint §27, G-010):
- **E1:** Clarified inverted rule blocks between `progressReports` (:891) and `shifts` (:918).
- **E2:** Flagged MKT-P0-004 as Not Reproduced (`isApproverForDoc` never contained `isAdmin`).
- **E3:** Corrected the 5 Ops Lead matrix cells (Ops Lead belongs to `isFrontOffice` family).
- **E4:** Documented that `MarketingOverview` is inline in `MarketingDashboard.jsx:20`.
- **E5:** Clarified `docs/ARCHITECTURE.md` is Version 2.
- **E6:** Identified that applications are submitted via `FormSync.gs`, not Cloudflare Worker.
- **E7:** Documented that Division Manager class management is absent.
- **E8:** Recorded all 6 budget sites and 10 evaluation-error sites.
- **E9:** Clarified that the Overdue Follow-Up Engine requires `nextFollowUpDate`.
- Appended findings **MKT-P0-024** (ungoverned admissions authority), **MKT-P0-025** (absent class management), and the duplicate-inquiry gap.

### Task 1 — Real Branch and Division Context Binding
- [`MarketingDashboard.jsx`](../../src/features/dashboard/MarketingDashboard.jsx):
  - Replaced hardcoded `"Kota Gorontalo"` with dynamic `marketingBranchId` and `marketingBranchLabel`.
  - Added honest, fail-closed empty state: when a user profile has no assigned branch, the dashboard displays a clear warning card with an `AlertCircle` icon indicating that branch assignment is required, rather than silently falling back to Kota Gorontalo.
- [`AddSchoolModal.jsx`](../../src/features/dashboard/marketing/AddSchoolModal.jsx):
  - Accepts `branchId` prop. Dynamically resolves default municipality and district based on the user's branch (e.g. Pohuwato $\rightarrow$ Marisa, Bone Bolango $\rightarrow$ Suwawa) rather than hardcoding Kota Gorontalo/Kota Tengah.
  - Explicitly passes `branchId` and `branch` to `addSchool`.
- [`SchoolOutreachTab.jsx`](../../src/features/dashboard/marketing/SchoolOutreachTab.jsx):
  - Passes `branchId` to `<AddSchoolModal />`.

### Task 2 — Overview Metrics & Navigation Disconnect Resolution
- [`MarketingDashboard.jsx`](../../src/features/dashboard/MarketingDashboard.jsx):
  - Split Overview into two accurate, dedicated cards:
    1. **Walk-In Inquiries:** Displays count of `deskInquiries` with `status: "inquired"`. Clicking navigates to the `inquiries` (Guestbook) tab.
    2. **Online Applications:** Displays count of `applications` with `status: "pending"`. Clicking navigates to the `applications` tab.
  - Added new **Online Applications** tab rendering `<StudentApplications applications={applications} classes={classes} readOnly={true} />`. This allows marketing representatives to inspect incoming web applications in a read-only view without granting unauthorized admission mutation rights.

### Task 3 — Class Capacity Calculation Correctness
- [`MarketingDashboard.jsx`](../../src/features/dashboard/MarketingDashboard.jsx):
  - Excluded `cancelled` and `completed` batches from the `openSeats` calculation (`classes.filter(c => c.status !== "cancelled" && c.status !== "completed")`).
- [`AvailableBatches.jsx`](../../src/features/classes/AvailableBatches.jsx):
  - Excluded `cancelled` and `completed` batches from the `totalCapacity` and `totalEnrolled` aggregate metrics.

### Task 4 — Division-Aware Routing
- [`App.jsx`](../../src/App.jsx):
  - Passed `branch={branch} division={effectiveDivision}` to `<MarketingDashboard />`.
- [`MarketingDashboard.jsx`](../../src/features/dashboard/MarketingDashboard.jsx):
  - Accepts `division` prop.
  - Supports division toggle pill ("English Courses" / "Kindergarten") when the profile has `division === "all"`.
  - Passes active division down to `<WalkInInquiryTab />`.

### Task 5 — Ratified Security Hardening & Repo-Wide Role Removal
1. **Revocation of `isAdmin()` Delete across Business Collections (Blueprint Principle 13):**
   - Removed `isAdmin()` from `allow delete` on 11 business collections in `firestore.rules`:
     - `users` (:521)
     - `classes` (:615)
     - `attendance` (:682)
     - `corporateEvents` (:719)
     - `classAttendance` (:797)
     - `payments` (:821)
     - `shifts` (:960)
     - `schoolOutreach` (:1023)
     - `visits` (:1038, :1054)
   - Admin retains deletion only on technical maintenance resources: `invites` (:584), `errorLogs` (:1006), and kiosk collections.
2. **Director-Only Executive / Admin Invites (OD-MKT-5, G-002):**
   - In `firestore.rules:587`, `invites` `create` now enforces:
     `!(request.resource.data.role in ['admin', 'director', 'vice_director']) || isDirector()`
3. **Admissions Record Deletion Restricted to Dual-Control (OD-MKT-8):**
   - `applications` (:594) and `deskInquiries` (:840) deletion is restricted strictly to `isViceDirector() || isDirector()`.
   - Front Office, Manager, and Admin deletion grants were revoked.
4. **Complete Repo-Wide Removal of `branch_manager` (OD-MKT-10):**
   - `firestore.rules`: Removed from `isManager()`, `isStaff()`, `isDivisionAllowedForBranchStaff()`, `gateAllowsApprover()`, `isApproverForDoc()`, `isApprovedShiftCorrection()`.
   - `cloudflare-worker/worker.js`: Removed `branch_manager: "manager"` from `LEGACY_ROLE_ALIASES`.
   - `src/features/shared/roles.js`: Removed `branch_manager: "manager"` from `LEGACY_ROLE_ALIASES` and JSDoc.
   - `src/features/shared/approvalGates.js`: Removed `APPROVAL_ROLES.BRANCH_MANAGER` and switch case.
   - `src/features/shared/approvalsRepository.js`: Updated manager pending approvals query to equality `where("approverRole", "==", APPROVAL_ROLES.DIVISION_MANAGER)`.
   - `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`: Removed `branch_manager` across helpers and gate approver sets; removed `isAdmin()` user delete grant.
   - Test suites updated to assert rejection of `branch_manager` and revocation of admin deletions.
   - Added 4 new emulator test suites in `firestoreRules.emulator.test.js`.

### Task 6 — Documentation Corrections
- [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT-v3.md`](../../MYLIBERTY-AUTHORITATIVE-BLUEPRINT-v3.md):
  - Updated status header to `RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY)` per MKT-P0-020.
- [`owner-decisions.md`](./owner-decisions.md):
  - Updated with ratified decisions OD-MKT-1 through OD-MKT-13, ratification dates, and live data check evidence.
- [`docs/audits/current/regression-log.md`](../current/regression-log.md):
  - Appended full Level 1 regression check entry.

---

## 4. Evaluation Budget & Stderr Baseline

As required by §1.5 and Task 6, emulator stderr was inspected to ensure the 1000-expression evaluation budget was not exceeded:
- **Baseline Budget Sites (6 locations):** `:521`, `:806`, `:833`, `:863`, `:935`, `:1075`.
- **Baseline Evaluation-Error Sites (10 locations):** `:497`, `:521`, `:707`, `:719`, `:765`, `:787`, `:806`, `:812`, `:837`, `:863`, `:915`, `:926`, `:965`.
- **Finding:** No new budget sites were created. Expression evaluation remained stable and budget sites did not expand past the 6 baseline locations.

---

## 5. Verification Matrix

| Validation Layer | Command | Result | Details |
|---|---|---|---|
| **Firestore Emulator Rules** | `npm run test:rules` | **110 passed, 0 failed** | 4 new emulator test suites covering Admin delete denial, `branch_manager` rejection, invite creation restriction, and admissions delete dual-control. |
| **Unit & Integration Suite** | `npm test` | **1,257 passed, 110 skipped, 0 failed** | Full pass across all 102 test files. Emulator tests skipped in plain unit run as expected. |
| **TypeScript Checking** | `npm run typecheck` | **0 errors** | Clean pass (`tsc --noEmit`). |
| **ESLint Quality** | `npm run lint` | **0 errors, 0 warnings** | Clean pass (`eslint .`). |
| **Production Build** | `npm run build` | **Clean build (664ms)** | Production bundle and PWA service worker generated cleanly. |

---

## 6. Deployment Status & Future Work (Phase 2)

- **Deployment Status:** In accordance with OD-MKT-11, **zero production deployment has been performed.** All rules and code changes remain in the local working tree awaiting explicit human instruction.
- **Phase 2 Scope & Next Steps:**
  1. Implement the **Overdue Follow-Up Engine** on `deskInquiries` using the ratified `nextFollowUpDate` and `lastContactedAt` fields (OD-MKT-7).
  2. Draft Blueprint §26 amendment for **Division Manager class management authority** (OD-MKT-9) prior to touching class write rules.
  3. Execute the dry-run analysis for the legacy branchless documents backfill (OD-MKT-3).
