# Data Migration Proposal: Legacy Progress Reports Division Attribute Backfill

**Repo Path:** `docs/proposals/2026-10-17-legacy-progress-reports-division-backfill.md`  
**Date:** 2026-10-17  
**Status:** **PROPOSED — AWAITING OWNER REVIEW & SCOPING (NOT IMPLEMENTED)**  
**Category:** Data Architecture & Migration RFC (Free-Tier Cost & Safety Protection)  
**Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4: §5.0.1, §5.0.2, §6.9, §7.3, §18); Owner Decision OD-FO-02 ([`docs/decisions/2026-10-17-front-office-workspace-placement-and-access-boundaries.md`](../decisions/2026-10-17-front-office-workspace-placement-and-access-boundaries.md))  
**Context:** During the security hardening and division isolation pass for `promoteStudentLevel` (FP-FO-13 / OD-FO-02), pending promotion report lookups were strictly scoped with `where("division", "==", division)` to guarantee that Courses staff cannot query or mutate same-branch Kindergarten evaluation records. A known limitation of Cloud Firestore query index semantics is that documents lacking a `division` field are excluded from equality filters. This RFC documents the legacy limitation, evaluates the risks and Spark quota impacts of a database backfill, and presents migration options for separate owner review.

---

## 1. Problem Statement & Root Cause

### 1.1 Division Isolation Invariant
Under Authoritative Blueprint v3.4 §5.0.1, the Main Campus (`kota_gorontalo`) operates two distinct educational divisions:
1. **Courses Division (`courses`):** Language academy, adult and teen learners.
2. **Kindergarten Division (`kindergarten`):** Early childhood education.

In `firestore.rules:1260-1305`, Division Managers and Front Office staff are strictly bound by branch and division isolation (`isSameBranch(resource.data) && isDivisionAllowedForManager(resource.data)`). If a query from the Courses front desk or Courses Division Manager were to omit the `division` constraint, Firestore emulator tests demonstrate that same-branch Kindergarten progress reports for the same student are returned. Staging updates to those cross-division reports in a batch causes Firestore to reject the entire batch with `permission-denied` (`FirebaseError: false for 'update' @ L1284`).

Therefore, enforcing `where("division", "==", division)` on pending-report queries is mathematically mandatory to preserve division isolation.

### 1.2 Cloud Firestore Query Engine Indexing Semantics
In Google Cloud Firestore:
- An equality filter such as `where("division", "==", "courses")` evaluates only documents that possess an indexed field named `division` with value `"courses"`.
- Any document created before the division attribute was systematically stamped onto `progressReports` lacks the `division` field entirely (`division === undefined`).
- **Firestore never matches missing fields in equality, inequality, or `in` queries.**

### 1.3 Operational Consequence
When a student with legacy progress reports (created prior to division schema stamping) undergoes a level promotion in `promoteStudentLevel`:
1. The student document in `/users/{studentId}` is successfully advanced (`currentLevel: nextLevel`, `promotedFromReport: reportId`).
2. Any newly-created progress reports with `division == "courses"` and `eligibleForPromotion == true` are successfully marked `eligibleForPromotion: false` and stamped with `promotedAt`.
3. **Legacy progress reports without a `division` field are excluded from the query** and therefore remain with `eligibleForPromotion: true` in the database.

---

## 2. Why Backfill Was Excluded from the Current Implementation

Attempting to resolve this limitation within the client application or within the current feature pass was deliberately rejected for the following governance and cost reasons:

1. **Free-Tier Spark Protection (Blueprint Principle / AGENTS.md):**
   Scanning the entire `progressReports` collection on client devices to detect missing fields would consume massive Firestore read quotas. If unconstrained, reading and updating historical collections risks exhausting daily free-tier read/write allowances (estimated standard Spark tier reference: ~50,000 reads/day, ~20,000 writes/day; live project quota limits and current consumption must be audited in the Firebase Console before planning any migration).
2. **Strict Change-Safety Protocol (Rule 4 & 6):**
   The current task was scoped to enforce Owner Decisions OD-FO-01, OD-FO-02, and OD-FO-03. Modifying production data schemas across historical records constitutes a destructive/migration operation requiring independent scoping, cost modeling, rollback plans, and explicit owner review.
3. **Prevention of Client-Side Permission Escalation:**
   Allowing a front-desk client to perform unbounded scans or update unstamped documents without backend validation would weaken the security boundary established in `firestore.rules`.

---

## 3. Backfill Strategy Options (For Future Scoped Task)

If Owner Kifry determines that legacy pending reports must be cleared, the following two migration options are proposed for separate execution:

