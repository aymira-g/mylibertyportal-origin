# Operational Leader Dashboard: Phase 0 Conformance Audit & Architecture Map

> **Document Type:** Phase 0 Architecture, Governance & Security Conformance Audit  
> **Target Role:** Operational Leader (`opslead` / `ops_lead` at branch-site scope)  
> **Governing Baselines:**  
> - [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (Blueprint v3.3, §0, §3.1, §4, §5, §6.8, §6.9, §6.10, §7) — RATIFIED AUTHORITATIVE BASELINE  
> - [`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](../../decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md) (Binding Owner Decisions G-001 through G-011)  
> - [`docs/specs/authorization-contract.md`](../../specs/authorization-contract.md)  
> **Status:** AUDIT COMPLETED & OWNER DECISIONS RATIFIED (OD-O1 to OD-O4) — READY FOR PHASE 1 IMPLEMENTATION  
> **Author:** Coding / Executor Agent  
> **Date:** 2026-10-08  
> **Verification Environment:** 91 test suites, 1,137 unit & matrix tests passed, 0 failures, TypeScript typecheck clean (0 errors), ESLint clean (0 errors).

---

## A. Executive Verdict

**Verdict:** **READY FOR PHASE 1 IMPLEMENTATION — OWNER DECISIONS RATIFIED (ALL OPTION A)**

### Plain-Language Reason for Kifry
1. **The Software Treats Ops Lead as Front Office:** In the backend security rules (`firestore.rules`), the Operational Leader was grouped into `isFrontOffice()`. Under Ratified OD-O4, we will introduce a strict `isOpsLead()` helper so ordinary cashiers cannot approve Ops Lead tickets.
2. **Owner Ratifications Applied:**
   - **OD-O1 (Option A):** "Front Office Lead" is confirmed as legacy only, not an organizational role.
   - **OD-O2 (Option A):** Operational Leader oversees the entire physical branch site (both Course and Kindergarten areas).
   - **OD-O3 (Option A):** Operational Leader monitors daily cash drawer reconciliation and approves discrepancies under Rp 20.000 (confirming G-009).
   - **OD-O4 (Option A):** Backend security rules authorized to decouple `isOpsLead()` from generic `frontoffice`.
3. **Execution Plan:** We can now proceed with Phase 1: Security Rules Hardening, Role Decoupling, and laying out the dedicated Operational Leader Dashboard structure.

---

## B. Current Role Flow (As-Is System Inventory)

```text
1. Authentication & Normalization:
   auth.currentUser -> Firestore user profile document (/users/{uid})
   - Stored role: "opslead", "ops_lead", "frontofficelead", or "front_office_lead"
   - Normalized by roles.js (normalizeRole):
       ops_lead, frontofficelead, front_office_lead -> "opslead"

2. Routing (src/App.jsx lines 579-590):
   - effectiveRole matches ["frontoffice", "opslead", "ops_lead", "frontofficelead"]
   - If effectiveDivision === "all":
       -> CrossDivDashboard (passes role to FrontOfficeDashboard / KidsFrontOfficeDashboard)
   - If effectiveDivision === "kindergarten":
       -> KidsFrontOfficeDashboard
   - Else (courses / null):
       -> FrontOfficeDashboard

3. Rendered Dashboard UI (src/features/dashboard/FrontOfficeDashboard.jsx):
   - Defines isLeader = ["opslead", "ops_lead", "frontofficelead", "manager", "admin"].includes(effectiveRole)
   - If isLeader: Appends "Approvals" tab running ApprovalInbox(userRole="ops_lead", branchId=myBranch)
   - ALSO renders: Cashier & Finance tab, Inquiries tab, Learners tab, Classes tab, Attendance tab, Reports tab

4. Backend Security & Cloudflare Worker (firestore.rules):
   - Line 67: isFrontOffice() = role in ['frontoffice', 'opslead', 'ops_lead', 'frontofficelead']
   - Line 151: isApproverForDoc() = targetRole in ['ops_lead', 'opslead', 'frontoffice'] && isFrontOffice()
   - RESULT: Zero distinction between cashier and Operational Leader in Firestore rules!
```

---

## C. Capability Matrix & Authority Model

| Capability / Action | Ops Lead Read | Ops Lead Write | Approval Role | Execution Role | Branch Scope | Division Scope | Governance Basis | Status |
|---|---|---|---|---|---|---|---|---|
| **Branch Operations Overview** | Yes | No | None | Ops Lead | Branch-local | Whole Branch | Blueprint §6.8 | **Established** |
| **Front Office Metrics & Performance** | Yes | No | None | Ops Lead | Branch-local | Whole Branch | Blueprint §6.8 | **Established** |
| **Cashier Drawer Operations (Daily Intake)** | Yes | No | None | Front Office Cashier | Branch-local | Division-local | Blueprint §6.9, G-009 | **Change (Read-only)** |
| **Cash Discrepancy (< Rp 20.000)** | Yes | Yes | **Primary Approver** | Ops Lead | Branch-local | Branch-wide | G-009 §2 | **Established** |
| **Cash Discrepancy (≥ Rp 20.000)** | Yes | No | Vice Director / Director | Execs | Branch-local | Branch-wide | G-009 §2 | **Established** |
| **Discounts, Fee Waivers, Refunds** | View | No | None (Execs only) | Execs | Branch-local | Branch-wide | G-009 §3 | **Established (No Authority)** |
| **Class Cancellation / Reschedule** | Yes | Yes | **Primary Approver** | Ops Lead / FO | Branch-local | Division-local | G-007, G-006 | **Established** |
| **Retroactive Student Attendance Edit** | Yes | Yes | **Primary Approver** | Ops Lead / FO | Branch-local | Division-local | G-007, G-006 | **Established** |
| **Student Class / Batch Transfer** | Yes | Yes | **Primary Approver** | Ops Lead / FO | Branch-local | Division-local | G-007, G-006 | **Established** |
| **Staff Shift Self-Correction Review** | Yes | Yes | **Lead Reviewer** (for FO/OB/Ins) | Ops Lead / Superior | Branch-local | Branch-wide | G-006, G-007 | **Established** |
| **Staff Status / Leave Requests** | Yes | Yes | **Domain Lead** (for FO & OB) | Ops Lead | Branch-local | Branch-wide | G-007 §4.5 | **Established** |
| **Office Boy / Facilities Maintenance** | Yes | Yes | None | Ops Lead coordinates | Branch-local | Whole Branch | Blueprint §6.8, §6.10 | **Established** |
| **Walk-in Inquiries & Intake Leads** | Yes | No | None | Front Office Staff | Branch-local | Both Divisions | Blueprint §6.9 | **Split (Oversight only)** |
| **Student Registration & Status Mutation** | Yes | No | Div Manager / Execs | Front Office Staff | Branch-local | Division-local | Blueprint §6.9 | **Block (Execution only)** |
| **Tuition Plan Alteration** | View | No | Div Manager | Div Manager | Branch-local | Division-local | G-009 §4 | **Established (No Authority)** |
| **Staff Role Elevation / Deactivation** | View | No | Director | Director | Province-wide | All | G-007 | **Established (No Authority)** |
| **Pedagogical Oversight & Teaching** | View | No | Instructor Leader | Instructor Leader | Branch-local | Both Divisions | Blueprint §6.4, §6.8 | **Established (No Authority)** |

---

## D. Front Office Separation Matrix (KEEP / CHANGE / SPLIT / BLOCK)

Every screen component currently rendered to the Ops Lead in `FrontOfficeDashboard.jsx` evaluated:

| Component / Tab | Classification | Decision | Evidence & Technical Reason |
|---|---|---|---|
| **Overview Tab (Attendance, Alerts, Openings)** | A. Ops Lead Appropriate | **CHANGE** | Reusable for operational health, but currently includes direct registration/kiosk buttons that belong to front-desk receptionists. Remove direct mutation buttons. |
| **Cashier & Finance Tab (`PaymentCashierTab`)** | B. Front Office Execution | **SPLIT** | Contains active cashier payment collection forms and WhatsApp receipt sender. Ops Lead should have **read-only reconciliation view** of drawer status and cash discrepancies (< 20k), but NOT daily cashiering. |
| **Inquiries Tab (`WalkInInquiryTab`)** | B. Front Office Execution | **SPLIT** | Ops Lead needs lead intake velocity and conversion bottlenecks, but does not input parent telephone intake forms. |
| **Learners Tab (`StudentRoster`)** | B. Front Office Execution | **CHANGE** | Make read-only. Remove `handleDelete`, `handleAddStudent`, and `handleEdit` actions. |
| **Classes Tab (`ClassManager` / `AvailableBatches`)** | A / B Hybrid | **CHANGE** | Ops Lead monitors room utilization, scheduling conflicts, and class transfers, but does not configure academic levels. |
| **Approvals Tab (`ApprovalInbox`)** | A. Ops Lead Appropriate | **KEEP** | Scoped to `userRole="ops_lead"` and `approverBranchId=myBranch`. Enforces Maker-Checker. |
| **Tasks Tab (`TasksPanel`)** | A. Ops Lead Appropriate | **CHANGE** | Needs separation into Front Desk tasks vs Facility/Maintenance tasks (Office Boy coordination per Blueprint §6.8). |
| **Reports Tab (`FrontOfficeReportsTab`)** | A. Ops Lead Appropriate | **KEEP** | Daily attendance and operational intake summaries. |
| **Events Tab (`CorporateEventsPanel`)** | A. Ops Lead Appropriate | **KEEP** | Branch-local site event coordination. |
| **Register Learner (`UserForm` modal)** | C. Restricted Execution | **BLOCK** | Receptionist desk function; not an operational leadership tool. |

---

## E. Audit Findings

### 1. [VULNERABILITY] Backend Rule Invariant Breach: Front Office Cashier Can Approve Ops Lead Tickets
- **Type:** Security Vulnerability / Backend Drift
- **Severity:** **HIGH**
- **Evidence:** `firestore.rules` lines 67, 151:
  ```javascript
  function isFrontOffice() {
    return signedIn() && userProfile().role in ['frontoffice', 'opslead', 'ops_lead', 'frontofficelead'];
  }
  function isApproverForDoc(data) {
    ...
    || ((targetRole == 'ops_lead' || targetRole == 'opslead' || targetRole == 'frontoffice') && isFrontOffice());
  }
  ```
- **Why it matters:** The frontend UI hides the "Approvals" tab from cashiers. However, **the UI is not a security boundary**. Any cashier sending a direct Firestore `updateDoc` call can approve a class cancellation, attendance edit, or cash discrepancy targeted at the Operational Leader.
- **Verification:** Verified by probe test (`src/features/shared/opsLeadApprovalProbe.test.js`): Peer cashier `fo_gtlo_peer` is evaluated as authorized to approve tickets targeted at `ops_lead`.
- **Recommended Direction:** Introduce a dedicated `isOpsLead()` helper in `firestore.rules`:
  ```javascript
  function isOpsLead() {
    let p = userProfile();
    return signedIn() && p != null && p.role in ['opslead', 'ops_lead'];
  }
  ```
  And decouple `ops_lead` targets from generic `frontoffice`.
- **Status:** **BLOCKED PENDING RULES DEPLOYMENT / OWNER ACKNOWLEDGEMENT**

---

### 2. [GOVERNANCE CONFLICT] Legacy Role Alias "Front Office Lead" (`frontofficelead`)
- **Type:** Governance Conflict
- **Severity:** **MEDIUM**
- **Evidence:** `roles.js` line 36: `frontofficelead: "opslead"`, `front_office_lead: "opslead"`.
- **Why it matters:** The Authoritative Blueprint (§6.8, §6.9) contains **no "Front Office Lead" role**. The Operational Leader is an organizational peer leader overseeing site logistics and facilities, not a senior receptionist. Aliasing "Front Office Lead" to `opslead` risks treating an ordinary senior front desk receptionist as an Operational Leader with dual-control approval authority.
- **Recommended Direction:** Keep as a legacy read-only migration alias for old accounts, but remove from new invite creation dropdowns (`InvitesPanel.jsx`). Log as Owner Decision OD-O1.

---

### 3. [GOVERNANCE GAP] Division Routing Mismatch for Operational Leader
- **Type:** Governance Gap
- **Severity:** **MEDIUM**
- **Evidence:** `src/App.jsx` lines 584-590:
  ```javascript
  {effectiveDivision === "all" ? (
    <CrossDivDashboard role={effectiveRole} />
  ) : effectiveDivision === "kindergarten" ? (
    <KidsFrontOfficeDashboard branch={branch} />
  ) : (
    <FrontOfficeDashboard role={effectiveRole} branch={branch} />
  )}
  ```
- **Why it matters:** Under Blueprint §6.8, the Operational Leader coordinates **branch-site operations** (logistics, facilities, and front desk). A physical branch houses both Course and Kindergarten divisions. Routing an Ops Lead into `KidsFrontOfficeDashboard` restricts their site visibility.
- **Recommended Direction:** Clarify that Operational Leader operates at **whole-branch scope** (`division: "all"` or cross-divisional site oversight), with read-only visibility into division intake. Log as Owner Decision OD-O2.

---

### 4. [DEFECT / DRIFT] Front Office Gate Evaluation in `approvalGates.js`
- **Type:** Technical Debt / Authorization Drift
- **Severity:** **MEDIUM**
- **Evidence:** `approvalGates.js` lines 806-811:
  ```javascript
  case APPROVAL_ROLES.OPS_LEAD:
  case "opslead":
  case "ops_lead":
    return (
      normalized === "frontoffice" ||
      normalized === "opslead"
    );
  ```
- **Why it matters:** In client-side gate checking, `canApproveGate("frontoffice", APPROVAL_ROLES.OPS_LEAD)` returns `true`. This was intended as a fallback in single-staff branches, but conflicts with G-006/G-007 dual-control invariants.
- **Recommended Direction:** Restrict `APPROVAL_ROLES.OPS_LEAD` approval check strictly to `normalized === "opslead"`.

---

## F. Branch Manager Reconciliation

Under Blueprint v3.1–v3.3 §0 and §5.5, the Branch Manager role is permanently eliminated. Inventory of potential Branch Manager resurrection via Ops Lead:
1. **Branch-Wide Operational Catch-All:** The Operational Leader must **never** be treated as a catch-all Branch Manager. Ops Lead coordinates site facilities, office boys, and front desk staff. They do NOT manage course curricula, kindergarten pedagogy, teacher contracts, or division financial strategies.
2. **`roles.js` Check:** `branch_manager` normalizes to `manager` (Division Manager), not `opslead`. (Clean).
3. **No Financial Escalation Usurpation:** Ops Lead only handles cash drawer discrepancy tickets under Rp 20.000. Anything higher escalates strictly to Vice Director / Director (G-009). Ops Lead cannot approve discounts, waivers, or refunds.

---

## G. Proposed Target Architecture: Operational Leader Dashboard

Instead of stuffing an "Approvals" tab into the cashier dashboard, Phase 1–3 will incrementally introduce a clean, dedicated workspace:

```text
src/features/dashboard/
├── OpsLeadDashboard.jsx               # Dedicated shell for Operational Leader
└── opslead/
    ├── OpsLeadOverview.jsx            # Site health, on-duty staff, facility alerts
    ├── BranchFacilitiesTab.jsx        # Facility maintenance & Office Boy task dispatch
    ├── FrontOfficePerformanceTab.jsx  # Desk response times, inquiry throughput, queue
    ├── ReconciliationInboxTab.jsx     # Tiered cash discrepancy (< 20k) & Dual-Control Approvals
    └── SiteLogisticsTab.jsx           # Room utilization, event logistics, safety checks
```

---

## H. "No Orphan" Check: Relocated Manager Capabilities

When the Course and Kindergarten Manager dashboards were refined to focus on strategy and intake, certain operational features were removed from their daily screens:
1. **Daily Cash Drawer Balances & Discrepancy Tracking:**
   - *Previous status:* Embedded in Manager overview.
   - *Current owner:* Front Office Cashiers balance the drawer; Operational Leader approves discrepancies under Rp 20.000 (G-009). Vice Director reviews larger variances.
2. **Whole-Class Cancellation / Reschedule Approvals:**
   - *Previous status:* Unclear in old UI.
   - *Current owner:* Operational Leader (`opslead`) per G-007.
3. **Retroactive Student Attendance Approvals:**
   - *Previous status:* Unclear in old UI.
   - *Current owner:* Operational Leader (`opslead`) per G-007.
4. **Facility Maintenance & Cleanliness:**
   - *Previous status:* Unmanaged in division manager views.
   - *Current owner:* Operational Leader coordinating Office Boy / Facilities per Blueprint §6.8, §6.10.
5. **WhatsApp Cash Drawer Summary Tool:**
   - *Current owner:* Retained in Course/Kindergarten intake for strategic drawer awareness; daily cashier shift reconciliation belongs to Front Desk / Ops Lead.

---

## I. Implementation Boundary (What Waits for Owner Review)

| Task | Allowed in Phase 0 | Blocked Until Owner Approval |
|---|---|---|
| Complete Phase 0 audit & probe tests | **YES (Completed)** | No |
| Create dedicated `OpsLeadDashboard.jsx` | No | **YES (Awaiting Phase 1 Plan)** |
| Modify `firestore.rules` to decouple `isOpsLead()` | No | **YES (Requires deployment approval)** |
| Change `approvalGates.js` role check | No | **YES (Requires Phase 1 execution)** |
| Re-route `opslead` in `App.jsx` | No | **YES (Awaiting OD-O2 decision)** |

---

## J. Evidence & Verification Summary

1. **Unit & Matrix Test Suite:**
   - Ran `npx vitest run src/features/shared/opsLeadApprovalProbe.test.js`: **PASSED (4 tests)**.
   - Ran `npm test`: **90 suites passed, 1,133 tests passed, 0 failures**.
2. **TypeScript & Static Analysis:**
   - `npm run typecheck`: **PASSED (0 errors)**.
3. **Evidence Labels Applied:**
   - Firestore Rule vulnerability: **Tested** (via `opsLeadApprovalProbe.test.js` & simulated rules engine).
   - Approval gates logic: **Tested** (via `approvalGates.test.js`).
   - UI component tree: **Read only** (inspected `FrontOfficeDashboard.jsx`, `CrossDivDashboard.jsx`, `App.jsx`).
