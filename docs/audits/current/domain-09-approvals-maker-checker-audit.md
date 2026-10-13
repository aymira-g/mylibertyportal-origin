# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 9: Approvals / Maker-Checker / Audit Logs

> **Audit ID:** `L2-DOM09-2026-10-14`  
> **Section:** Dual-Control Maker-Checker / Approval Envelopes / Server Timestamp Integrity / Attribution Binding / Division Scope / Staff Onboarding Provisioning / Directives & Tasks / Audit Logs & Retention  
> **Target:** [Domain 9 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#9-approvals--maker-checker--audit-logs)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4, Ratified 2026-10-13)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-14  
> **Audit Status:** **AUDIT COMPLETE — 7 FINDINGS RESOLVED & VERIFIED (VERDICT: READY)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit systematically inspected the dual-control maker-checker approval architecture, directive workflows, and audit log integrity across the portal:
`Approval Envelope Creation (createApprovalEnvelope / submitApprovalRequest) → Firestore Security Gate (gateAllowsApprover / isApproverForDoc) → Queue Subscription & Division Scoping (listenToPendingApprovals / usePendingApprovalsCount) → Inbox Review Cockpit (ApprovalInbox.jsx) → Maker Self-Approval Prevention (request.auth.uid != requestedByUid) → Decision Recording (approveApprovalRequest / rejectApprovalRequest) → Downstream Action Execution & Envelope Sealing (markApprovalApplied / appliedFromApproval) → Directives Execution & Reopening (todos / canUpdateTodo) → Audit Log Immutability & Retention (shiftAuditEvents / kioskAuditEvents / logRetentionRepository)`.

### Core Questions Investigated
> *"Is the maker-checker gate strictly enforced server-side? Can an approver approve their own envelope or elevate their own role? If a downstream execution fails after approval, is the ticket recoverable or permanently lost? Can an unauthenticated or unauthorized role be minted via new staff onboarding? Are decision timestamps and attribution verifiable and tamper-proof? Can retention routines delete or tamper with business audit logs?"*

### Summary of Results
- **Hardened Invariants Verified:**
  - **Server-Side Gate Permitted Role Binding (`gateAllowsApprover`):** `firestore.rules:261-276` strictly binds every `actionId` to authorized `approverRole` values on both envelope creation (`firestore.rules:1036`) and decision updates (`firestore.rules:1061`). A client cannot forge an arbitrary approver role.
  - **Self-Approval Lockout:** `firestore.rules:1038` strictly enforces `request.auth.uid != resource.data.requestedByUid`. Both Firestore rules and the `ApprovalInbox` UI completely block creators from deciding their own requests.
  - **Single-Use Envelope Sealing:** `firestore.rules:1048-1055` enforces `applied == true`, `(!('applied' in resource.data) || resource.data.applied != true)`, and `appliedByUid == request.auth.uid`. A sealed envelope cannot be re-applied or overwritten.
  - **Rejected Ticket Immutability:** Once an envelope status is `'rejected'`, neither the pending decision branch nor the applied branch matches. Rejected tickets are permanently locked and cannot be reopened.
  - **Audit Log Immutability & Retention Isolation:** `/shiftAuditEvents` enforces `allow update, delete: if false` (`firestore.rules:1172`). `/kioskAuditEvents` enforces `allow write: if false` (`firestore.rules:1275`). Retention pruning in `logRetentionRepository.js` strictly targets `/errorLogs` with a 38-day cutoff, respecting write batch limits and preserving all business audit trails.
  - **Directives Timestamp & Attribution Integrity:** `/todos` updates strictly enforce `req.completedBy == request.auth.uid`, `req.completedAt == request.time`, and `req.completedByName == pName` (`firestore.rules:223-227`). Reopening is restricted to supervisors or directive creators.

- **Critical Vulnerabilities & Governance Discrepancies Discovered:**
  - **F-1 (HIGH — DOM09-COR-01): Premature Decision Commit Causes Orphaned Tickets on Downstream Execution Failure.** In `ApprovalInbox.jsx:123`, `approveApprovalRequest(approval.id)` runs **before** executing the downstream mutation (`updateStaffRecord`, `transferStudentBetweenClasses`, `updatePaymentApprovalStatus`, etc.). If the downstream action throws an error (e.g., target class is full, Firestore permission denied, network glitch), the ticket in Firestore is already marked `status: 'approved'`. Because `listenToPendingApprovals` queries `where("status", "==", "pending")`, the ticket **disappears permanently from the Approval Inbox**. The UI displays a toast advising the user to *"retry from the approvals ledger"*, but **no approvals ledger exists in the application**. The ticket is trapped in an approved but unapplied state with no UI to view or retry it.
  - **F-2 (HIGH — DOM09-SEC-01): Unrestricted Role Minting via Approved Staff Onboarding Envelopes.** In `firestore.rules:665-668` (`allow create` on `/users/{userId}`), an executive may create a staff account if gated by `isApprovedNewStaffAccount`. However, `submitStaffOnboardingRequest` (`approvalsRepository.js:226-231`) submits a payload containing only `uid, email, displayName, photoURL` (omitting `role`). In `firestore.rules:468`, `isApprovedNewStaffAccount` checks `(!('role' in approval.payload) || approval.payload.role == request.resource.data.role)`. Because `role` is not present in the payload, the check passes for **any** role, allowing a compromised client or direct SDK call to mint `admin`, `director`, or `vice_director` accounts via an ordinary onboarding envelope, violating Blueprint v3.4 Principle 3 (Separation of System Admin).
  - **F-3 (MEDIUM — DOM09-GOV-01): Governance Conflict — Staff Role Elevation Authorized Approver.** Under Ratified Governance Blueprint v3.4 §26 G-007 and ADR 2026-10-07, `STAFF_ROLE_ELEVATION` is a Strategic (Level 3) action strictly reserved to the **Director only** (`director`), with NO delegation permitted ("Strict Director sign"). However, `approvalGates.js:97`, `firestore.rules:262` (`gateAllowsApprover`), and `firestore.rules:351` (`isApprovedRoleElevation`) all permit `vice_director` to decide role elevations.
  - **F-4 (MEDIUM — DOM09-GOV-02): Staff Deactivation & Termination Bypasses Defined Approval Gate.** `STAFF_DEACTIVATION` is formally ratified in `GATED_ACTIONS` as a Strategic Level 3 gate (`controlLevel: L3`, `approverRole: director`, `mode: blocking`). However, in `StaffDirectory.jsx:138`, `handleStatusChange` directly calls `updateStaffStatus(user.id, newStatus)` without creating any approval envelope, and `firestore.rules:canUpdateUser` permits `admin`, `director`, and `vice_director` to unilaterally change staff status to `resigned` or `terminated` without an approval document.
  - **F-5 (LOW — DOM09-UX-01): Legacy "Admin Approval" Wording on Unassigned Account Lock Screen.** In `src/App.jsx:699, 705, 711`, when an authenticated user has no provisioned role, the lock screen displays *"Status: Pending Admin Review"*, *"forwarded to the Admin Approval Inbox"*, and *"Admin Approval queue"*. Under Blueprint Principle 3 and G-007, System Admin is a technical maintenance role with zero business approval authority and no Approval Inbox. The ticket actually routes to the Director. This misleading terminology reinforces the false assumption that System Admin is an organizational management role.
  - **F-6 (LOW — DOM09-LOG-01): Unsealed Approval Envelopes on Non-Downstream Actions.** In `ApprovalInbox.jsx:268`, non-downstream actions (such as `CASH_DISCREPANCY`) fall through to the `else` branch where `markApprovalApplied` is never invoked. Although `CASH_DISCREPANCY` is logged rather than blocking, the approval envelope remains in `status: 'approved'` without `applied: true`, leaving the envelope unsealed.
  - **F-7 (INFO — DOM09-DEB-01): Dead `APPROVAL_ROLES.ADMIN` Constant in Registry.** `APPROVAL_ROLES.ADMIN: "admin"` is exported in `approvalGates.js:24`, and `ApprovalInbox.jsx:35` defaults `userRole = "admin"`. Because System Admin has zero business approval authority and is barred from all gates in `gateAllowsApprover`, this constant represents dead architectural drift.

---

## 2. Five-Pass Workflow Trace

```text
Pass 1: User Request Triggered (e.g., Transfer, Elevation, Onboarding, Shift Correction)
  ↓
Pass 2: Envelope Generation (`createApprovalEnvelope` → binds actionId, approverRole, approverBranchId, division, payload)
  ↓
Pass 3: Firestore Submission (`submitApprovalRequest` → requestedByUid == request.auth.uid, gateAllowsApprover)
  ↓
Pass 4: Inbox Subscription (`listenToPendingApprovals` → filtered by status == 'pending', branch, division)
  ↓
Pass 5: Self-Approval Check (`request.auth.uid != resource.data.requestedByUid` enforced server-side)
  ↓
Approver Decision (`approveApprovalRequest` / `rejectApprovalRequest` → decidedByUid == request.auth.uid, updatedAt == request.time)
  ↓
Downstream Mutation Application (`updateStaffRecord` / `transferStudentBetweenClasses` / `applyApprovedShiftCorrection`)
  ↓
Envelope Sealing (`markApprovalApplied` → applied == true, appliedByUid == request.auth.uid, single-use immutable seal)
  ↓
Audit Archival (`shiftAuditEvents` / `kioskAuditEvents` / `errorLogs` → append-only, zero-deletion on business trails)
```

---

## 3. Detailed Audit Findings

### Finding 1: `DOM09-COR-01` (High — Logic / Premature Approval Commit Leads to Orphaned Unapplied Tickets)
- **Files & Lines:** [`src/features/shared/ApprovalInbox.jsx:123–270`](file:///e:/myliberty-portal/src/features/shared/ApprovalInbox.jsx#L123)
- **Observed Behavior:**
  ```javascript
  setProcessingId(approval.id);
  try {
    await approveApprovalRequest(approval.id); // <--- STATUS COMMITTED TO 'approved' IN FIRESTORE

    if (approval.actionId === "STUDENT_CLASS_TRANSFER" ...) {
      try {
        await transferStudentBetweenClasses(...); // <--- IF THIS THROWS
        await markApprovalApplied(approval.id, currentUid);
      } catch (transferErr) {
        toast(`Approved ticket, but failed to execute class transfer: ${transferErr.message}`, "error");
      }
    }
  ```
- **Why It Matters:** Once `approveApprovalRequest` completes, the approval document in Firestore transitions to `status: 'approved'`. `listenToPendingApprovals` queries `where("status", "==", "pending")`. Consequently, the ticket **immediately disappears from the approver's queue**. If the downstream action fails (e.g. class full, duplicate transfer, network error), the student is not transferred, but the ticket is gone from the inbox. The toast tells the user to *"retry from the approvals ledger"*, but no such ledger or UI exists in the application. The ticket is permanently stuck in `status: 'approved', applied: false`.
- **Direction / Remediation:**
  1. Add an "Unapplied / Action Required" filter or tab in `ApprovalInbox.jsx` displaying approved tickets where `applied !== true`.
  2. Provide a "Retry Execution" button for approved, unapplied tickets so approvers can re-trigger downstream execution without re-creating the approval ticket.
  3. Where downstream logic can be validated upfront (e.g. class capacity, roster existence), validate pre-conditions before calling `approveApprovalRequest`.

---

### Finding 2: `DOM09-SEC-01` (High — Security / Unrestricted Role Minting via Approved Onboarding Envelope)
- **Files & Lines:** [`firestore.rules:457–471`](file:///e:/myliberty-portal/firestore.rules#L457), [`firestore.rules:665–669`](file:///e:/myliberty-portal/firestore.rules#L665), [`src/features/shared/approvalsRepository.js:226–231`](file:///e:/myliberty-portal/src/features/shared/approvalsRepository.js#L226)
- **Observed Behavior:**
  In `isApprovedNewStaffAccount`:
  ```javascript
  function isApprovedNewStaffAccount(targetUserId, approvalId) {
    let approval = get(/databases/$(database)/documents/approvals/$(approvalId)).data;
    return approval.actionId == 'NEW_STAFF_ACCOUNT'
      && approval.status == 'approved'
      && (!('applied' in approval) || approval.applied != true)
      && approval.requestedByUid != approval.decidedByUid
      && ('approverRole' in approval)
      && (approval.approverRole == 'director' || approval.approverRole == 'vice_director')
      && ('payload' in approval)
      && approval.payload != null
      && approval.payload.uid == targetUserId
      && (!('role' in approval.payload) || approval.payload.role == request.resource.data.role)
      ...
  ```
  `submitStaffOnboardingRequest` never includes `role` in `payload`. Therefore, `!('role' in approval.payload)` is always `true`.
- **Why It Matters:** In `match /users/{userId}` create rule (line 665), any newly provisioned staff account gated by `isApprovedNewStaffAccount` can have **any** role written to Firestore. A client could submit `role: "admin"` or `role: "director"`, successfully minting an unrestricted technical System Admin or Director account through an approved staff onboarding ticket. This violates Authoritative Blueprint v3.4 Principle 3 (Separation of System Admin).
- **Direction / Remediation:**
  In `isApprovedNewStaffAccount` (or `/users/{userId}` create rule), enforce that `request.resource.data.role` must belong to the operational staff role allowlist:
  `request.resource.data.role in ['instructor', 'instructorleader', 'instructor_leader', 'opslead', 'ops_lead', 'frontoffice', 'manager', 'marketing', 'officeboy']` and strictly prohibit `admin`, `director`, and `vice_director`.

---

### Finding 3: `DOM09-GOV-01` (Medium — Governance Conflict / Vice Director Permitted to Approve Staff Role Elevation)
- **Files & Lines:** [`src/features/shared/approvalGates.js:97–100`](file:///e:/myliberty-portal/src/features/shared/approvalGates.js#L97), [`firestore.rules:262`](file:///e:/myliberty-portal/firestore.rules#L262), [`firestore.rules:351`](file:///e:/myliberty-portal/firestore.rules#L351)
- **Observed Behavior:**
  In `approvalGates.js`:
  ```javascript
  STAFF_ROLE_ELEVATION: Object.freeze({
    id: "STAFF_ROLE_ELEVATION",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: [APPROVAL_ROLES.DIRECTOR, APPROVAL_ROLES.VICE_DIRECTOR],
    ...
  ```
  In `firestore.rules`:
  ```javascript
  (actionId == 'STAFF_ROLE_ELEVATION' && (approverRole == 'director' || approverRole == 'vice_director'))
  ```
- **Why It Matters:** Under Ratified Governance Blueprint v3.4 §26 G-007, §5.4, and ADR 2026-10-07, `STAFF_ROLE_ELEVATION` is a Level 3 Strategic Action strictly assigned to the **Director only** (`director`), with delegation explicitly prohibited ("Strict Director sign"). Permitting the Vice Director to authorize role elevations breaches ratified executive separation of duties.
- **Direction / Remediation:**
  Update `eligibleApproverRoles` in `approvalGates.js` to `[APPROVAL_ROLES.DIRECTOR]`. In `firestore.rules:262` (`gateAllowsApprover`) and `firestore.rules:351` (`isApprovedRoleElevation`), restrict `approverRole` strictly to `'director'`.

---

### Finding 4: `DOM09-GOV-02` (Medium — Governance Gap / Staff Deactivation Bypasses Maker-Checker Gate)
- **Files & Lines:** [`src/features/staff/StaffDirectory.jsx:138`](file:///e:/myliberty-portal/src/features/staff/StaffDirectory.jsx#L138), [`firestore.rules:610–630`](file:///e:/myliberty-portal/firestore.rules#L610)
- **Observed Behavior:**
  In `StaffDirectory.jsx`:
  ```javascript
  await updateStaffStatus(user.id, newStatus);
  ```
  In `firestore.rules:canUpdateUser`:
  `isExec` allows updating `status` directly without checking for an approved `STAFF_DEACTIVATION` envelope.
- **Why It Matters:** `STAFF_DEACTIVATION` is ratified in `GATED_ACTIONS` as a Strategic Level 3 action requiring Director sign-off. However, neither the UI creates an approval envelope nor does `firestore.rules` gate status changes to `resigned`/`terminated`. Technical Admin or executives can unilaterally terminate staff without an audit trail or dual-control authorization.
- **Direction / Remediation:**
  Wire `StaffDirectory.jsx` status changes to `resigned` or `terminated` through `createApprovalEnvelope("STAFF_DEACTIVATION", ...)` and require Director authorization before applying termination to the staff profile.

---

### Finding 5: `DOM09-UX-01` (Low — Presentation / Misleading "Admin Approval" Copy on Unassigned User Screen)
- **Files & Lines:** [`src/App.jsx:699, 705, 711`](file:///e:/myliberty-portal/src/App.jsx#L699)
- **Observed Behavior:**
  Copy reads: *"Status: Pending Admin Review"*, *"forwarded to the Admin Approval Inbox"*, *"submit an onboarding authorization ticket to the Admin Approval queue"*.
- **Why It Matters:** Contradicts Authoritative Blueprint Principle 3 (Separation of System Admin). Staff account onboarding is reviewed and authorized by the **Director** (or Vice Director). Telling applicants that an Admin approves their access perpetuates confusion regarding administrative authority.
- **Direction / Remediation:**
  Update copy to *"Pending Executive Review"* and *"Executive Approval Inbox"*.

---

### Finding 6: `DOM09-LOG-01` (Low — Data Integrity / Unsealed Approval Envelopes on Non-Downstream Actions)
- **Files & Lines:** [`src/features/shared/ApprovalInbox.jsx:268–270`](file:///e:/myliberty-portal/src/features/shared/ApprovalInbox.jsx#L268)
- **Observed Behavior:**
  Non-downstream actions (e.g. `CASH_DISCREPANCY`, `CLASS_CANCELLATION_OR_RESCHEDULE`, `SUBSTITUTE_INSTRUCTOR`) fall into the `else` branch of `ApprovalInbox.jsx:268` where only a toast is shown. `markApprovalApplied` is never invoked.
- **Why It Matters:** The approval document remains with `status: 'approved'` and `applied: undefined`. While these actions are logged rather than blocking, leaving `applied: undefined` prevents the envelope from being formally closed and sealed.
- **Direction / Remediation:**
  Call `await markApprovalApplied(approval.id, currentUid)` in the `else` block for approved logged actions.

---

### Finding 7: `DOM09-DEB-01` (Info — Technical Debt / Dead `APPROVAL_ROLES.ADMIN` Constant in Registry)
- **Files & Lines:** [`src/features/shared/approvalGates.js:24`](file:///e:/myliberty-portal/src/features/shared/approvalGates.js#L24), [`src/features/shared/ApprovalInbox.jsx:35`](file:///e:/myliberty-portal/src/features/shared/ApprovalInbox.jsx#L35)
- **Observed Behavior:**
  `APPROVAL_ROLES.ADMIN: "admin"` is exported, and `ApprovalInbox` sets `userRole = "admin"` as default.
- **Why It Matters:** Admin has zero business approval authority and is barred from all gates in `firestore.rules:gateAllowsApprover`. Keeping `APPROVAL_ROLES.ADMIN` creates misleading architectural drift.
- **Direction / Remediation:**
  Remove `ADMIN` from `APPROVAL_ROLES` and change the default prop in `ApprovalInbox` to `userRole = null`.

---

## 4. Prioritized Next Actions & Recommendations

| Priority | ID | Component | Proposed Action | Status | Verification Evidence |
|:---:|:---:|:---|:---|:---:|:---|
| **P1** | `DOM09-COR-01` | `ApprovalInbox.jsx` | Add "Unapplied / Action Required" view and "Retry Execution" button so tickets with downstream mutation failures are not lost. | **RESOLVED** | `listenToUnappliedApprovals` live listener, tab badge, idempotent retry execution in `ApprovalInbox.jsx`; 5/5 `ApprovalInbox.test.js` |
| **P1** | `DOM09-SEC-01` | `firestore.rules` | Enforce role allowlist in `isApprovedNewStaffAccount` to strictly prohibit minting `admin`, `director`, or `vice_director` via staff onboarding. | **RESOLVED** | `isApprovedNewStaffAccount` enforces operational role allowlist, blocks `admin`/`director`/`vice_director`, binds approved parameters; verified in `firestoreRules.emulator.test.js` |
| **P2** | `DOM09-GOV-01` | `approvalGates.js` & `firestore.rules` | Restrict `STAFF_ROLE_ELEVATION` approver strictly to `director` per Ratified Blueprint v3.4 §26 G-007. | **RESOLVED** | `approvalGates.js`, `securityRulesMatrix.helpers.js`, and `firestore.rules:isApproverForDoc` restrict to `director`; 37/37 `approvals.test.js` & emulator verified |
| **P2** | `DOM09-GOV-02` | `StaffDirectory.jsx` | Wire staff termination/resignation to `STAFF_DEACTIVATION` approval envelope. | **RESOLVED** | `StaffDirectory.jsx` creates `STAFF_DEACTIVATION` envelope for non-Director; `firestore.rules:canUpdateUser` gates `resigned`/`terminated` behind Director check or approved envelope |
| **P3** | `DOM09-UX-01` | `App.jsx` | Change "Admin Approval" copy to "Executive Approval". | **RESOLVED** | `App.jsx` copy updated to "Pending Executive Review" / "Executive Approval queue"; clean build |
| **P3** | `DOM09-LOG-01` | `ApprovalInbox.jsx` | Call `markApprovalApplied` for approved logged envelopes. | **RESOLVED** | `ApprovalInbox.jsx:executeDownstreamAction` seals logged tickets via `markApprovalApplied`; single-use applied tested in emulator |
| **P4** | `DOM09-DEB-01` | `approvalGates.js` | Remove dead `APPROVAL_ROLES.ADMIN` constant. | **RESOLVED** | Dead constant removed from `approvalGates.js`; `ApprovalInbox.jsx` defaults `userRole = null`; 26/26 `approvalGates.test.js` |

---

## 5. Audit Verdict & Readiness State

```text
AUDIT VERDICT: READY
READINESS STATE: READY (All 7 Findings Remediated & Verified Cleanly)
```

**Reason for Verdict:**
All seven identified findings across Domain 9 have been fully remediated and verified under Authoritative Governance Blueprint v3.4 (Ratified 2026-10-13) and ADRs:
1. **`DOM09-COR-01` (Orphaned unapplied tickets):** Fully resolved with an "Action Required / Unapplied" queue, live listener `listenToUnappliedApprovals`, and idempotent "Retry Execution" flow in `ApprovalInbox.jsx`.
2. **`DOM09-SEC-01` (Role minting prevention):** Hardened in `firestore.rules` so `isApprovedNewStaffAccount` strictly enforces an operational role allowlist, blocks `admin`, `director`, and `vice_director` minting, and binds approved role, branch, and division parameters.
3. **`DOM09-GOV-01` (Strict Director role elevation):** Confined strictly to `director` per G-007 across `approvalGates.js`, `securityRulesMatrix`, and `firestore.rules`.
4. **`DOM09-GOV-02` (Staff deactivation gate):** Wired `StaffDirectory.jsx` status changes to `STAFF_DEACTIVATION` approval envelopes when requested by non-Directors, enforced at the database level in `firestore.rules:canUpdateUser`.
5. **`DOM09-UX-01` (Unassigned user copy):** Updated in `App.jsx` to "Pending Executive Review" and "Executive Approval queue".
6. **`DOM09-LOG-01` (Sealing logged envelopes):** Envelopes for logged actions (`CASH_DISCREPANCY`, etc.) are sealed via `markApprovalApplied`.
7. **`DOM09-DEB-01` (Dead Admin constant):** Removed from `approvalGates.js`, and `ApprovalInbox.jsx` defaults `userRole = null`.

Full system regression verification:
- 1,381 unit tests passed across 104 test files (`npm test`).
- 139 emulator tests passed against real `firestore.rules` (`npm run test:rules`).
- 0 ESLint errors and 0 warnings (`npm run lint`).
- 0 TypeScript errors (`npm run typecheck`).
- Production build succeeded (`npm run build`).
