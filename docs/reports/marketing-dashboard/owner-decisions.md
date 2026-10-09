# Marketing Dashboard: Owner Decision Register (OD-MKT)

> **Document Type:** Binding Owner Decision Register for Marketing Dashboard Conformance  
> **Audited By:** Coding / Executor Agent  
> **Companion Documents:** [`00-phase0-audit.md`](./00-phase0-audit.md), [`01-phase1-completion-report.md`](./01-phase1-completion-report.md)  
> **Date:** 2026-10-09  
> **Governing Baseline:** Authoritative Blueprint v3.3 (Ratified 2026-10-07)  
> **Status:** RATIFIED & BINDING — APPROVED BY OWNER (KIFRY) ON 2026-10-09  

---

## Authority & Governance Context

In accordance with `AGENTS.md` and the Authoritative Governance Blueprint hierarchy:
- An implementation agent **must never invent organizational rules or authority**.
- Where a governance decision has already been formally made by the Owner / Director (Kifry), the software must **faithfully implement that decision**.
- Where an open governance question exists, it must be **explicitly presented to the owner** rather than resolved by technical guess.

All decisions below were reviewed and ratified by the Owner (Kifry) on **2026-10-09**.

---

### OD-MKT-1: Overview KPI Metrics & Inquiry Source of Truth
- **Question:** Should the Marketing Overview display pending walk-in leads from the center's guestbook (`deskInquiries`), pending online student applications from the website (`applications`), or both?
- **Ratified Decision:** **Option A (Separate & Accurate)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1 (`MarketingDashboard.jsx`). Overview renders two distinct cards: "Walk-In Inquiries" (`deskInquiries` with `status: "inquired"`, routing to Guestbook tab) and "Online Applications" (`applications` with `status: "pending"`, routing to Applications tab).
- **Owner Answer:** Option A

---

### OD-MKT-2: Marketing Role Division Scope (Blueprint §6.6 vs §6.7)
- **Question:** Is a Marketing Representative assigned to a specific division (Course Division Marketing vs Kindergarten Division Marketing), or do they always cover both programs across the branch?
- **Ratified Decision:** **Option A (Division-Bound with Cross-Divisional Option)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1 (`App.jsx`, `MarketingDashboard.jsx`, `WalkInInquiryTab.jsx`). User's profile `division` is passed to the dashboard. Profiles with `division: "all"` render a division toggle pill ("English Courses" / "Kindergarten") allowing switching between divisions.
- **Owner Answer:** Option A

---

### OD-MKT-3: Ownership of Legacy Branchless Records (`firestore.rules:128`)
- **Question:** Do historical database documents that lack both `branchId` and `branch` fields belong permanently to the main campus (Kota Gorontalo)?
- **Ratified Decision:** **Option A (Ratify Kota Gorontalo Legacy Ownership & Dry-Run First Backfill)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** Governed. Any production backfill requires dry-run report, reversibility, and explicit owner approval before execution.
- **Owner Answer:** Option A

---

### OD-MKT-4: System Admin Business Record Deletion Authority
- **Question:** Should the technical System Admin (`admin`) retain the ability to permanently delete business records (payments, attendance, walk-in leads, school visits, classes) directly in Firestore security rules?
- **Ratified Decision:** **Option A (Strict Blueprint Principle 13 Enforcement — Remove Direct Delete on Business Collections)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1 (`firestore.rules`). Removed `isAdmin()` from `allow delete` on `users` (:521), `classes` (:615), `attendance` (:682), `corporateEvents` (:719), `classAttendance` (:797), `payments` (:821), `shifts` (:960), `schoolOutreach` (:1023), `visits` (:1038, :1054). Admin retains technical deletion only on `invites` (:584), `errorLogs` (:1006), and kiosk collections.
- **Owner Answer:** Option A

---

### OD-MKT-5: Staff Invite Role Restriction & Privilege Escalation (G-002)
- **Question:** Should we restrict the staff invite creation rule so that only the Director can invite new Administrators or Directors?
- **Ratified Decision:** **Option A (Director-Only Executive / Admin Invites)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1 (`firestore.rules:587`). `invites` create requires `isDirector()` when `role in ['admin', 'director', 'vice_director']`. Other operational roles may be invited by authorized executives.
- **Owner Answer:** Option A

---

