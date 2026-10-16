# BLRCA Slice 4 Remediation Plan: Data Exports, Downloads & Print Operations

**Date:** 2026-10-16  
**Status:** ACTIVE / RATIFIED BY OWNER KIFRY (`OD-EXP-1` Option A)  
**Target Slice:** BLRCA Slice 4 (Data Exports, Downloads & Print Operations Across Roles)  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) v3.4 (`2026-10-13`)  
**Ratified Owner Decisions:** `OD-1`, `OD-2`, `OD-3`, `OD-4`, `OD-STU-1`, `OD-STU-2`, `OD-STU-3`, `OD-EXP-1` (Option A)

---

## 1. Overview & Objectives

This remediation plan implements the bounded, evidence-based code fixes for all 8 findings identified in BLRCA Slice 4 Phases 0–4:
1. **`DOM04-CSV-01` / `DOM11-CSV-01` (High):** Implement mathematical netting integrity in `FinancialReportsTab.jsx` CSV export so `=SUM(Amount)` in Excel strictly matches the onscreen grand total without doubling reversals or voided amounts.
2. **`DOM11-PRIV-01` & `DOM11-GOV-05` (High / Med):** Gate `Export CSV Dataset` in `ReportsDashboard.jsx` to authorized roles (`isExecutiveView || isManager || isFrontOffice || isInstructorLeader`) and strip `isActualAdmin` from `canAccessProvinceScope` (Blueprint §7, OD-2). Pass `isInstructorLeader={true}` from `InstructorLeaderDashboard.jsx`.
3. **`DOM05-UX-03` & `DOM05-PRIV-03` (Med):** In `StudentRoster.jsx`, decouple roster CSV export from `!readOnly` so the Vice Director can export rosters while teaching instructors remain blocked. In `StudentRoster.jsx`, `StudentRosterTable.jsx`, and `InstructorClasses.jsx`, hide the "View / Print ID Badge" action for teaching instructors.
4. **`DOM06-PRIV-01` (Med):** In `BatchOutreachPanel.jsx` and `ClassManager.jsx`, restrict bulk parent phone clipboard copying to authorized operational roles (`director`, `vice_director`, `manager`, `opslead`, `frontoffice`, `marketing`).
5. **`DOM04-PRIV-01` (Low / Ratified OD-EXP-1 Option A):** Suppress internal cashier remarks (`payment.notes`) from customer-facing printable receipts in `DigitalReceiptTab.jsx` and WhatsApp messages in `receiptMessages.js`.
6. **`DOM11-TECH-02` (Info):** Retain `src/features/shared/printTable.js` as an approved shared utility per `AGENTS.md` line 300; close item as retained utility.

---

## 2. File Modification & Safeguard Matrix

| Target File | Finding / Policy | Modification Summary | Architectural Safeguards |
|---|---|---|---|
| `src/features/reports/tabs/FinancialReportsTab.jsx` | `DOM04-CSV-01` / `DOM11-CSV-01` | Pre-collect `voidedIds`, calculate `netAmount` with reversal subtraction, export `Amount (IDR)` and `Original / Gross Amount (IDR)` | **Math Netting Safeguard:** In-window voided/reversal pairs net to 0; out-of-window reversals subtract from total. |
| `src/features/reports/tabs/FinancialReportsTab.test.js` | `DOM04-CSV-01` | Add unit tests asserting export CSV netting logic | Verify voided + reversal pairs net to 0. |
| `src/features/dashboard/InstructorLeaderDashboard.jsx` | `DOM11-PRIV-01`, `DOM11-GOV-05` | Pass `isInstructorLeader={true}` to `<ReportsDashboard />` | Distinguishes Academic Lead from teaching instructors. |
| `src/features/reports/ReportsDashboard.jsx` | `DOM11-PRIV-01`, `DOM11-GOV-05` | Accept `isInstructorLeader`, set `canAccessProvinceScope = isExecutiveView \|\| isInstructorLeader`, gate `handleExportCSV` to leadership roles | Strip Admin from multi-campus filter; hide CSV export from teaching instructors. |
| `src/features/students/StudentRoster.jsx` | `DOM05-UX-03`, `DOM05-PRIV-03` | `canExportRoster = userRole !== 'instructor' && userRole !== 'admin'`, pass `onBadgeClick={userRole === 'instructor' ? null : setSelectedStudent}` | Vice Director retains CSV download; teaching instructors blocked from badge print. |
| `src/features/dashboard/instructor/InstructorClasses.jsx` | `DOM05-PRIV-03` | Pass `setSelectedStudent={null}` to `StudentRoster`; remove `<BadgeModal />` | Defense-in-depth credential protection. |
| `src/features/classes/BatchOutreachPanel.jsx` | `DOM06-PRIV-01` | Add `role` prop; gate `handleCopyAll` behind `canCopyAll` for operational roles | Prevents unauthorized bulk parent phone dumps. |
| `src/features/classes/ClassManager.jsx` | `DOM06-PRIV-01` | Pass `canPerformOutreach` and `role` to `BatchOutreachPanel` and `CohortRosterTable` | Defense-in-depth UI gating. |
| `src/features/finance/DigitalReceiptTab.jsx` | `DOM04-PRIV-01` (OD-EXP-1) | Remove `activeReceipt.notes` from customer printable receipt | Protects internal cashier remarks. |
| `src/features/finance/receiptMessages.js` | `DOM04-PRIV-01` (OD-EXP-1) | Remove `rcp.notes` from `buildWhatsAppReceiptMessage` | Protects internal remarks from WhatsApp messages. |
| `src/features/finance/receiptMessages.test.js` | `DOM04-PRIV-01` (OD-EXP-1) | Update test suite to assert notes suppression | Prevents regression on receipt formatting. |

