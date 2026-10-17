# Formal Owner Decision: Operational Leader Read-Only Access to Progress Reports at Main Campus

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)
> **Status:** RATIFIED & ACTIVE
> **Ratified by:** Owner / Director (Kifry)
> **Date:** 2026-10-17
> **Ratification Basis:** Explicit owner decision statement in project conversation transcript on 2026-10-17
> **Blueprint Alignment:** Amends Authoritative Blueprint v3.4 §6.8, reaffirms §6.11, adds §26 G-013, and updates §41 Owner Approval Record

---

## 1. Context and Problem Statement

Under Authoritative Blueprint v3.4:
- The **Operational Leader** coordinates branch-site logistics, facility maintenance, Front Office performance, and class cohort scheduling at the Main Campus (`kota_gorontalo`) (§6.8).
- The **Instructor Leader** holds province-wide pedagogical and academic governance across all branches (§6.11, G-012).
- Section 6.8 explicitly notes that the Operational Leader does not automatically acquire authority over the Course Division, Kindergarten Division, or Teaching and Learning Structure.

During the Front Office security hardening and division isolation review (OD-FO-02 / `FP-FO-13`), pure Front Office staff (`isFrontDeskStaff()`) was separated from Operational Leader roles in `firestore.rules`. Because pedagogical oversight for Operational Leaders remained an open governance gap, access to `/progressReports` was closed for Ops Leads pending an explicit owner decision.

The Owner / Director (Kifry) has formally reviewed this governance gap and approved a narrow, explicit exception granting read-only progress report access to the Operational Leader strictly for operational oversight at the Main Campus.

---

## 2. Binding Decision & Owner Confirmation

> **Binding Owner Decision:**
> *"I approve read-only access for the Operational Leader to student progress reports for operational oversight at the Main Campus. This is an explicit exception to the current Blueprint boundary; record it as an owner-approved decision based on this conversation."*
> — Owner / Director (Kifry), 2026-10-17

> **Owner Confirmation (Approved Summary):**
> Owner / Director (Kifry) explicitly approved Main Campus Operational Leaders reading the complete `/progressReports` document, including student scores and teacher comments, for operational oversight.
> — Confirmed 2026-10-17

### 2.1 Scope of Authorized Access

1. **Read-Only Visibility Only (`get` and `list`):**
   - The Operational Leader is authorized to inspect individual progress report documents (`allow get`) and execute list queries (`allow list`) on `/progressReports`.
   - This access supports branch-site operational coordination, facility logistics, student throughput tracking, and operational awareness across the campus.

2. **Strict Main Campus Physical Scope (Both User and Document at `kota_gorontalo`):**
   - Access strictly requires **both** the signed-in user and the progress report document to belong to the Main Campus: `userBranch() == "kota_gorontalo"` AND `resource.data.branchId == "kota_gorontalo"`.
   - A generic `isSameBranch(...)` check alone is insufficient because it does not bind authority specifically to the Main Campus.
   - The Operational Leader holds **zero access through the Operational Leader role path** to progress reports at satellite branches (`bone_bolango`, `limboto`, `pohuwato`), and any operational leader role outside the Main Campus holds zero progress report access through that role path (independent access paths for authored reports as instructor or linked children as parent remain preserved).

3. **Explicit Division Scope (Courses and Kindergarten Only; Legacy Unstamped Excluded):**
   - Read visibility is strictly restricted to progress reports explicitly stamped with `division: "courses"` or `division: "kindergarten"` (`resource.data.division in ['courses', 'kindergarten']`).
   - Progress reports lacking an explicit `division` field (legacy unstamped records) are **strictly excluded and denied** from Operational Leader access. The approved Courses-and-Kindergarten operational scope does not authorize access to unclassified historical reports.

---

## 3. Strict Authority Boundaries & Governance Safeguards

### 3.1 Absolute Prohibition on Mutations and Academic Authority
The Operational Leader is **strictly denied** all write, mutation, and academic governance powers:
- **No Create / Mutation:** Zero authority to create, update, or delete progress reports (`allow create: false`, `allow update: false`, `allow delete: false` for the Ops Lead role path).
- **No Advancement Authority:** Zero authority to execute student level advancements or clear promotion eligibility. (Student level advancement remains strictly bounded to instructor recommendation and Front Office / Division Manager atomic consolidation workflows under OD-FO-02).
- **No Grading / Academic Authority:** Zero authority to assign grades, modify evaluation scores, alter syllabus assessments, or append instructor remarks.
- **No Academic Approval Authority:** Zero authority to grant academic placement test overrides (`PLACEMENT_LEVEL_OVERRIDE`) or approve substitute instructors (`SUBSTITUTE_INSTRUCTOR`).

