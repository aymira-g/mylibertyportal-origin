# Formal Owner Decision: Class Batch Scheduling Workflow and Corporate Events Authority

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)  
> **Status:** RATIFIED & ACTIVE  
> **Ratified by:** Owner / Director (Kifry)  
> **Date:** 2026-10-13  
> **Blueprint Alignment:** Authoritative Blueprint v3.3 §6.4, §6.8, §7, §11, §25, §26  

---

## 1. Context and Problem Statement

During the Batch 1 (v2) Authentication, Permissions, and Branch Isolation independent re-verification audit, three governance and authority boundaries required explicit Owner determination:

1. **System Admin Operational Boundary (§7 & G-002):** Confirmation that technical System Admin holds zero business execution authority over classes, shifts, and attendance in the application UI, confining all emergency interventions to the Firebase Console or authorized offline scripts.
2. **Class Batch Scheduling Workflow (§25 Workflow Priority 5):** The Authoritative Blueprint lists Class Creation / Scheduling as a mandatory governance workflow requiring explicit actor definition following the removal of Branch Manager. In practice, establishing a class cohort touches Program/Division ownership (Division Manager), Teaching assignment (Instructor Leader), and Room/Logistics allocation (Operational Leader).
3. **Corporate Events Scope (§5.4 & Dual-Control):** Calendar events represent internal institutional schedules. The authority to create, modify, or delete province-wide/academy-wide events (`audienceType: 'all'`) versus branch-scoped events (`audienceType: 'branch'`) required clear boundary definition to prevent cross-branch interference.

---

## 2. Binding Decisions Ratified by the Owner

### Decision 1: System Admin Operational Exclusion (Re-Affirmed)
- Technical System Admin (`admin`) holds strictly technical maintenance authority (user accounts, authentication state, terminals, system health, and audit inspection).
- System Admin write access to `/classes`, `/shifts`, and class attendance is permanently stripped from `firestore.rules`.
- System Admin cannot schedule classes, clock staff in/out, or record attendance via the web portal.

### Decision 2: Class Batch Scheduling Workflow — Option B (Ops Lead Primary, Division Manager Fallback)
The Owner has formally adopted **Option B** for Class Batch Scheduling:
1. **Primary Authority — Operational Leader (`opslead`):**
   - At physical branches where an Operational Leader is actively assigned, the Operational Leader is the primary authority for scheduling and editing class batches, managing room allocations, and coordinating timetable logistics.
2. **Fallback Authority — Division Manager (`manager`):**
   - At branches or satellite campuses where **no Operational Leader is assigned** (or when the position is vacant), the relevant Division Manager (`courses` or `kindergarten`) automatically acts as the authorized fallback to create and schedule class batches for their division.
   - When an active Operational Leader is present at the branch, batch creation capabilities are hidden from the Division Manager in the UI to prevent uncoordinated room and timetable collisions.
3. **Executive Oversight — Director & Vice Director:**
   - Both Executive Leadership roles retain full cross-branch visibility and supervisory batch creation and editing capabilities across all branches.
4. **Front Office Desk Restriction:**
   - Front Office (`frontoffice`) remains strictly restricted to enrolling, transferring, and unenrolling students within already-scheduled cohorts. Front Office cannot create or delete class batches.

### Decision 3: Corporate Events Authority Boundaries
1. **Academy-Wide Events (`audienceType: 'all'`):**
   - Events affecting the entire institution (provincial holidays, joint workshops, academy closures) can **only be created, updated, or deleted by Executive Leadership** (`director`, `vice_director`).
   - Branch leadership cannot create, alter, or delete company-wide calendar records.
2. **Branch-Scoped Events (`audienceType: 'branch'`):**
   - Events local to a specific physical campus (site maintenance, branch meetings, local gatherings) are strictly isolated to that campus.
   - Branch leadership (Operational Leader, Division Manager, Front Office) of that specific branch have full authority to create, update, and delete events for their branch.
   - Staff from other branches have zero visibility and zero write access to other branches' events.

---

## 3. Implementation Contracts

### 3.1 Backend Security Rules (`firestore.rules`)
- `match /classes/{classId}`:
  - `allow create, update`: Permitted for `isDirector()`, `isViceDirector()`, and `(isOpsLead() || isManager())` scoped strictly to `isSameBranch()` and `isDivisionAllowedForManager()`.
  - `allow delete`: Restricted to `isDirector() || isViceDirector()`.
- `match /corporateEvents/{eventId}`:
  - `allow create`: Permitted for `isExecutive()` for all audience types; permitted for branch staff (`isManager()`, `isOpsLead()`, `isFrontOffice()`) **only when** `audienceType == 'branch'` and scoped to `userBranch()`.
  - `allow update`: Permitted for `isExecutive()` for all audience types; permitted for branch staff **only when** `audienceType == 'branch'` and scoped to `userBranch()`.
  - `allow delete`: Permitted for `isExecutive()` for all audience types; permitted for branch staff **only when** `audienceType == 'branch'` and scoped to `userBranch()`.

### 3.2 Frontend UI Integration
- In `ClassManager.jsx` and `AvailableBatches.jsx`, replace legacy `role === "admin"` with capability check:
  ```javascript
  const canManageBatches = isExecutive || (isOpsLead && isSameBranch) || (isManager && !hasBranchOpsLead && isSameBranch);
  ```
- In `OpsLeadDashboard.jsx`, expose batch creation and editing in the "Capacity & Batches" tab.
- In `ManagerDashboard.jsx` and `KidsManagerDashboard.jsx`, conditionally expose batch creation only if `!hasBranchOpsLead`.
