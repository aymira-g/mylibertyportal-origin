# Formal Owner Decision: Student Class Transfer Dual-Control Workflow and Satellite Branch Authority

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)  
> **Status:** RATIFIED & ACTIVE  
> **Ratified by:** Owner / Director (Kifry)  
> **Date:** 2026-10-13  
> **Blueprint Alignment:** Authoritative Blueprint v3.4 §4, §5, §6.8, §7, §18, §26 (amends G-006, G-007, G-012)

---

## 1. Context and Problem Statement

Under Authoritative Blueprint v3.4 (§26 G-006 & G-007), **Student Class / Batch Transfer** (`STUDENT_CLASS_TRANSFER`) is classified as a Domain Operations (Level 1) gated action with assigned approvers `opslead` (Operational Leader) and `frontoffice`.

In practice, two structural gaps required explicit Owner determination:
1. **Gate Mode Mismatch (Blocking vs. Logged):** In the existing UI, class transfers committed immediately in the database before submitting an approval envelope. This created un-rollbackable pending tickets if an approver later rejected the transfer.
2. **Lean Satellite Branch Gap (G-012):** Satellite branches (`bone_bolango`, `limboto`, `pohuwato`) do not have an Operational Leader. Because G-012 did not explicitly designate an authorized checker for student class transfers at satellite branches, tickets originating from satellite branches deadlocked in the approval queue.

On 2026-10-13, the Owner / Director (Kifry) reviewed the independent advisor's recommendations and formally ratified the binding policies below.

---

## 2. Binding Decisions Ratified by the Owner

### Decision 1: Two-Step Blocking Approval Workflow (Wait for Approval)
1. `STUDENT_CLASS_TRANSFER` is strictly enforced as a **Two-Step Blocking Gate** (`mode: APPROVAL_MODES.BLOCKING`).
2. **Maker Step (Front Office):**
   - Front Office initiates the transfer request in `TransferModal` or `EnrollModal`.
   - The student **remains enrolled in their source cohort** with unchanged timetable and attendance privileges until the transfer is formally approved.
   - An approval envelope is created in `/approvals` with `status: "pending"`.
3. **Checker Step (Authorized Leader):**
   - The authorized checker inspects the transfer request (source cohort, target cohort, seats available, reason).
   - **If Approved:** The class transfer transaction executes atomically in Firestore, unenrolling the student from the source cohort and enrolling them in the target cohort. The approval ticket is marked as applied.
   - **If Rejected:** The ticket is closed as rejected. The student remains in their source cohort with zero disruption.
4. **Zero-Budget Execution:** All transactions execute client-side via Firestore atomic transactions upon checker approval. No Cloud Functions or paid cloud infrastructure are introduced.

### Decision 2: Checker Authority and Satellite Branch Delegation (G-012 Amendment)
1. **Main Campus (`kota_gorontalo`):**
   - The **Operational Leader** (`opslead`) is the primary checker for student class transfers, conforming to G-007.
2. **Lean Satellite Branches (`bone_bolango`, `limboto`, `pohuwato`):**
   - The **Course Division Manager** (`manager` + `courses`) is officially authorized as the Checker for student class transfers, extending local operational supervision under G-012.
3. **Escalation & Maker Conflict (Maker $\ne$ Checker):**
   - If the local checker is unavailable, or if the transfer was initiated by the checker themselves, the ticket escalates directly to the **Vice Director** (`vice_director`).
   - Self-approval is strictly forbidden.

---

## 3. Implementation Contracts

### 3.1 Dual-Control Approval Registry (`src/features/shared/approvalGates.js`)
- `STUDENT_CLASS_TRANSFER`:
  - `mode: APPROVAL_MODES.BLOCKING`.
  - `eligibleApproverRoles: [APPROVAL_ROLES.OPS_LEAD, APPROVAL_ROLES.DIVISION_MANAGER, APPROVAL_ROLES.VICE_DIRECTOR, APPROVAL_ROLES.DIRECTOR]`.
  - Dynamic routing in `createApprovalEnvelope`: at lean satellite branches (`isLeanSatelliteBranch(approverBranchId)`), `approverRole` resolves to `APPROVAL_ROLES.DIVISION_MANAGER`. At Main Campus, `approverRole` resolves to `APPROVAL_ROLES.OPS_LEAD`.

### 3.2 Approval Inbox Execution (`src/features/shared/ApprovalInbox.jsx`)
- Upon checker approval, `ApprovalInbox.jsx` executes `transferStudentBetweenClasses` using payload parameters and invokes `markApprovalApplied`.
- Upon checker rejection, the ticket is marked rejected with no database mutation on `/classes`.

### 3.3 UI Integration (`TransferModal.jsx` & `EnrollModal.jsx`)
- Both modals submit `STUDENT_CLASS_TRANSFER` tickets via `submitApprovalRequest`.
- Descriptive toast feedback informs staff that the transfer will take effect once approved by the designated leader.