### 3.2 Preservation of Central Academic Lead Authority
The Instructor Leader's role and authority under Blueprint v3.4 §6.11 and G-012 remain completely unaffected:
- The **Instructor Leader** remains the sole pedagogical authority across Gorontalo Province with multi-branch academic coordination scope.
- Operational Leader visibility into progress reports is operational and informational only; it does not constitute academic supervision over teaching faculty.

### 3.3 Independent Instructor & Parent Access Paths Preserved
The denial of mutation authority through the branch-staff role path does not restrict independent personal access paths:
- If a staff member holding an Ops Lead profile authors a progress report as instructor of record, access to that authored document is governed by the independent `instructorId == request.auth.uid` rule path.
- If a staff member is a parent of an enrolled learner, access to the child's records is governed by the independent `isParentOf(studentId)` rule path.

---

## 4. Technical Architecture & Data Exposure Limitation

> [!WARNING]
> **Owner Confirmation (Approved Summary):**
> Under Google Cloud Firestore Security Rules architecture, read permissions evaluate at the entire document level without field-level masking. Granting `allow get` and `allow list` access to `/progressReports` necessarily exposes the entire document content—including student criteria scores (pronunciation, fluency, vocabulary, comprehension), overall score, level recommendation, and instructor evaluation comments / teacher remarks—to the Operational Leader.
>
> Owner / Director (Kifry) explicitly reviewed this architectural behavior and confirmed approval for Main Campus Operational Leaders reading the complete `/progressReports` document, including student scores and teacher comments, for operational oversight (confirmed 2026-10-17).

---

## 5. Implementation Roadmap (For Future Implementation Task)

This governance decision authorizes, but does not itself execute, the following technical changes to be implemented in a subsequent, scoped implementation task:

1. **`firestore.rules`:**
   - In `match /progressReports/{reportId}`:
     - Under `allow get`: Add helper condition requiring Ops Lead at `kota_gorontalo`, document at `kota_gorontalo`, and explicit matching division:
       ```firestore
       (isOpsLead() && userBranch() == 'kota_gorontalo' && resource.data.branchId == 'kota_gorontalo' && ('division' in resource.data) && (resource.data.division in ['courses', 'kindergarten']))
       ```
     - Under `allow list`: Permit list queries for Ops Lead strictly scoped to `kota_gorontalo` and an explicit division:
       ```firestore
       (isOpsLead() && userBranch() == 'kota_gorontalo' && resource.data.branchId == 'kota_gorontalo' && ('division' in resource.data) && (resource.data.division in ['courses', 'kindergarten']))
       ```
     - Deny access to unstamped legacy reports lacking `division` for Ops Lead.
     - Under `allow update` and `allow delete`: Retain strict denial for the Ops Lead role path (`isOpsLead()` remains false).
2. **Security Rules Matrix & Emulators:**
   - Update `securityRulesMatrix.helpers.js` (`canGetProgressReport`, `canListProgressReports`) to reflect that Ops Lead requires `user.branchId === 'kota_gorontalo'`, `doc.branchId === 'kota_gorontalo'`, and `doc.division in ['courses', 'kindergarten']`. Assert `false` for unstamped reports (`!('division' in doc)`).
   - Add unit tests in `src/features/shared/securityRulesMatrix/` verifying:
     - `canGetProgressReport: true` for `opsGto` on Main Campus `courses` and `kindergarten` reports.
     - `canGetProgressReport: false` for `opsGto` on Main Campus unstamped legacy reports through the Ops Lead role path.
     - `canGetProgressReport: false` for `opsGto` on satellite branch reports through the Ops Lead role path (independent author or parent paths unaffected).
     - `canUpdateProgressReport: false` and `canDeleteProgressReport: false` for `opsGto`.
   - Update emulator tests in `classesAndAcademic.emulator.test.js` validating the same assertions against live security rules.
3. **UI / Dashboard:**
   - Ensure the Operational Leader cockpit reflects appropriate read-only views without exposing edit/promotion buttons.