---

## 3. Step-by-Step Implementation Strategy

### Step 1: Financial Reports CSV Netting Integrity (`FinancialReportsTab.jsx`)
- Match `summarizePaymentsByMethod` in `financeUtils.js`.
- Compute `netAmount` per payment row:
  - If `status === 'voided'`: `0`.
  - If reversal with original ID in `voidedIds`: `0`.
  - If standalone reversal: `-Math.abs(amount)`.
  - Otherwise: `amount`.
- Update headers to include `Amount (IDR)` and `Original / Gross Amount (IDR)`.

### Step 2: Gate Reports CSV & Decouple Admin Multi-Campus Scope
- Update `InstructorLeaderDashboard.jsx` to pass `isInstructorLeader={true}`.
- In `ReportsDashboard.jsx`:
  - `canAccessProvinceScope = isExecutiveView || isInstructorLeader;`
  - `canExportReports = isExecutiveView || isManager || isFrontOffice || isInstructorLeader;`
  - Conditionally render top-level export button: `{canExportReports && <button ... />}`.
  - Guard `handleExportCSV`: `if (!canExportReports) return;`.

### Step 3: Decouple Roster CSV Export & Shield Student ID Badge Printing
- In `StudentRoster.jsx`:
  - `const canExportRoster = userRole !== 'instructor' && userRole !== 'admin';`
  - Replace `!readOnly && userRole !== 'instructor'` with `canExportRoster`.
  - Guard `onBadgeClick={userRole === 'instructor' ? null : setSelectedStudent}` on both mobile and table views.
- In `InstructorClasses.jsx`:
  - Pass `setSelectedStudent={null}` to `StudentRoster`.
  - Remove `<BadgeModal />`.

### Step 4: Shield Bulk Parent Phone Numbers Clipboard Export
- In `ClassManager.jsx`:
  - Define `canPerformOutreach` for operational roles (`director`, `vice_director`, `manager`, `opslead`, `frontoffice`, `marketing`).
  - Pass `canPerformOutreach ? ((cls) => setOutreachBatch(cls)) : undefined` to `CohortRosterTable`.
  - Pass `role={role}` to `BatchOutreachPanel`.
- In `BatchOutreachPanel.jsx`:
  - Define `canCopyAll` and hide/disable `Copy All Numbers` button if unauthorized.

### Step 5: Implement Ratified OD-EXP-1 Option A
- In `DigitalReceiptTab.jsx`: remove lines 84–89 displaying `activeReceipt.notes`.
- In `receiptMessages.js`: remove line 70 inserting `rcp.notes`.
- In `receiptMessages.test.js`: assert notes suppression per OD-EXP-1 Option A.

### Step 6: Verification & Quality Gates
- Execute `npm test`.
- Execute `npx vitest run src/features/shared/securityRulesMatrix/`.
- Execute `npm run typecheck`, `npm run lint`, and `npm run build`.
- Update `bug-ledger.md`, `role-function-conformance-ledger.md`, `role-business-logic-conformance-audit.md`, and `audit-log.md`.
