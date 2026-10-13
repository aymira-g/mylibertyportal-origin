# Owner Decision Record: Student Promotions, Admissions Authority, Academic Placement, and Student Data Deletion

**Repo Path:** `docs/decisions/2026-10-13-student-promotions-admissions-and-academic-placement.md`  
**Date:** 2026-10-13  
**Status:** **RATIFIED AUTHORITATIVE DECISION — OWNER APPROVED (KIFRY)**  
**Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4, Ratified 2026-10-13)  
**Origin:** Domain 5 Deep Conformance Audit (`L2-DOM05-2026-10-13-V2`) and Independent Advisor Review.

---

## 1. Context & Background

During the Level 2 Deep Conformance Audit for Domain 5 (Students / Admissions / Profiles), an evaluation of student lifecycle workflows identified a critical deadlock (`DOM05-SEC-02` / F-1): academic promotions from student rosters are rejected by Firestore Security Rules because `currentLevel` was removed from the Front Office and Division Manager update whitelist during Phase 3 (F-11).

In addition, an independent review highlighted four critical design and governance questions regarding promotion jump limits, satellite admission authority, academic placement derivation during class intake, and System Admin student deletion rights.

This decision record establishes the binding policy on all four questions.

---

## 2. Ratified Owner Decisions

### Decision 1 (Q1): Academic Promotion Progression Limits
- **Policy:** **Sequential Single-Step Progression Only (`order + 1`).**
- **Ruling:** Legitimate roster-based promotions earned through an instructor's evaluation report advance the student to the **immediate next sequential level** (`order + 1` along the program curriculum ladder).
- **Multi-Level Jumps:** If an extraordinary student is recommended to skip two or more levels (or if an initial intake misplacement is being corrected), this is classified as an **Academic Placement Override**, NOT a standard promotion. Multi-level jumps remain strictly gated behind the `PLACEMENT_LEVEL_OVERRIDE` approval gate owned by the **Central Instructor Lead** (`instructor_leader`) per OD-FO-3 and Blueprint v3.4 §5.3.
- **Rule Enforcement:**
  1. Roster promotion writes (`promoteStudentLevel`) must execute as an atomic `writeBatch`:
     - Update `users/{studentId}` with `{ currentLevel: nextLevel, rating: stars, updatedAt: serverTimestamp(), promotedFromReport: reportId }`.
     - Update `progressReports/{reportId}` with `{ eligibleForPromotion: false, promotedAt: serverTimestamp() }`.
  2. In `firestore.rules`, Front Office and Division Managers are permitted to update `currentLevel` on `/users/{studentId}` IF AND ONLY IF:
     - `promotedFromReport` is provided as a string referencing an existing document in `/progressReports`.
     - The report document belongs to this student (`report.studentId == userId`).
     - The report is flagged as eligible (`report.eligibleForPromotion == true`).
     - The new level is the valid next sequential level (`isNextSequentialLevel(resource.data.currentLevel, request.resource.data.currentLevel)`).

### Decision 2 (Q2): Admissions Processing Authority at Satellite Branches
- **Policy:** **Front Office Only (Preserve Minimal Authority Baseline).**
- **Ruling:** At lean satellite campuses (`bone_bolango`, `limboto`, `pohuwato`), student admissions, application triage, and intake cashiering remain strictly the operational responsibility of the **Front Office** (`frontoffice`).
- **Rationale:** Under Blueprint v3.4 §5.5 and G-012, Course Division Managers hold operational oversight and supervisory checking authority (shift reviews, cash counts < Rp 20.000, site logistics). Expanding operational intake and write authority over student creation to Division Managers dilutes the Maker-Checker boundary and creates unnecessary write privileges across `/users`, `/applications`, and `/deskInquiries`.
- **Interim Coverage:** In the event of temporary front-desk staff absence, admissions are processed by designated front-desk cover accounts or executive delegation, not by granting general intake creation rights to managers.