### OD-MKT-6: Surviving Branch Manager Approval Authority in Rules
- **Question:** Should the abolished `branch_manager` role be completely removed as an eligible approver from Firestore approval gates?
- **Ratified Decision:** **Option A (Remove Abolished Role from Approver Set)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1 (`firestore.rules`, `approvalGates.js`, `securityRulesMatrix.helpers.js`).
- **Owner Answer:** Option A

---

### OD-MKT-7: Inquiry Follow-Up Tracking (Enables Overdue Follow-Ups)
- **Question:** Should minimal follow-up tracking fields be added to `deskInquiries`?
- **Ratified Decision:** **Option A (Add nextFollowUpDate and lastContactedAt to deskInquiries)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** Governed for Phase 2 engine implementation; backwards compatible.
- **Owner Answer:** Option A

---

### OD-MKT-8: Operational Leader Admissions Authority & Deletion Boundary
- **Question:** Should Front Office / Ops Lead retain deletion rights over `applications` and `deskInquiries`?
- **Ratified Decision:** **Option A (Restrict deletion strictly to Executive Dual-Control: Director / Vice Director)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1 (`firestore.rules:594`, `:840`). `applications` and `deskInquiries` deletion is restricted strictly to `isViceDirector() || isDirector()`. Front Office and Admin deletion revoked.
- **Owner Answer:** Option A

---

### OD-MKT-9: Division Manager Class Management Authority
- **Question:** Contradiction where Division Manager cannot update/manage classes.
- **Ratified Decision:** Preserved as an open governance gap (§26 Owner Decision Register) to be ratified in a dedicated Blueprint §26 amendment prior to rules changes. Class reads and capacity calculations proceed; class write rules remain untouched in Phase 1.
- **Owner Answer:** Recorded as open gap.

---

### OD-MKT-10: Repo-Wide `branch_manager` Removal & Live Data Verification
- **Question:** Should `branch_manager` be removed completely across all repository surfaces, and what is the live database status?
- **Ratified Decision:** **Option B (Complete Repo-Wide Removal)**
- **Ratification Date:** 2026-10-09
- **Data Verification:** Live Firestore query completed by Owner on 2026-10-09: **0 documents** in `users` carry `role: "branch_manager"`. `manager.test@myliberty.id` verified to already be `role: "manager"`.
- **Implementation Status:** COMPLETED in Phase 1 across all 7 surfaces:
  1. `firestore.rules`: removed from `isManager()`, `isStaff()`, `gateAllowsApprover()`, `isApproverForDoc()`, `isApprovedShiftCorrection()`.
  2. `cloudflare-worker/worker.js:474`: removed from `LEGACY_ROLE_ALIASES`.
  3. `src/features/shared/roles.js:40`: removed from `LEGACY_ROLE_ALIASES` and JSDoc.
  4. `src/features/shared/approvalGates.js`: removed `APPROVAL_ROLES.BRANCH_MANAGER` and case switch.
  5. `src/features/shared/approvalsRepository.js`: removed from query constraints.
  6. `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js`: removed from all helpers and approver role maps.
  7. Tests updated to assert that `branch_manager` is rejected (`isManagerRole` is false, `isStaffRole` is false, gate decisions fail).
- **Owner Answer:** Option B (0 live records confirmed).

---

### OD-MKT-11: Production Parity & Rule Deployment Control
- **Question:** How should Firestore rules changes be verified and deployed?
- **Ratified Decision:** **Option A (Local Emulator Suite Verification; Zero Production Deploy without Human Authorization)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** COMPLETED in Phase 1. 110 emulator tests passing locally. No rules deployed to production without explicit human authorization.
- **Owner Answer:** Option A

---

### OD-MKT-12: Architecture Refactor Boundaries (`isExecutive()` decoupling)
- **Question:** Should repo-wide `isExecutive()` decoupling be attempted in Phase 1?
- **Ratified Decision:** **Option A (Explicitly Out of Scope for Phase 1)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** Preserved. Existing evaluation budget baseline captured and monitored.
- **Owner Answer:** Option A

---

### OD-MKT-13: Class Write Rules Boundary
- **Question:** Should class write rules be modified in Phase 1?
- **Ratified Decision:** **Option A (Explicitly Out of Scope for Phase 1)**
- **Ratification Date:** 2026-10-09
- **Implementation Status:** Class reads and capacity aggregation calculations corrected; class write rules left untouched pending §26 owner decision.
- **Owner Answer:** Option A