### Option A: Idempotent One-Off Administrative Backfill Script (Proposed Separate Task)
- **Status:** Proposed design concept only; not implemented. Cloud Functions are not assumed to be available, as introducing Cloud Functions would incur architectural footprint changes and potential billing implications (e.g., Blaze plan requirements) that require explicit owner review and cost approval.
- **Mechanism:** A standalone, audited Node.js administration script executed locally via Firebase Admin SDK credentials, scoped and executed only under an independent, approved migration mandate.
- **Workflow:**
  1. **Phase 1: Pre-Migration Quota Check & Dry-Run Audit:**
     - Check current Firebase project limits and real-time daily quota consumption in the Firebase Console before initiating any operations.
     - Query `/progressReports` documents in chunks of 500 (`limit(500)`).
     - Identify documents where `division` is missing or `null`.
     - Output an exact tally of affected documents by `branchId` and date.
     - Present the tally and estimated Firestore operation costs to Owner Kifry for sign-off.
  2. **Phase 2: Evidence-Based Partitioned Batch Update (Contemporaneous Evidence Required):**
     - Division assignment requires reliable, verifiable evidence contemporaneous with the time the report was filed:
       - **Class Record Immutability Caveat (`/classes/{classId}`):** Cross-referencing the report's associated `classId` against `/classes/{classId}` proves the historical division only if that class document's `division` field is demonstrably immutable or its historical revision history has been preserved. If the class record can change or lacks an immutable history, the proposal must require a verified historical snapshot or mark the report `UNRESOLVED`.
       - **No Unverified Archival Assumptions:** Do not assume hypothetical archival, term enrollment, or audit records exist until their existence, structure, and immutability are independently verified in the live schema.
       - **Student Profile Limitation:** A student's current division field in `/users/{studentId}` reflects their present status and does *not* prove which division an older report belonged to (particularly if a student transferred divisions or matriculated from Kindergarten to Courses). Do not rely on current student profile division to classify historical evaluations.
       - **Strict Fallback:** If contemporaneous evidence is missing, mutable, unverified, or unclear, do NOT infer `"courses"` from creation date, timestamps, or current student state. Classify the report strictly as `UNRESOLVED` for manual review, executing NO write.
     - Commit verified updates using `writeBatch` in batches of $\le 400$ writes:
       ```javascript
       batch.update(reportRef, {
         division: verifiedDivision,
         migratedAt: serverTimestamp(),
         migrationSource: "OD-FO-02-legacy-backfill-v1",
       });
       ```
     - Enforce a pause (`sleep(1000)`) between batches to throttle write throughput.
- **Estimated Cost & Quota Requirements (Multi-Collection Read Model):**
  - Read costs are not limited to the initial report scan. Total operations must account for:
    1. **Initial Scan Reads:** $N$ reads across `/progressReports` to identify unstamped records.
    2. **Linked Lookup Reads:** $K$ reads against referenced classes (`/classes/{classId}`) or other verified historical records (if proven to exist and be reliable; can be optimized via in-memory caching of unique class IDs, but still incurs reads for each distinct referenced class).
    3. **Batch Writes:** $M$ writes committed *strictly* for records with verified, unambiguous contemporaneous evidence ($M \le \text{total unstamped records}$; unresolved records receive zero writes).
  - Total estimated database operations: $\approx (N + K)$ reads + $M$ writes.
  - All quota numbers are estimates; live Firebase quota headroom must be confirmed in the Firebase Console prior to planning execution, and batching must be throttled over multiple days if write volume exceeds safe daily thresholds.

### Option B: Lazy Migration Upon Manual Promotion Trigger
- **Mechanism:** When an instructor or manager views a specific student roster, if an unstamped legacy report is detected for that specific student, provide a scoped reconciliation button that updates only that student's records.
- **Pros:** Zero batch scanning costs; zero risk of Spark quota exhaustion.
- **Cons:** Requires client-side awareness of legacy documents and requires permission in security rules to update legacy unstamped records.

### Option C: Do Nothing / Soft Deprecation
- **Mechanism:** Treat pre-migration progress reports as historical records. As students advance and graduate, legacy reports naturally age out.
- **Pros:** Zero engineering cost, zero database operations, zero quota risk.
- **Cons:** Legacy reports remain technically marked `eligibleForPromotion: true` in Firestore, though they do not affect new level calculations once the student's `currentLevel` is updated.

---

## 4. Current Status & Recommendation

- **Current Status:** **DOCUMENTED LIMITATION — BACKFILL LEFT AS PROPOSAL**.
- **Current Code Behavior:** Strict `where("division", "==", division)` is active in `src/features/students/progressReportsRepository.js`, protecting cross-division isolation and verified in repository and emulator test suites.
- **Action Required:** None at this time. The backfill remains strictly a proposal and should not run until it has a separate approved scope, cost review, and execution plan.