### Decision 3 (Q3): Class Batch Assignment vs. Academic Placement
- **Policy:** **Class Enrollment is Batch Scheduling, NOT an Academic Placement.**
- **Ruling:** Selecting or changing a class batch during intake does **NOT** count as an academic placement and must **never** mutate or fabricate an assessed level.
- **Academic Placement Invariant (F-11 / OD-FO-3 Reaffirmed):**
  - An assessed level (`users.currentLevel`) is authoritative ONLY when backed by:
    1. A formal recorded placement test with a verified score (`latestPlacementScore >= 0`), OR
    2. An approved `PLACEMENT_LEVEL_OVERRIDE` ticket signed by the Central Instructor Lead, OR
    3. The kindergarten age/tier rubric (`tk_a`, `tk_b`, `playgroup`, `daycare`).
  - Applicants admitted without a diagnostic placement test must be recorded with `currentLevel: "unassessed"` (sentinel `UNASSESSED`), even if they are enrolled into a specific class cohort.
  - The Central Instructor Lead workspace will flag class/student level mismatches for diagnostic testing without blocking enrollment at the front desk.
- **Rule Enforcement:**
  - In `applicationsRepository.js` and `ApplicationPlacementModal.jsx`, remove default `"warrior"` fallbacks; unassessed intake defaults strictly to `UNASSESSED`.
  - In `firestore.rules` under `match /users/{userId}` `allow create:`, restrict Front Office student creations so that `currentLevel` must be `'unassessed'`, `''`, or match a valid kindergarten tier. Front desk cannot write an arbitrary level upon initial profile creation (closing finding F-6).

### Decision 4 (Q4): System Admin Student Profile Deletion
- **Policy:** **Hard Deletion of Student Profiles Prohibited from Client / Admin Code.**
- **Ruling:** Technical System Admin (`admin`) is **prohibited** from deleting student records (`role == 'student'`) at the database level.
- **Rationale:** Under Blueprint v3.4 §7, System Admin possesses technical maintenance authority only and has no power to destroy historical, financial, or academic records. Once a student document is created, it forms the anchor for payments, attendance marks, and academic history.
- **Student Lifecycle Exits:** Students leave active enrollment strictly through lifecycle status transitions (`inactive`, `graduated`) or the gated `STUDENT_WITHDRAWAL_OR_FREEZE` workflow.
- **Purging Erroneous / Blank Records:** If an accidental duplicate or blank student record with zero recorded history must be permanently deleted, it must be performed directly in the Firebase Console by the Owner / System Operator, ensuring 100% human-verified safety without leaving open client-side deletion backdoors.

---

## 3. Summary of Implementation Instructions for Executor

| Item | Finding Ref | Action Required | Affected Files |
|---|---|---|---|
| **Promotion Batch Write** | `DOM05-SEC-02` / F-1 | Combine student level update and progress report eligibility clearing into an atomic `writeBatch`. Write `promotedFromReport: reportId`. | `src/features/students/progressReportsRepository.js` |
| **Rules Promotion Clause** | `DOM05-SEC-02` / F-1 | Add report-bound promotion check in `firestore.rules` allowing `currentLevel` update when accompanied by valid eligible report and sequential level step. | `firestore.rules` (delegate to `firestore-rules-author`) |
| **Intake Level Lockdown** | F-6 | Restrict Front Office `/users` create rule to allow only `currentLevel in ['unassessed', '']` (or kindergarten tier). | `firestore.rules` (delegate to `firestore-rules-author`) |
| **Admin Student Delete Lock** | F-7 | In `firestore.rules` line 600, amend delete rule to: `allow delete: if isAdmin() && !(resource.data.role in ['director', 'vice_director', 'admin', 'student']);`. | `firestore.rules` (delegate to `firestore-rules-author`) |
| **Unassessed Intake Parity** | `DOM05-COR-02` / F-3 | Default unassessed applications to `UNASSESSED` instead of `"warrior"` in repository and intake placement modal. | `applicationsRepository.js`, `ApplicationPlacementModal.jsx` |
| **Mobile Roster Banner Guard** | `DOM05-UI-02` / F-5 | Update line 195 in `StudentRosterMobileList.jsx` to render promotion banner strictly when `canPromote` is true. | `StudentRosterMobileList.jsx` |
| **Promotion Queue Division Scope**| `DOM05-COR-03` / F-4 | Add optional `division` parameter to `fetchPendingPromotions` in `progressReportsRepository.js` with fallback support for un-divisioned legacy reports. | `progressReportsRepository.js` |
