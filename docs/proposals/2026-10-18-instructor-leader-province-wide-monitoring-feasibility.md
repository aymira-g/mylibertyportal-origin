# Instructor Leader Province-Wide Academic Monitoring — Feasibility Design

> **Authority Level:** Design Analysis & Feasibility Study (Noncanonical Proposal)  
> **Status:** PROPOSED — INDEPENDENT EVIDENCE & FEASIBILITY CORRECTION PASS (GATE 1 PROTOTYPE SPECIFIED; NO ARCHITECTURE IMPLEMENTED)  
> **Authority:** Owner Decision [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md)  
> **Date:** 2026-10-18  
> **Governing Blueprint:** Authoritative Blueprint v3.4.1 (§4, §5, §6.11, §15, §16, §19, §26 G-003, G-011, G-012, §41)  
> **Target Role:** Instructor Leader / Central Academic Lead (`instructorleader`, `instructor_leader`)  
> **Scope:** Evaluate potential data-access architectures to support province-wide academic coordination while keeping the existing Tab 4 home-campus scoped, maintaining branch-scoped raw report access, and adhering to zero-budget Spark constraints.

---

## 1. Decision Boundary & Operational Constraints

On 2026-10-18, Owner / Director Kifry formally ratified [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md), establishing strict boundaries:

1. **Feasibility Design Only:** Approval is limited to investigating and specifying candidate solutions. It does **not** authorize implementing a cross-branch UI, expanding Firestore query scopes, creating a data projection, deploying a backend worker, or altering security rules.
2. **Tab 4 Remains Unchanged:** The existing Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains home-campus scoped (`kota_gorontalo`). No interim dashboard broadening or client-side bypass is authorized.
3. **Raw `/progressReports` Reads Are Branch-Scoped:** Individual document `get` authorization follows `isSameBranch`; collection `list` authorization requires `isSameBranchStrict` so the query itself enforces branch scope. Province-wide academic coordination and approval duties do not, by themselves, grant unrestricted raw student-report reads across branches.
4. **Teacher Evaluation Kept Separate:** Student progress reports and submission recency are student-learning records, not a teacher-evaluation rubric, peer observation, or supervisory appraisal. Teacher evaluation remains an independent future workflow.
5. **No Rule Deployment:** This document does not authorize deploying Firestore rules to live Firebase infrastructure. Repository rule changes remain strictly local pending runtime verification.

---

## 2. Current Verification Baseline & Evidence Status

The local working tree contains updated security rules and unit/emulator test coverage aligning the Instructor Leader's raw `/progressReports` access with the same-branch authorization contract ([`docs/specs/authorization-contract.md`](file:///e:/myliberty-portal/docs/specs/authorization-contract.md) §6.6):

| Verification Check | Target / Scope | Outcome (Prior Run: 2026-10-18) | Evidence & Constraints |
|---|---|---|---|
| **TypeScript Typecheck** | Full workspace | **PASS** (Exit 0) | Verified via `npm run typecheck` (`tsc --noEmit`). |
| **ESLint Security Matrix** | `src/features/shared/securityRulesMatrix/` | **PASS** (Exit 0) | Verified via `npx eslint src/features/shared/securityRulesMatrix/ firestore.rules`. 0 errors. |
| **Security Rules Matrix** | [`divisionIsolation.test.js`](file:///e:/myliberty-portal/src/features/shared/securityRulesMatrix/divisionIsolation.test.js) | **PASS** (Exit 0) | 239 tests passed across 5 test files in the prior test execution. Asserts Instructor Leader raw report reads fail when targeting cross-branch reports or queries lacking strict branch constraints. |
| **Academic & Reports Suite** | `src/features/reports/`, `src/features/academic/` | **PASS** (Exit 0) | 58 tests passed across 5 test files in the prior test execution. |
| **Firestore Local Emulator Suite** | [`classesAndAcademic.emulator.test.js`](file:///e:/myliberty-portal/src/features/shared/firestoreRulesEmulator/classesAndAcademic.emulator.test.js) | **PASS** (Exit 0) | 177 tests passed across 7 test files on local emulator (ports 8085/4400) in the prior test execution. Specifically verified that raw get/list calls across branches return `PERMISSION_DENIED`. |
| **Current Turn Scope** | Feasibility Proposal File Only | **DOCUMENTATION ONLY** | **No code modified and no tests executed during this pass.** Only this feasibility study was revised. |
| **Live Deployed Firebase Rules** | Live Firebase infrastructure | **UNVERIFIED** | **Explicit constraint:** Deployed rules have not been inspected (Firebase CLI offers no read-only rules inspection command without deployment credentials), and no deployment is authorized. |

---

## 3. Candidate Architectural Approaches

Four candidate architectural approaches are under consideration. None has been approved for implementation.

```
Candidate A: Status Quo (Home-Campus Only)
[Browser: Kota Gorontalo Leader] ──> [Firestore: Same-Branch Reports]  (Zero Satellite Access; Known Capability Gap)

Candidate B: Client-Side Raw Queries
[Browser: Kota Gorontalo Leader] ──> [Firestore: Satellite Reports]    (Full Personal Data Transmitted to Browser)

Candidate C: Read-Time Firestore Aggregations
[Browser: Kota Gorontalo Leader] ──> [Firestore: count(), avg()]       (Scalar Results; List Rule Trapdoor & No Group By)

Candidate D: Precomputed Projection Summaries (Candidate for Further Feasibility Testing)
[Background Processor] ──> Scans All Branches ──> Writes [/academicSummaries]
                                                    │
[Browser: Kota Gorontalo Leader] ───────────────────┘                  (Reads Precomputed Document; Unverified Runtime)
```

---

### Candidate A: Status Quo (Home-Campus Scoped Tab 4)

* **Architecture:** Tab 4 continues to display only the Instructor Leader's home campus (`kota_gorontalo`). Academic coordination across satellite branches remains manual and out-of-band.
* **Concrete Query Shape:**
  1. `users` listener: `query(collection(db, "users"), where("role", "in", ["instructor", "instructorleader", "instructor_leader"]), where("branchId", "==", "kota_gorontalo"))`
  2. `progressReports` listener: `query(collection(db, "progressReports"), where("branchId", "==", "kota_gorontalo"), orderBy("examDate", "desc"), limit(100))`
* **Data Exposed:** Full report payloads for Kota Gorontalo only. Zero satellite data exposed to the client. Boundary enforced by `isSameBranch` / `isSameBranchStrict`.
* **Read / Cost Impact:** ~110 document reads on initial load; 1 read per added/modified report. Comfortably within the 50,000 reads/day Spark quota.
* **Privacy Limits:** Clean branch containment. Home-campus students and instructors are within the leader's direct physical supervision. Zero cross-branch privacy exposure.
* **Legacy-Record Coverage:** Omits historical reports lacking `branchId` or unindexed `examDate`. The UI accurately disclaims: *"Most recent N of this branch's evaluations."*
* **Operational Requirements:** Zero new infrastructure, zero schema modifications, zero backend workers.
* **Assessment:** **Feasible and safe as an interim baseline.** Its primary limitation is governance non-fulfillment: it leaves the Central Academic Lead's province-wide mandate (Blueprint §6.11) as an unfulfilled software capability gap.

---

### Candidate B: Client Queries Raw Reports Across Satellite Branches

* **Architecture:** Weaken `firestore.rules` to permit the Instructor Leader province-wide `list` and `get` access on `/progressReports`. The browser client queries satellite branch reports directly and computes summaries in React.
* **Concrete Query Shape:**
  - 4 separate branch queries (one per branch to satisfy index constraints):  
    `query(collection(db, "progressReports"), where("branchId", "==", branchId), orderBy("examDate", "desc"), limit(50))`
  - Requires composite index `progressReports(branchId ASC, examDate DESC)` across all branches.
* **Data Exposed:** Full document payloads for every satellite student are transmitted over the network into browser memory: student full names, student IDs, parent IDs, class IDs, exact test scores, and teacher narrative comments.
* **Read / Cost Impact:** 50–100 reports $\times$ 4 branches $= 200$ to $400$ document reads per dashboard view. 10 dashboard views/day $= 2,000$ to $4,000$ reads/day. Fits within the 50,000 Spark quota under low traffic, but scales directly with report volume and refresh frequency.
* **Privacy Limits & Inferential Risks:**
  - **Severe privacy failure:** Client-side masking or filtering in React is cosmetic; raw student records reside in the browser's memory and Network DevTools.
  - Violates Blueprint §19 (Child Data Privacy) and the principle of least privilege.
  - In lean satellite branches with tiny cohorts (e.g., 1–3 students in a level at Pohuwato), individual child progress is entirely exposed.
* **Legacy-Record Coverage:** Any multi-field query (`branchId` + `division` + `examDate`) silently drops unstamped legacy reports lacking `division`.
* **Operational Requirements:**
  - Requires breaking the branch-isolation security rule on `/progressReports`.
  - **Does not solve instructor discovery:** The client cannot query `/users` across branches to resolve `instructorId` to names without also breaking staff privacy rules.
* **Assessment:** **REJECTED.** Violates data minimization, compromises child data privacy, conflicts with ratified Owner Decision `2026-10-18-instructor-leader-academic-monitoring-scope.md`, and exposes raw student evaluations across municipalities.

---

### Candidate C: Read-Time Firestore Aggregation Queries (`count()`, `average()`)

* **Architecture:** The client uses Firestore's native aggregation functions (`getCountFromServer`, `getAggregateFromServer`) to retrieve numerical counts and averages directly from Firestore without downloading full documents.
* **Concrete Query Shape:**
  - Firestore aggregations **do not support `GROUP BY`**. Every single cell in the dashboard matrix requires an independent query:
    1. *Campus/Division Report Counts:* 5 queries (`kota_gorontalo` courses/kindergarten, `bone_bolango` courses, `limboto` courses, `pohuwato` courses):  
       `getCountFromServer(query(collection(db, "progressReports"), where("branchId", "==", b), where("division", "==", d), where("examDate", ">=", horizon)))`
    2. *Campus/Division Average Scores:* 5 queries:  
       `getAggregateFromServer(query(collection(db, "progressReports"), where("branchId", "==", b), where("division", "==", d), where("examDate", ">=", horizon)), { avgScore: average("overallScore") })`
    - **Total Queries Per Refresh:** 10 independent network aggregation requests (assuming macro level only, without per-instructor breakdowns).
* **Data Exposed:** Aggregate numbers only (scalar count and average score). No raw student names or remarks sent over the wire during standard execution.
* **The Security Rule Trapdoor:** In Firestore security rules, aggregation queries execute against the collection's `allow list` rule. **Firestore rules cannot permit `count()` while denying `getDocs()` on the same collection.** Granting the Instructor Leader `allow list` across branches to run aggregations automatically grants them permission to execute raw document queries (`getDocs()`), destroying the security boundary.
* **Read / Cost Impact:** Firestore charges 1 document read per up to 1,000 index entries scanned per aggregation query (minimum 1 read per query). If 10 aggregation queries match fewer than 1,000 index entries each, this consumes ~10 reads per dashboard load. However, if reports grow or queries match wider ranges, read costs scale with matched index entries, not just query count.
* **Privacy Limits & Inferential Risks:**
  - **Cannot count distinct learners:** Native `count()` counts *matching documents*, not unique students. If a single student in Pohuwato received 3 reports during the period, `count()` returns 3. A cell indicating $N=3$ misleadingly appears to represent a cohort, while actually exposing a single child.
  - **Differencing Vulnerability:** An authorized user querying overlapping timeframes (e.g., a 30-day window vs a 31-day window) can algebraically isolate the exact test score of a single student evaluated on the 31st day under the assumption that scores from the initial 30 days remain unchanged (a shift in a fixed-size cohort's average does not, by itself, identify which learner changed):  
    $$\text{Score}_{\text{new}} = (N+1)\cdot \text{Avg}_{N+1} - N\cdot \text{Avg}_N$$
* **Legacy-Record Coverage:** Unstamped legacy reports lacking `division` are completely excluded by `where("division", "==", "courses")`.
* **Operational Requirements:**
  - Requires composite index configurations for every filtered dimension combined with date horizons.
* **Assessment:** **CONDITIONALLY INSUFFICIENT.** While client payloads are small, it cannot enforce distinct-learner suppression, is vulnerable to differencing attacks, and requires opening raw list permissions in rules.

---

### Candidate D: Precomputed Projection Summaries (Dedicated `/academicSummaries` Collection)

* **Architecture:** A trusted backend processor periodically scans raw progress reports across all branches using administrative credentials, computes distinct learners and score distributions, enforces small-cell suppression, and writes pre-aggregated summary documents to a separate collection (`/academicSummaries`). The Instructor Leader dashboard reads **only** from `/academicSummaries`.
* **Status:** **Candidate for further feasibility testing.** It is **not** currently established as the "only viable" or "architecturally superior" approach; its operational viability, cost, security boundaries, and runtime limits remain unproven.
* **Concrete Query Shape:**
  - Client query:  
    `query(collection(db, "academicSummaries"), where("period", "==", "2026-Q4"))`
  - Exactly **4 to 5 document reads** per dashboard visit to render the entire province-wide academic overview.
  - Candidate summary document structure:
    ```json
    {
      "id": "bone_bolango_courses_2026-Q4",
      "branchId": "bone_bolango",
      "division": "courses",
      "period": "2026-Q4",
      "distinctLearnersCount": 14,
      "totalReportsCount": 18,
      "scoreBuckets": {
        "needsSupport": 2,
        "developing": 4,
        "proficient": 8,
        "advanced": 4
      },
      "averageScore": 76.5,
      "suppressed": false,
      "updatedAt": "2026-10-18T00:00:00Z"
    }
    ```
* **Data Exposed:** Summary fields only. The client never receives raw student documents, child IDs, parent contacts, or evaluation remarks. Staff-level tracking is excluded from the macro schema (see Section 5).
* **Security Boundary:** Pure server-side isolation. `firestore.rules` grants Instructor Leader `read` on `/academicSummaries`, while `/progressReports`, `/users`, and `/classes` remain strictly branch-locked.
* **Read / Cost Impact (Estimates Subject to Measurement):**
  - Client reads: ~5 reads per dashboard load.
  - Backend processor: Reads depend on the total volume of reports scanned during each batch run and query shape. On a dataset of ~500–1,000 reports, a weekly batch read consumes ~500–1,000 reads/week, well within the 50,000 daily Spark quota, but must be measured against real production growth and pagination overhead.
* **Privacy Limits (Mitigations, Not Guarantees):**
  - **Set-Based Unique Learner Counting:** The backend can calculate unique students via `new Set(reportList.map(r => r.studentId)).size`.
  - **Small-Cell Suppression:** If distinct learners fall below an owner-approved threshold ($N$), score distributions and averages are omitted.
  - *Privacy Caveat:* Neither fixed reporting windows nor an $N$-threshold completely eliminates inferential risk (see Section 6).
* **Legacy-Record Coverage:** The backend processor can run custom normalization logic: resolving missing `division` from parent class references or defaulting safely, normalizing `examDate` fallbacks, and recording data-quality notes.
* **Operational Requirements & Major Unresolved Risks:**
  - Requires an authorized, zero-budget execution environment. Cloud Functions is unavailable under the Spark plan.
  - Cloudflare Worker Free tier execution limits (10ms CPU time) are unproven for this workload (see Section 4.1).
  - Server-side administrative credentials bypass Firestore Security Rules, introducing severe IAM risks (see Section 4.2).
* **Assessment:** **CONDITIONALLY PROMISING BUT UNVERIFIED.** It provides clean read-side data isolation, but its server-side execution runtime, CPU budget, IAM credential handling, and operational failure modes remain unproven.

---

## 4. Technical Feasibility Audit of Candidate D (Cloudflare Worker & Server-Side IAM)

### 4.1 Cloudflare Free Tier Platform Limits vs. Batch Workload

The repository currently deploys `myliberty-ai-proxy` on Cloudflare Workers. Attempting to add scheduled batch aggregation under the Cloudflare Free plan involves strict platform constraints documented in official Cloudflare documentation ([Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)):

| Platform Resource | Official Cloudflare Free Limit | Scope of Limit | Workload Demand & Feasibility Impact | Status |
|---|---|---|---|---|
| **CPU Time per Invocation** | **10 milliseconds** (strictly enforced; limit exhaustion triggers **Error 1102**) | **Per Invocation** | *Crucial distinction:* CPU time measures only active code execution (parsing JSON, iterating collections, hashing Set keys, computing score distributions). Network I/O (`fetch()`) does not count toward CPU time. Limit exhaustion is documented as Error 1102 (`Worker exceeded CPU time limit`) (Sources: [limits](https://developers.cloudflare.com/workers/platform/limits/), [errors](https://developers.cloudflare.com/workers/observability/errors/)). A Node.js benchmark measures elapsed time via `process.hrtime.bigint()`, which includes event loop latency, GC, and OS scheduling; it **cannot** prove compliance with the 10ms CPU limit. Node benchmarks are **indicative only** (useful for comparing algorithm scaling across dataset sizes). Furthermore, while `workerd` or Miniflare can test Worker code locally, local test results alone **cannot be described as certifying behavior under Cloudflare's production Free-plan limits** (due to host hardware differences, edge multi-tenancy, and production isolate initialization). | **UNPROVEN RISK** (Requires indicative local benchmark, then non-production runtime testing). |
| **Wall-Clock Time** | **Up to 15 minutes** for Cron Triggers (Source: [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)) | **Per Invocation (Cron)** | While HTTP requests are bounded by client timeouts (e.g. 30 seconds), Cron Triggers permit up to 15 minutes of wall-clock time. Waiting for Firestore REST API network I/O does not count toward the separate 10ms CPU limit. | Feasible for network I/O. |
| **External Subrequests** | **50 subrequests** per invocation | **Per Invocation** | Fetching documents individually would immediately crash the worker. The worker **must** use Firestore's REST `runQuery` endpoint to batch-fetch branch reports in $\le 4$ HTTP requests. | Conditionally Feasible (Requires `runQuery`). |
| **Memory per Isolate** | **128 MB** | **Per Isolate** | Sufficient for small JSON payloads, but requires stream/chunking if report history grows. | Feasible. |
| **Cron Triggers** | **5 Cron Triggers per account** | **Account-Level** | Free accounts are limited to 5 Cron Triggers total across all Workers scripts in the account. (Source: [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)). | Feasible if account quota is unallocated. |
| **Cron Retry Semantics & Failure Monitoring** | **Platform retry behavior and `controller.noRetry()` method; platform alerting integrations (Workers Issues / Cloudflare Notifications)** | **Platform Runtime & Account Configuration** | Cloudflare documents `controller.noRetry()` as the scheduled-handler control for suppressing retries ([Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)). Calling `controller.noRetry()` "upon entry" is an anti-pattern that would blindly suppress retries for every run, including transient network errors and retryable 5xx errors (503/504). Instead, retry behavior must be governed by an explicit failure classification policy (suppressing retries on deterministic failures, single-retry restricted internal errors, and defensively on daily quota exhaustion, while allowing retry for transient service hiccups). However, a local scheduled-handler test can only check whether code invokes `controller.noRetry()`; **it cannot reproduce Cloudflare's actual platform-level automatic retry behavior, backoff schedule, or queuing following a failed scheduled event in production**. Platform retry behavior remains **unresolved** unless demonstrated in an environment capable of reproducing Cloudflare's scheduled-event pipeline. Additionally, behavior on Error 1102 and live account alerting integrations remain unverified. | **UNVERIFIED BEHAVIOR & OPERATIONAL RISK** (Requires failure-policy design, local unit checks, and alert configuration; production retry behavior unresolved). |
| **Daily Request Quota** | 100,000 requests/day | **Account-Level** | Weekly cron executions consume negligible request quota. | Feasible. |

*Verdict on Runtime:* Batching requests with `runQuery` addresses the subrequest limit, and the 15-minute wall-clock limit accommodates network I/O. However, this does **not** prove that reading, parsing, deduplicating, and aggregating representative report volumes fits the separate 10ms CPU limit (Error 1102). A local Node benchmark can only compare algorithm complexity across dataset sizes, not certify isolate CPU limits. Furthermore, while `workerd` or Miniflare can test Worker code locally, local tests cannot certify production edge limits, and scheduled-event retry behavior under real platform failures remains unresolved. Claiming Candidate D is feasible or zero-cost without measured prototype evidence is premature.

---

### 4.2 Server-Side IAM & Security Rule Bypass

In Firebase, server-side REST requests authenticated via Google Service Account OAuth2 tokens **completely bypass Cloud Firestore Security Rules (`firestore.rules`)** (see [Firestore Security Rules and Server Clients](https://firebase.google.com/docs/firestore/security/rules-conditions)):

1. **The Rule Bypass Reality:** When a server client or REST call authenticates with a service account OAuth2 token, Firestore bypasses `firestore.rules` entirely. Requests execute with the full administrative authority granted to that service account in GCP IAM, ignoring all collection, branch, and division rules.
2. **Unverified Repository State:** The existing `worker.js` generates OAuth2 tokens using `FIREBASE_SERVICE_ACCOUNT_KEY` and `FIREBASE_SERVICE_ACCOUNT_EMAIL`. However, **the actual IAM roles and permissions assigned to that service account in Google Cloud Console remain unverified** from repository artifacts alone.
3. **Conditional Risk Analysis:**
   - *If* the service account has broad GCP roles (such as `roles/datastore.user`, `roles/editor`, or `roles/firebase.admin`), it has unrestricted read and write authority across every collection in the database (`/users`, `/finances`, `/salaries`, `/progressReports`, etc.). A compromise of the worker secret would expose all organizational data.
   - *If* a dedicated, least-privilege service account is configured, the blast radius can be reduced; however, standard GCP IAM roles for Cloud Datastore/Firestore operate at the project/database level, not at individual collection paths.
4. **Credential Storage & Rotation:** The private key currently resides as an environment secret. There is no automated rotation pipeline. An operational compromise or configuration error would expose all organizational data.
5. **Trigger & Invocation Security:** If the aggregation worker is exposed via an HTTP endpoint (for manual runs or debugging), an unauthenticated caller could trigger execution, draining Firestore read quotas or causing denial-of-service. Any manual endpoint must require cryptographic authentication and rate-limiting.
6. **Partial Failure & Replay Risk:** If the worker exceeds its 10ms CPU limit mid-execution, it will terminate abruptly, potentially writing summary documents for some branches while leaving others outdated or missing. The system requires transactional write batches or staging timestamps to prevent publishing corrupted state.

---

## 5. Audit of Proposed Summary Schema & Data Fields

The candidate summary schema must be audited to ensure every field satisfies data minimization:

```json
{
  "id": "bone_bolango_courses_2026-Q4",
  "branchId": "bone_bolango",
  "division": "courses",
  "period": "2026-Q4",
  "distinctLearnersCount": 14,
  "totalReportsCount": 18,
  "scoreBuckets": {
    "needsSupport": 2,
    "developing": 4,
    "proficient": 8,
    "advanced": 4
  },
  "averageScore": 76.5,
  "suppressed": false,
  "updatedAt": "2026-10-18T00:00:00Z"
}
```

### Field-by-Field Audit:

| Schema Field | Academic Monitoring Purpose | Necessity & Privacy Evaluation | Recommendation / Disposition |
|---|---|---|---|
| `branchId`, `division`, `period` | Dimensional grouping | Necessary for macro curriculum oversight across branches. | Retain. |
| `distinctLearnersCount` | Sample validation & suppression | Necessary to evaluate cohort size and enforce suppression. | Retain. |
| `totalReportsCount` | Volume tracking | Shows reporting activity volume relative to learner count. | Retain. |
| `scoreBuckets`, `averageScore` | Academic outcome distribution | Provides macro curriculum effectiveness without student-level data. | Retain (Subject to suppression). |
| `suppressed` (boolean) | Small-cell flag | Informs UI to mask scores when cohort is below threshold. | Retain. |
| `updatedAt` | Freshness tracking | Allows the UI to warn users if data is stale. | Retain. |

### Disposition on Staff Tracking (`instructorSubmissions`):

Earlier drafts considered embedding an `instructorSubmissions` array (`instructorId`, `reportCount`, `lastSubmissionDate`, `stale`) in the summary document. **This array has been omitted from the candidate macro schema** for the following governance and privacy reasons:

1. **De Facto Individual Surveillance:** In lean satellite branches with only 1–2 instructors (e.g. Pohuwato or Limboto), reporting submission counts per instructor is practically identical to branch output and isolates individual staff performance.
2. **Conflating Compliance with Academic Outcomes:** Tracking whether teachers submit reports on time is an administrative supervisory function, not a student academic progress measure.
3. **Teacher Evaluation Boundary:** Blueprint §6.11 and ratified policy keep teacher evaluation strictly separate from progress reporting. Staff submission tracking risks introducing an unvetted evaluation proxy.
4. **Access Control:** If `/academicSummaries` has general read access, peer instructors or other staff could view compliance rankings.
5. **Conclusion:** Staff-level submission monitoring is **not** an assumed requirement of province-wide academic progress monitoring. If the Owner desires submission tracking, it must be addressed as a separate, restricted supervisory tool, not bundled into macro student progress summaries.

---

## 6. Privacy Limits & Inferential Risks: Mitigations vs. Guarantees

Suppression thresholds and fixed reporting cycles are *mitigations*, not mathematical guarantees of anonymity:

1. **Fixed Periods Reduce, but Do Not Eliminate, Differencing:**
   - Comparing a quarterly summary ($Q1$) against two monthly summaries ($Jan + Feb$) algebraically isolates the third month ($March$).
   - Comparing multi-division summaries or cross-referencing published figures across reporting periods can isolate small cohort shifts.
   - If summaries are updated dynamically or re-run mid-cycle, differences between successive snapshots can reveal individual learner additions under assumptions such as unchanged scores for existing learners (a shift in a fixed-size cohort's average does not, by itself, identify which learner changed).
2. **Small-Cell Suppression ($N < 5$ or $N < 3$) Is a Mitigation, Not a Guarantee:**
   - In small satellite branches (e.g., Pohuwato or Bone Bolango), local staff, instructors, and parents possess external background knowledge (e.g., knowing that only one child enrolled in "Warrior Level" this term).
   - Even if $N = 6$ for the branch overall, a score distribution shift combined with local knowledge of who was tested can lead to deterministic deanonymization.
   - If an instructor breakdown is displayed, an instructor with only 1–2 students is immediately deanonymized.
3. **Threshold Selection Remains an Owner Decision:**
   - Setting $N < 3$ vs $N < 5$ involves balancing privacy protection against data utility. A higher threshold protects privacy but may cause satellite branches to display "Suppressed" permanently due to small class sizes. This trade-off must be decided by the Owner.

---

## 7. Cost & Read Estimates Qualification

All read, subrequest, and cost figures are engineering estimates based on platform pricing rules and query plans; they require validation through empirical measurement:

* **Firestore Read-Time Aggregations (Candidate C):**
  - Pricing is 1 document read per up to 1,000 index entries scanned (minimum 1 read per query).
  - *Estimate:* 10 queries $\times$ 1 read $= 10$ reads per dashboard load.
  - *Condition:* If the dataset expands or indexes match wide time ranges exceeding 1,000 entries per cell, read consumption multiplies accordingly.
* **Precomputed Summary Processing (Candidate D):**
  - Processing costs depend on total documents scanned and subrequests executed during the batch run.
  - *Estimate:* Scanning ~100–1,000 reports in a run across 4 branch queries consumes a modeled workload estimate of ~100–1,000 reads on the execution day ($\approx 0.2–2\%$ of that execution day's 50,000 daily Spark read allowance, which resets around midnight Pacific Time).
  - *Condition & Synthetic Data Limitation:* Synthetic data testing validates aggregation data structures (`Set` deduplication, score bucketing, suppression logic) and estimates costs from an explicit query plan. However, **synthetic data cannot confirm actual Firestore wire reads or subrequest counts**. Modeled read and subrequest figures (~100–1,000 reads/run; ~5 external subrequests/run) must remain phrased as modeled estimates until empirical production measurements occur.
  - *Mitigations vs. Guarantees:* Service account REST calls bypass `firestore.rules` and carry project-level GCP IAM blast radius risks (Section 4.2), while small-cell suppression reduces casual disclosure but cannot guarantee anonymity against auxiliary background knowledge in small satellite communities (Section 6).

---

## 8. Staged Owner Decisions Table (Ratification Status & Governance Framework)

* **Recorded Owner Intent (In Principle Only):** Owner Kifry’s intent is recorded as **pursue province-wide academic monitoring in principle**, consistent with the Central Academic Lead / Instructor Leader’s province-wide academic responsibility defined in the Authoritative Blueprint (Blueprint v3.4 §4, §5, §26 G-012).
* **Strict Governance Boundary:** The initial statement of intent was in principle only; it did not constitute approval of Candidate D, production implementation, Firestore security rule changes, or cloud deployment. Subsequent policy determinations (`OD-AM-01` staged path, `OD-AM-02`, `OD-AM-03`, `OD-AM-04`, `OD-AM-05`, `OD-AM-06`, `OD-AM-07`) have since been formally ratified as documented below, while production implementation remains strictly blocked pending Gate 4.
* **Current System State Maintained:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`) while feasibility investigations and reporting policy design continue.
* **Decision Status Discipline:** Stage 1 strategic disposition (`OD-AM-01`) is **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md) (Option B: staged path). Stage 2 reporting policies are **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md). Stage 3 execution and readiness policies (`OD-AM-03` monthly cadence, `OD-AM-05` conditional automated schedule, and `OD-AM-07` mandatory production readiness gate) are **RATIFIED BY OWNER KIFRY (2026-10-19)** under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md), subject to explicit operational boundaries, the unresolved $N \ge 5$ privacy choice, and the Gate 4 production authorization gate:

### Stage 1: Desired Monitoring Outcome & Strategic Scope (RATIFIED BY OWNER — 2026-10-18)

*Canonical Decision Record:* [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)

| Decision ID | Question for Owner Kifry | Options / Ratified Choice | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-01** | **Province-Wide Academic Monitoring Strategic Disposition** | **Option B (RATIFIED STAGED PATH):** Continue pursuing province-wide monitoring in principle, keep Tab 4 home-campus-only (`kota_gorontalo`), and defer production implementation pending the remaining gates.<br>*(Option A [Candidate D Conditional Direction] and Option C [Decline Portal Implementation] superseded by Option B).* | Formally confirms pedagogical monitoring mandate without premature architectural commitment or unverified deployment. Tab 4 remains strictly home-campus scoped. Production implementation held for Gate 4. Zero financial impact ($0). | **RATIFIED BY OWNER KIFRY (2026-10-18)** |

### Stage 2: Core Reporting & Privacy Policy Determinations (RATIFIED BY OWNER — 2026-10-18)

*Canonical Decision Record:* [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)

| Decision ID | Question for Owner Kifry | Ratified Choice / Standards | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-06** | **Score Weighting Policy** | **Option B (RATIFIED):** Learner Academic Average (per-learner deduplicated average). | Multiple reports for the same learner within the quarter are averaged first; each distinct learner carries an equal weight of 1 in averages and score distribution buckets. Zero cost impact ($0). | **RATIFIED BY OWNER KIFRY (2026-10-18)** |
| **OD-AM-03** | **Reporting Horizon & Cadence** | **Option A (RATIFIED FOR PERIOD):** Fixed Calendar Quarters (Q1–Q4).<br>*Cadence Boundary:* Generation cadence was undecided in Stage 2; subsequently ratified on 2026-10-19 under Stage 3 as Option B (Monthly Batch Generation; Entry #48). | Fixed quarters avoid continuously overlapping date ranges and reduce some differencing risks (without eliminating them). Generation cadence subsequently ratified in Stage 3. | **RATIFIED BY OWNER KIFRY (2026-10-18)** (Quarterly period); Cadence ratified 2026-10-19 |
| **OD-AM-02** | **Small-Cell Suppression Threshold** | **Option A (RATIFIED):** Threshold $N < 5$ distinct learners. | Aggregates suppressed whenever fewer than 5 distinct learners are represented in the cohort during the reporting period. Counts and score details for suppressed cohorts are not exposed. Stronger protection in satellites; cohorts may display empty. | **RATIFIED BY OWNER KIFRY (2026-10-18)** |
| **OD-AM-04** | **Staff Submission Tracking Disposition** | **Option A (RATIFIED):** Exclude staff submission metrics from academic progress summary. | Summaries focus purely on student learning distributions. Any staff submission tracking requires an independent supervisory inquiry with explicit boundaries and separate Owner decision. | **RATIFIED BY OWNER KIFRY (2026-10-18)** |

### Stage 3: Candidate D Safety Assessment & Execution Mechanism (RATIFIED BY OWNER — 2026-10-19)

*Canonical Decision Record:* [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)

| Decision ID | Question for Owner Kifry | Options / Ratified Policy | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-03** | **Summary Generation Cadence** *(Quarterly Reporting Period Ratified)* | **Option B (RATIFIED CADENCE):** Monthly batch generation (1st of each calendar month, 3 runs/quarter).<br>*(Option A [Weekly] and Option C [End-of-Quarter Only] superseded).*<br>*Resolved Privacy Gate:* Preserves explicit caveat that monthly cadence does not eliminate temporal differencing risk for cohorts with $N \ge 5$. Residual differencing risk, view access, and export boundaries subsequently resolved and ratified under Entry #49 (`OD-AM-08`). | Represents an operational compromise between data freshness (up to 31 days stale, assuming scheduled runs succeed; failures or delivery delays extend staleness) and fewer observation points than weekly (3 runs vs ~12 runs/quarter). Draws against daily 50,000 read allowance (~100–1,000 reads/run) only once per month. Financial impact: no additional cost expected if existing free-tier limits suffice. | **RATIFIED BY OWNER KIFRY (2026-10-19)** (Monthly Cadence; Residual Privacy Choice Resolved under OD-AM-08) |
| **OD-AM-05** | **Backend Execution Model & Trigger Authority** | **Option A (RATIFIED PREFERRED MODEL):** Automated background cron via Cloudflare Worker, conditional on `OD-AM-07` readiness gate.<br>**Accountable Operator Designated:** Vice Director designated for operational monitoring, staleness tracking, and recovery coordination.<br>*Authority Boundary:* No trigger authority, no deployment authority, and no expanded data access granted or inferred. System Admin holds no business trigger or approval authority; technical maintenance requires separate authorization. | Eliminates interactive UI buttons and manual quota storms. Delegates execution to elevated backend service account. Designates Vice Director as Accountable Operator for operational monitoring and recovery coordination under Blueprint v3.3 §5.4. Operator designation strictly excludes trigger power, deployment authority, and raw cross-branch report access. Financial impact: no additional cost expected if existing free-tier limits suffice. | **RATIFIED BY OWNER KIFRY (2026-10-19)** (Conditional Automated Schedule; Vice Director Accountable Operator) |
| **OD-AM-07** | **Failure Handling, Alerting & Recovery Requirements** | **Option C (RATIFIED MANDATORY READINESS GATE):** Unattended production cron strictly prohibited until email alert delivery is verified, Tab 4 staleness indicator is implemented, and recovery runbook is established and tested.<br>**Bounded Retries:** Requires bounded failure handling with no unbounded retries.<br>*Unresolved Classifications:* Exact retry classifications (e.g. 429 quota exhaustion vs transient spikes) and platform retry queuing remain unresolved. | Prohibits premature production cron deployment. Enforces bounded failure handling to prevent runaway retry cascades against Firestore's 50k daily limit. Tab 4 staleness indicator and out-of-band email alerts provide defense against silent pipeline failure. Exact error retry classifications remain unresolved until platform behavior is validated. Financial impact: no additional cost expected if existing free-tier limits and alerting features suffice. | **RATIFIED BY OWNER KIFRY (2026-10-19)** (Option C Mandatory Readiness Gate; Bounded Retries) |

### Residual Privacy, View Access & Export Boundaries (RATIFIED BY OWNER — 2026-10-19)

*Canonical Decision Record:* [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)

| Decision ID | Question for Owner Kifry | Options / Ratified Policy | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-08** | **Residual Privacy Risk ($N \ge 5$), View Access & Export Boundaries** | **Proposal D (RATIFIED POLICY):**<br>• **View Access:** Limited strictly to Central Academic Lead (`instructorleader`). Director and Vice Director access is not included unless approved separately.<br>• **Bulk CSV Export:** Strictly prohibited for `/academicSummaries`. Does not alter unrelated reports.<br>• **Residual Risk Acceptance:** Owner Kifry explicitly accepts that monthly summaries for cohorts with $N \ge 5$ can permit temporal differencing under documented mathematical conditions (single addition, score invariance, no removals/transfers/batching). Operational risk accepted; no claim that summaries guarantee mathematical privacy.<br>• **Preserved Invariants:** $N < 5$ suppression (`OD-AM-02`), monthly cadence (`OD-AM-03`), and reporting metrics remain unchanged. | Limits aggregate visibility strictly to pedagogical leadership (least privilege; Blueprint §6.11, §11, §23). Disallowing bulk CSV export prevents automated harvesting. Formal owner acceptance of residual risk under small-cohort realities rather than claiming mathematical privacy. Zero financial cost impact ($0). | **RATIFIED BY OWNER KIFRY (2026-10-19)** (Central Academic Lead Only; No CSV Export; Residual Risk Accepted) |

---

## 9. Comprehensive Evidence & Uncertainty Matrix

In accordance with the Decision Brief Quality Gate, the following matrix categorizes all evidence supporting this study:

| Category | Evidence Item / Claim | Source / Documentation | Verification Status |
|---|---|---|---|
| **Verified Repository Fact** | Raw report reads restricted to same branch in local rules | [`firestore.rules:1324, 1336`](file:///e:/myliberty-portal/firestore.rules#L1324) | Verified locally in prior test run; 177 emulator tests pass. |
| **Verified Repository Fact** | Staff profiles and classes are strictly branch-isolated | [`firestore.rules:859, 977`](file:///e:/myliberty-portal/firestore.rules#L859) | Verified in code and prior test suite (`isSameBranchStrict`). |
| **Verified Repository Fact** | No scheduled cron triggers or background workers exist | [`cloudflare-worker/wrangler.toml`](file:///e:/myliberty-portal/cloudflare-worker/wrangler.toml) | Verified: `wrangler.toml` and `worker.js` have no cron configurations. |
| **Verified Local Test Result** | Gate 2B: Local policy conformance & atomic write verification | [`tests/gate2bLocalSummaryInvestigation.mjs`](file:///e:/myliberty-portal/tests/gate2bLocalSummaryInvestigation.mjs) | **Verified locally in Firestore emulator (8/8 checks passed):** per-learner weighting, YYYY-MM-DD bounds, stored $N<5$ suppression confirmed via direct GET read-back (explicit stored `null` / `nullValue`), in-memory 12-field schema whitelist (does not independently validate stored field set), 1-subrequest atomic REST `:commit` for 5 partitions (modeled ~5 subrequests total when combined with 4 branch queries), HTTP 400 `FAILED_PRECONDITION` transactional rollback on stale `updateTime`, identical-batch replay idempotency (5 run-specific paths present; collection not counted), and indicative compute scaling ($0.2–1.08\text{ ms}$). Uses administrative `Bearer owner` token (does NOT verify production rules or authorization). |
| **Official Service Limit** | Cloudflare Workers Free CPU time limit is strictly 10ms (limit exhaustion is Error 1102) | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/), [Errors](https://developers.cloudflare.com/workers/observability/errors/) | Confirmed: 10ms CPU limit per invocation applies to Cron Triggers on Free plan; exhaustion throws Error 1102. |
| **Official Service Limit** | Cloudflare Workers Cron wall-clock duration is up to 15 minutes | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Confirmed: Cron Triggers permit up to 15 minutes of wall-clock duration (separate from the 10ms CPU limit). |
| **Official Service Limit** | Cloudflare Workers Free subrequest limit is 50 | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Confirmed: Max 50 external `fetch()` calls per invocation. |
| **Official Service Limit** | Cloudflare Workers Free Cron Triggers limit is 5 per account | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Confirmed: 5 Cron Triggers per account across all Workers. |
| **Official Service Limit** | Firebase Spark Plan quota is 50,000 document reads/day | Firebase Official Pricing Documentation | Confirmed: Free tier daily read cap of 50,000 reads/day, resetting daily around midnight Pacific Time (PT / UTC-8 or UTC-7; no cumulative monthly quota). Cloudflare Cron Triggers execute strictly on UTC, so these two independent clocks must be kept distinct. |
| **Official Service Limit** | Firestore aggregations charge 1 read per up to 1,000 index entries | Google Cloud Firestore Pricing Documentation | Confirmed: Index scan pricing rule. |
| **Estimate (Subject to Measure)** | Candidate C read consumption (~10 reads/load) | Query count calculation ($5 + 5$) | Assumes $<1,000$ index entries matched per query. |
| **Estimate (Subject to Measure)** | Candidate D batch read consumption (~100–1,000 reads/run) | Report volume assumption & query plan | Modeled workload estimate based on synthetic cohort sizes; not a measured wire count or quota share. Directly decrements the daily 50,000 read limit on the execution day. |
| **Assumption (Unproven)** | Report aggregation fits within 10ms Cloudflare CPU time | Theoretical JSON parsing budget | **Unproven (Indicative Node Benchmark Only):** While an asynchronous wait increases elapsed duration, Cloudflare's 10ms limit measures active isolate CPU time. Deserialization, repeated JSON parsing, and retry hashing consume CPU cycles. Local benchmarks measure elapsed time via `process.hrtime.bigint()`, which cannot prove active isolate CPU time or establish that the Worker will stay below the production limit (Error 1102 remains an unverified risk). |
| **Assumption (Unproven)** | Cloudflare Cron automatic retry behavior and `controller.noRetry()` semantics | [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) | **Unverified:** Cloudflare documents `controller.noRetry()` to suppress retries; however, the documented API control does not, by itself, establish which failures are automatically retried by Cloudflare's platform or how often. Platform retry behavior remains unresolved. |
| **Assumption (Unproven)** | Service account GCP IAM roles and permissions | Google Cloud Console IAM | **Unverified:** The actual IAM roles granted to the service account in GCP are unverified from repository artifacts alone. Bypasses `firestore.rules`. |
| **Assumption (Unproven)** | Live Cloudflare account alert notifications (Notifications) and Workers Issues setup | Cloudflare Dashboard | **Unverified:** Live account configuration, notification policies (Alerts), available alert types, and in-dashboard Workers Issues setup are not documented in repository artifacts. |
| **Assumption (Unproven)** | Live deployed rules match repository rules source | Local working tree | **Unverified:** Firebase production deployment state has not been inspected. |
| **Ratified Owner Policy** | Stage 1: Strategic implementation disposition | Decision ID `OD-AM-01` | **RATIFIED BY OWNER KIFRY (2026-10-18):** Option B (Staged Path). Continue pursuing province-wide monitoring in principle, keep Tab 4 home-campus-only (`kota_gorontalo`), and defer production implementation pending the remaining gates ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)). |
| **Ratified Owner Policy** | Stage 2: Score weighting policy | Decision ID `OD-AM-06` | **RATIFIED BY OWNER KIFRY (2026-10-18):** Learner Academic Average. Average each learner's reports within the quarter first, then weight each distinct learner equally in averages and score distribution buckets ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)). |
| **Ratified Owner Policy** | Stage 2: Reporting period window | Decision ID `OD-AM-03` (Period) | **RATIFIED BY OWNER KIFRY (2026-10-18):** Fixed calendar quarters (Q1–Q4). Fixed quarters avoid continuously overlapping date ranges, reducing some differencing risks without eliminating them. *Important boundary:* Generation cadence was undecided in Stage 2; subsequently ratified on 2026-10-19 as Option B (Monthly Batch Generation; see Stage 3 row below and Entry #48). ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)). |
| **Ratified Owner Policy** | Stage 2: Small-cell suppression threshold ($N$) | Decision ID `OD-AM-02` | **RATIFIED BY OWNER KIFRY (2026-10-18):** Threshold $N < 5$ distinct learners. Suppress results when fewer than 5 distinct learners are represented in the cohort during the reporting period; conceal counts and score details for suppressed groups ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)). |
| **Ratified Owner Policy** | Stage 2: Staff submission tracking disposition | Decision ID `OD-AM-04` | **RATIFIED BY OWNER KIFRY (2026-10-18):** Exclude staff submission metrics from academic progress summary. Any separate staff-tracking proposal requires an independent inquiry and decision ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)). |
| **Ratified Owner Policy** | Stage 3: Summary generation cadence | Decision ID `OD-AM-03` (Cadence) | **RATIFIED BY OWNER KIFRY (2026-10-19):** Option B (Monthly batch generation; 1st of each month, 3 runs/quarter). Compromise between freshness (up to 31 days stale) and fewer observation points than weekly. *Preserved caveat:* Does not eliminate temporal differencing risk for cohorts with $N \ge 5$; residual differencing risk, view access, and export boundaries subsequently resolved and ratified under Entry #49 (`OD-AM-08`) ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)). |
| **Ratified Owner Policy** | Stage 3: Backend execution model & trigger authority | Decision ID `OD-AM-05` | **RATIFIED BY OWNER KIFRY (2026-10-19):** Option A (Automated scheduled generation) approved as preferred execution model, conditional on `OD-AM-07` gate. Vice Director designated as Accountable Operator for monitoring failures and coordinating recovery (Blueprint v3.3 §5.4). *Strict boundary:* Grants no trigger authority, deployment power, or expanded data access (no inferred permissions). System Admin holds no business trigger or approval authority; technical maintenance requires separate authorization ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)). |
| **Ratified Owner Policy** | Stage 3: Failure handling, alerting & recovery requirements | Decision ID `OD-AM-07` | **RATIFIED BY OWNER KIFRY (2026-10-19):** Option C (Mandatory production readiness gate): no unattended production cron until alert delivery is verified, Tab 4 staleness indicator is implemented, and recovery runbook is tested. Requires bounded failure handling with no unbounded retries. *Unresolved gap:* Exact retry classifications (429 handling) and platform retry queuing remain unresolved until validated ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)). |
| **Ratified Owner Policy** | Residual privacy risk, view access & export boundaries | Decision ID `OD-AM-08` | **RATIFIED BY OWNER KIFRY (2026-10-19):** View access limited strictly to Central Academic Lead; Director/Vice Director access omitted unless approved separately; bulk CSV export prohibited for `/academicSummaries`; residual temporal differencing risk for $N \ge 5$ explicitly accepted under documented conditions; $N < 5$ suppression, monthly cadence, and reporting metrics preserved ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)). |

---

## 10. Candidate D Prototype Specification & Phased Feasibility Roadmap (Gates 1–4)

To ensure execution safety and avoid premature commitments to production code, Cloudflare deployments, or unverified architecture, Candidate D feasibility must proceed through four distinct, sequential decision gates:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 1: Local Algorithm Benchmark & Cost-Model Exercise (Indicative Only)   │
│ - Synthetic data in Node.js (N=100..2000)                                   │
│ - In-memory Set deduplication, score bucketing, suppression logic           │
│ - Explicit query-plan cost model                                            │
│ - CANNOT prove: 10ms CPU limit (Error 1102), actual wire reads, retries     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Conducted under approved feasibility scope;
                                       │  technical review before proceeding)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 2: Cloudflare Local Runtime & REST Integration Test (Indicative Only)  │
│ - Gate 2A: runQuery filter, subrequests <= 4, failure classifiers (Miniflare)│
│ - Gate 2B: per-learner weighting, YYYY-MM-DD bounds, stored N<5 concealment,│
│   atomic REST :commit rollback (HTTP 400), 5-path replay idempotency (local)│
│ - Uses Bearer owner bypass (CANNOT verify rules, prod limits, or retries)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Proceed only upon technical review)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 3: Owner Policy & Governance Determinations (Staged Review)            │
│ - Stage 1: Strategic disposition RATIFIED (2026-10-18: Option B staged path)│
│ - Stage 2: Core reporting & privacy policy RATIFIED (2026-10-18)            │
│ - Stage 3: Candidate D execution & readiness RATIFIED (2026-10-19)          │
│ - Tab 4 remains strictly home-campus scoped; Gate 4 strictly blocked        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Proceed only upon Owner Ratification)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 4: Production Implementation & Deployment Authorization                │
│ - Create /academicSummaries collection schema                               │
│ - Update firestore.rules (same-branch read on raw; read on summaries)       │
│ - Tab 4 UI integration                                                      │
│ - Production Cloudflare Worker deployment                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.1 Gate 1 Specification: Local Algorithm Benchmark & Cost-Model Exercise

* **Objective:** Verify in-memory transformation logic and algorithmic scaling on synthetic data, and construct an explicit Firestore query-plan cost model.
* **Authority & Governance Scope:** Gate 1 is conducted strictly within the already approved feasibility-design scope established by Owner Decision [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md), which commissioned feasibility investigation and requires empirical evidence. The executor must **not** describe Gate 1 as a separate owner approval, and it strictly does **not** approve production implementation, rules changes, or deployment.
* **Scope & Location:** Standalone non-production test script (e.g. under `tests/` or `scratch/`).
* **Test Dataset:** Synthetic progress reports generated in memory ($N = 100, 500, 1000, 2000$), covering 4 branches (`kota_gorontalo`, `bone_bolango`, `limboto`, `pohuwato`) and 2 divisions (`courses`, `kindergarten`), with edge cases (sparse cohorts of 1–2 students, unstamped legacy fields, duplicate student entries).
* **Validation Criteria:**
  1. **Algorithmic Correctness:** `distinctLearnersCount` correctly calculated via `new Set(reports.map(r => r.studentId)).size`; scores correctly categorized into 4 performance buckets; average score accurately computed.
  2. **Suppression Branching:** Validates that when distinct learners $< N$ (tested for both $N=3$ and $N=5$), `suppressed: true` is asserted and score buckets/averages are withheld.
  3. **Algorithmic Scaling:** Measures relative scaling across $N=100$ to $N=2000$.
  4. **Explicit Query Plan & Cost Model:** Documents the exact Firestore REST `runQuery` payload structure, field projection masks, and calculates estimated read consumption against the 50,000 daily Spark quota.
* **Explicit Limitations (What Gate 1 CANNOT Prove):**
  1. **Cannot prove the 10 ms Cloudflare CPU limit:** `process.hrtime.bigint()` in Node.js measures elapsed wall-clock time, which includes V8 event loop overhead, garbage collection, and host OS thread scheduling. Node results can compare algorithmic scaling across dataset sizes, but **cannot** establish whether execution fits within Cloudflare’s active isolate CPU limit. Limit exhaustion is Cloudflare **Error 1102** ([limits](https://developers.cloudflare.com/workers/platform/limits/), [errors](https://developers.cloudflare.com/workers/observability/errors/)). Gate 1 results are **indicative only**.
  2. **Cannot confirm actual Firestore wire reads or subrequest counts:** Synthetic data validates data structures and logic; wire reads, pagination overhead, and HTTP request counts remain theoretical estimates until measured in an authorized integration test.
  3. **Cannot verify Cloudflare runtime semantics:** Gate 1 does not execute within `workerd`, does not touch Cloudflare APIs, and cannot verify `controller.noRetry()` behavior.
  4. **Query-Plan vs. Missing-Branch Fallback Mismatch:** The prototype benchmark code assigns reports lacking `branchId` to Kota Gorontalo. However, the proposed query plan uses branch-filtered queries (`where("branchId", "==", branchId)`). In Firestore, branch-filtered queries omit documents missing `branchId` before any in-memory fallback can run. The benchmark tested missing `division`, but does not simulate query-layer branch omission.
  5. **Average is Per-Report, NOT Per-Learner:** In the prototype algorithm, multiple reports for the same learner contribute multiple times to `averageScore` and `scoreBuckets`. While `distinctLearnersCount` deduplicates students via `Set`, the score metrics are report-level, not student-level. The tests establish that the prototype’s chosen rules work as coded, but do not establish whether per-report or per-learner weighting is the appropriate reporting policy (an open governance/reporting design question).
* **Operational Guardrails:**
  - Zero access to production credentials or live Firestore.
  - Zero modifications to production code, `firestore.rules`, or `wrangler.toml`.
  - Zero deployments.

### 10.2 Gate 2 Specification: Non-Production Cloudflare Local Runtime & Firestore REST Integration Test

* **Precondition & Scope:** Technical review following completion of Gate 1. Gate 2 remains a non-production investigation; it does not authorize production deployment or rule changes.
* **Test Environment:** Local Cloudflare-compatible runtime (`workerd` / Miniflare) and a local Firestore emulator or sandboxed non-production project.
* **Validation Criteria & Scope Limitations:**
  1. **Local Isolate CPU Measurement (Indicative):** Empirically measures active isolate CPU time under local `workerd` to evaluate whether transformation logic fits within 10 ms.  
     *Crucial boundary qualification:* Local `workerd` or Miniflare results alone **cannot be described as certifying behavior under Cloudflare's production Free-plan limits** (due to host machine hardware differences, multi-tenant edge scheduling, and production isolate initialization accounting).
  2. **Failure Policy & `controller.noRetry()` Logic Verification:**
     - **Prohibition on Blind Suppression:** Calling `controller.noRetry()` "upon entry" is strictly forbidden, as it suppresses retries for every run, including transient network errors and retryable 5xx errors (503/504).
     - **Deliberate Failure Classification Policy:** Reconciles retry handling with official Firestore REST error guidance:
       * *Deterministic Client / Validation Errors (400, 403, 404):* Fatal client errors (malformed query, schema rejection, permission denial) call `controller.noRetry()` to suppress retries.
       * *Transient Backend Disruption (503, 504, network drops):* Treated as retryable; leaves `controller.noRetry()` uncalled to allow platform backoff retry.
       * *Server Internal Errors (500):* Firestore guidance advises that `INTERNAL` must not be retried more than once. Because Cloudflare Free Cron cannot enforce a single-retry limit, retries are suppressed under a restricted policy (`INTERNAL_RESTRICTED`, `noRetry: true`) to address the possible risk of unconstrained cron loops if the platform retries (a possible risk, not a demonstrated outcome).
       * *Ambiguous Resource Exhaustion (429):* Firestore guidance distinguishes daily quota exhaustion from temporary rate limits. Because REST status codes cannot reliably distinguish the cause and Free Cron cannot schedule delays until midnight PST, retries are suppressed defensively (`noRetry: true`) while the policy remains explicitly **unresolved**, addressing the possible risk of blind retries consuming quota if the platform retries (a possible risk if the platform retries, not a demonstrated outcome); conversely, runs could go stale without an effective notification or recovery path, since alerting has not been verified.
     - **Retry Boundary Qualification:** A local scheduled-handler test can verify whether code invokes `controller.noRetry()` under fatal/restricted/unresolved errors (400, 500, 429) and leaves it uncalled under transient disruption (503). However, **it cannot reproduce Cloudflare's actual platform-level automatic retry behavior, backoff schedule, or queuing following a real scheduled-event failure in production**. Only the HTTP 400 error was tested against a live emulator; the 503, 429, and 500 cases were simulated responses testing classifier logic rather than live platform retries. Platform retry behavior remains explicitly **unresolved** unless demonstrated in an environment capable of reproducing Cloudflare's scheduled-event pipeline.
  3. **Wire Subrequest & Read Count Measurement:** Executes batch `runQuery` requests against Firestore emulator to empirically measure HTTP subrequests ($\le 4$) and documents returned.
  4. **GCP IAM Least-Privilege Audit:** Audits the service account configuration to define least-privilege roles, evaluating the blast radius of credential exposure.

### 10.2.1 Gate 2A Empirical Investigation Results (Completed 2026-10-18)

* **Investigation Script:** [`tests/gate2aLocalWorkerInvestigation.mjs`](file:///e:/myliberty-portal/tests/gate2aLocalWorkerInvestigation.mjs) executed under `firebase emulators:exec --only firestore`.
* **Runtime Environments:** Local Cloudflare `workerd` isolate via Miniflare v5 and local Firestore emulator (`127.0.0.1:8085`).
* **Empirical Measurements Summary:**
  1. **Subrequest Count Compliance:** Exactly 4 HTTP subrequests issued (1 per active branch: Kota Gorontalo, Bone Bolango, Limboto, Pohuwato), well within the 50-subrequest Free tier ceiling ($4 \le 50$).
  2. **Reporting-Period Composite Query Filter Bounding:** The query bounded by reporting period (`where: branchId == B AND examDate >= '2026-10-01' AND examDate <= '2026-12-31'` with `orderBy: examDate DESC`) was verified against the emulator. Out of 102 seeded documents (100 in-period Q4, 2 out-of-period Q3/2027-Q1), exactly 99 were returned. Both out-of-period reports and the 1 unstamped document lacking `branchId` were omitted at the Firestore query layer.
  3. **In-Memory Summary Object Partitioning:** Produced all 5 expected in-memory summary objects (`kota_gorontalo_courses_2026-Q4`, `kota_gorontalo_kindergarten_2026-Q4`, `bone_bolango_courses_2026-Q4`, `limboto_courses_2026-Q4`, `pohuwato_courses_2026-Q4`). *Note:* Summaries were generated as in-memory objects; no writes to Firestore `/academicSummaries` were performed.
  4. **Suppression Enforcement & Policy Sensitivity:**
     - Pohuwato ($N=2$ learners in Q4): Correctly suppressed under both $N<5$ and $N<3$.
     - Bone Bolango ($N=4$ learners in Q4): Correctly suppressed under $N<5$ (`scoreBuckets: null`, `averageScore: null`), but unsuppressed under $N<3$ (`averageScore: 80.0`, score buckets exposed), demonstrating the exact operational trade-off of Decision `OD-AM-02`.
  5. **Duplicate Learner Accounting:** A learner with 3 reports counted as 1 toward `distinctLearnersCount`, while all 3 scores contributed to `totalReportsCount` and score buckets.
  6. **Indicative Isolate Execution Scaling (Measured inside `workerd`):**
     - $N = 100$: Query wall = 36.2ms; Isolate parse = 0.2ms; Isolate aggregation = 0.0ms; Total isolate compute = 0.2ms.
     - $N = 500$: Query wall = 45.0ms; Isolate parse = 0.6ms; Isolate aggregation = 0.4ms; Total isolate compute = 1.0ms.
     - $N = 1000$: Query wall = 71.0ms; Isolate parse = 0.8ms; Isolate aggregation = 0.4ms; Total isolate compute = 1.2ms.
  7. **Real Query-Error Path & Failure Classification Policy:**
     - Normal execution: Completes successfully (`outcome: 'ok'`, `noRetry: false`).
     - Real query error path (live emulator 400 `INVALID_ARGUMENT`): Real non-OK responses from the Firestore REST API flow through `classifyFirestoreError` instead of throwing unhandled exceptions, invoking `controller.noRetry()` (`outcome: 'exception'`, `noRetry: true`).
     - Transient failure (simulated 503 `UNAVAILABLE`): Results in exception outcome (`outcome: 'exception'`), `controller.noRetry()` is NOT called.
     - Ambiguous Quota / Rate limit (simulated 429 `RESOURCE_EXHAUSTED`): Firestore guidance distinguishes project quota exhaustion (e.g. daily Spark 50k read limit) from temporary capacity/rate limiting. Because simple REST responses cannot reliably distinguish whether daily Spark quota is exhausted (where retries are futile until midnight PST) versus a transient burst limit, the retry policy remains explicitly **UNRESOLVED**. In the prototype, retries are suppressed defensively (`controller.noRetry()`) to address the possible risk of repeated cron loops and blind retries consuming quota if the platform retries; both are qualified as possible risks if the platform retries, not demonstrated outcomes, since Cloudflare's actual retry behavior is unverified. Conversely, if retries are suppressed, runs could go stale without an effective notification or recovery path, since alerting has not been verified.
     - Server internal error (simulated 500 `INTERNAL`): Classified under a restricted policy (`INTERNAL_RESTRICTED`, `noRetry: true`) to address the possible risk of cascading retries if the platform retries (a possible risk, not a demonstrated outcome).
     - Blind suppression on entry: Verified that `controller.noRetry()` is NEVER called unconditionally upon entry.
* **Open Findings & Unresolved Boundaries (What Gate 2A CANNOT Certify):**
  1. *Real Query Path Error Handling vs. Simulated Cases Evidence Boundary:* The test verified that live non-OK responses from the Firestore REST endpoint (exercised with a real live emulator 400 `INVALID_ARGUMENT` error) are captured by the batch aggregator and processed by the classification policy. However, the 503, 429, and 500 cases were simulated responses. Those simulated cases test the classifier's internal logic choices inside the worker; they do NOT test live Firestore error behavior under quota/capacity exhaustion or Cloudflare's platform scheduled retry and backoff pipeline.
  2. *Firestore 429 RESOURCE_EXHAUSTED Policy Remains Unresolved:* Firestore REST guidance distinguishes daily/project quota exhaustion (which remains exhausted until midnight Pacific Time) from temporary capacity or rate limiting. A simple HTTP 429 status cannot reliably distinguish between daily quota exhaustion and a momentary rate spike without parsing detailed google.rpc error structures. Marking 429 as universally retryable is unsound because blind retries pose a possible risk of consuming quota or causing futile retry loops if the platform retries (a possible risk, not a demonstrated outcome); marking it fatal drops execution on transient spikes, where runs could go stale without an effective notification or recovery path, since alerting has not been verified. The policy therefore remains unresolved.
  3. *Firestore INTERNAL (500) Retry Restriction Cannot Be Enforced by Cloudflare Free Cron:* Firestore REST API guidance advises that `INTERNAL` (HTTP 500) must not be retried more than once. Cloudflare Workers Cron on the Free plan provides only binary suppression (`controller.noRetry()`) without retry counters, granular per-status backoff schedules, or max-retry limits.
  4. *Platform-Level Scheduled Retry and Backoff Behavior Remains Unresolved:* While the worker throws on retryable errors and calls `controller.noRetry()` on fatal errors, local Miniflare testing **cannot establish whether Cloudflare's platform retry pipeline will actually re-queue or retry the invocation in production, what backoff schedule it follows, or how Error 1102 failures are handled by Cloudflare infrastructure**.
  5. *Cloudflare Free-Plan 10ms CPU Compliance (Error 1102) Remains Indicative Only:* Local host V8 isolate compute times (0.2ms–1.2ms across $N=100..1000$) reflect developer desktop CPU clock speeds. Cloudflare production edge isolates operate under multi-tenant hardware, variable hypervisor load, cold starts, and microsecond CPU metering. Local results cannot certify production compliance.
  6. *Production Firestore Billing and Wire Reads are Unmetered:* Emulator document reads run in local memory without Google Cloud billing meters, index write charges, or network latency.
  7. *In-Memory Summaries Only (Write-Path Untested):* The worker generates summary objects in memory. Writing these objects to Firestore `/academicSummaries` requires transactional batches (`writeBatch`) or staging timestamps to prevent partial writes if an Error 1102 occurs mid-write.
  8. *Production Composite Index Dependency:* The reporting-period query relies on a composite index (`progressReports: branchId ASC, examDate DESC`). While present in `firestore.indexes.json` and emulator, this index must be deployed and verified in production Firestore before queries can execute.
  9. *Score Weighting Policy (Historical Gate 2A Boundary — Subsequently Resolved):* At the time of Gate 2A testing, whether scores should be weighted per-report or per-learner was an open design question. This was subsequently resolved on 2026-10-18 via owner ratification of `OD-AM-06` (Option B: Learner Academic Average; Entry #46).
* **Gate 2A Verdict:** **PARTIALLY DEMONSTRATED WITH OPEN FINDINGS.** The query-window composite filter, JSON deserialization, in-memory Candidate D aggregation logic, subrequest budget ($\le 4 \ll 50$), real query error capture, and failure classification logic function locally in `workerd` and Firestore emulator. However, platform-level retries/backoff, enforcement of single-retry limits for `INTERNAL` errors, unresolved 429 quota exhaustion policy, production 10ms CPU compliance, and the summary write path remain unverified.
* **Advancement Status:** **DO NOT ADVANCE TO NEXT GATE** until a technical review addresses the open findings and Owner Kifry reviews the policy decisions. Tab 4 remains unchanged and home-campus scoped (`kota_gorontalo`).

### 10.2.2 Gate 2A Technical Closeout: Open Findings & Next Steps Analysis

This technical closeout provides an evidence-based assessment of the open findings and boundary limitations identified during the Gate 2A local runtime and emulator investigation. It is strictly **read-only and advisory**, does not authorize any cloud deployments or production changes, and preserves the standing Gate 2A verdict: **Partially demonstrated; do not advance**.

#### 1. Cloudflare Cron Platform-Level Retry and Backoff Behavior (Finding 4)
* **What Gate 2A Evidence Establishes:** In local `workerd` (Miniflare v5), the scheduled event handler code branches correctly: when encountering transient disruption (simulated 503 `UNAVAILABLE`), it allows the exception to propagate (`noRetry` remains uncalled); when encountering fatal or restricted errors (400, 429, 500), it explicitly invokes `controller.noRetry()`.
* **What Remains Unverified or Unresolved:** Local `workerd` does not execute Cloudflare’s production edge Cron Trigger pipeline. It cannot establish whether Cloudflare’s production infrastructure will automatically retry a failed scheduled invocation, what retry schedule or backoff curve is applied on the Free tier, whether retries are queued across edge data centers, or how an active CPU timeout (Error 1102) is classified.
* **Blocker Status for Candidate D:** **Pre-Production Operational Blocker.** Relying on Cloudflare platform retries for transient failure recovery without empirical proof creates operational risk: if Cloudflare Free Cron drops failed runs without retry, runs could go stale without an effective notification or recovery path, since alerting has not been verified; conversely, blind retries or retrying without backoff pose possible risks of consuming quota or subrequests if the platform retries—both are possible risks if the platform retries, not demonstrated outcomes, because Cloudflare's actual retry behavior remains unverified.
* **Resolution Requirement:** Verification via Cloudflare official Cron Trigger documentation, or an authorized empirical test running an unhandled rejection in a sandboxed, non-production Cloudflare Free account.
* **Status & Next Steps:** *Cloud Test Boundary:* Deploying a test Worker or configuring an external Cron Trigger on Cloudflare infrastructure constitutes a cloud deployment and is **strictly outside** the current read-only local scope. This cannot be an immediate action. It remains a **possible future investigative option requiring explicit owner authorization**. The immediate lowest-cost action within current scope is to document the unverified platform behavior and preserve the local test harness ($0).

#### 2. HTTP 500 (`INTERNAL_RESTRICTED`) & 429 (`RESOURCE_EXHAUSTED_UNRESOLVED`) Policy Trade-Offs (Findings 2 & 3)
* **What Gate 2A Evidence Establishes:** The prototype code cleanly traps simulated 500 and 429 responses, categorizing 500 under a restricted single-attempt policy (`INTERNAL_RESTRICTED`, `noRetry: true`) and 429 under an unresolved quota policy (`RESOURCE_EXHAUSTED_UNRESOLVED`, `noRetry: true`). In the prototype, retries are suppressed defensively (`controller.noRetry()`) to address the possible risk of repeated retry loops if the platform retries; this is a possible risk if the platform retries, not a demonstrated outcome, since Cloudflare's platform retry behavior is unverified.
* **What Remains Unverified or Unresolved:**
  - *HTTP 500 Trade-off:* Firestore REST API guidance states that `INTERNAL` errors must not be retried more than once. Cloudflare Free Cron lacks stateful invocation counters or retry ceilings—it provides only binary suppression. Suppressing 500 addresses the possible risk of unconstrained retry loops if the platform retries (a possible risk, not a demonstrated outcome); however, if retries are suppressed, a transient server glitch will cause the scheduled run to abort, and runs could go stale without an effective notification or recovery path, since alerting has not been verified.
  - *HTTP 429 Trade-off:* Firestore guidance distinguishes project quota exhaustion (e.g., reaching the 50,000 daily read Spark ceiling, which remains exhausted until midnight PST) from temporary concurrency rate limits. A standard HTTP 429 status from the REST API does not reliably indicate whether exhaustion is daily or momentary without parsing nested `google.rpc.QuotaFailure` protobuf payloads. If daily quota were exhausted, retrying would be futile, and blind retries pose a possible risk of consuming quota or subrequests if the platform retries (a possible risk if the platform retries, not a demonstrated outcome); conversely, if momentary rate-limiting caused 429, suppressing retries abandons a recoverable run, and runs could go stale without an effective notification or recovery path, since alerting has not been verified.
* **Blocker Status for Candidate D:** **Pre-Production Operational Readiness Gate (Ratified `OD-AM-07` Option C).** For unattended cron, if retries are suppressed, runs could go stale without an effective notification or recovery path, since alerting has not been verified. Conversely, blind retries or unconstrained retries pose possible risks of consuming quota or subrequests if the platform retries; both are possible risks if the platform retries, not demonstrated outcomes, because Cloudflare's actual retry behavior is unverified and alerting has not been demonstrated.
* **Resolution Requirement & Governance Policy (`OD-AM-07`):** On 2026-10-19, Owner Kifry formally ratified Option C as a mandatory prerequisite gate ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)):
  - Unattended production cron is strictly prohibited until alert delivery is verified, the Tab 4 staleness indicator is implemented, and a recovery runbook is established and tested.
  - Requires bounded failure handling with no unbounded retries. Exact retry classifications (e.g. 429 daily quota exhaustion vs transient spikes) and platform retry queuing remain unresolved until platform behavior is validated.
* **Status & Next Steps:** Maintain the defensive suppression policy (`noRetry: true`) in code documentation as a local fallback. Defer production deployment pending Gate 4 operational verification ($0).

#### 3. Production CPU-Limit Compliance & 10ms Uncertainty / Error 1102 (Finding 5)
* **What Gate 2A Evidence Establishes:** In the local host V8 isolate, active compute time (JSON parsing + in-memory Candidate D aggregation) scaled from 0.2 ms ($N=100$) to 1.0 ms ($N=500$) and 1.2 ms ($N=1,000$), well below 10 ms. Total wall-clock time was 36.2–71.0 ms, which represents I/O wait and does not count against CPU limits.
* **What Remains Unverified or Unresolved:** Host workstation clock cycles and isolated single-tenant benchmarks do not reflect Cloudflare's shared multi-tenant edge infrastructure. Edge isolate CPU metering includes microsecond thread accounting, hypervisor context switching, and cold-start compilation overhead. If active CPU exceeds 10.0 ms on the Free plan, Cloudflare immediately terminates the isolate with **Error 1102** ([Cloudflare Limits](https://developers.cloudflare.com/workers/platform/limits/)).
* **Blocker Status for Candidate D:** **Conditional Runtime Blocker (for Gate 4).** If real edge isolate CPU exceeds 10 ms under production conditions, the worker will crash reliably, preventing any summaries from being produced.
* **Resolution Requirement:** If empirical proof of production edge isolate CPU compliance is required before production deployment authorization in Gate 4, that verification would require edge isolate telemetry from live Cloudflare infrastructure. However, **no cloud deployment is needed to complete this documentation review**.
* **Status & Next Steps:** *Cloud Deployment Boundary:* Deploying a test worker or synthetic benchmark endpoint to live Cloudflare infrastructure is a cloud deployment and is **strictly outside** the current read-only, local-only authorization. It is treated strictly as a **hypothetical future investigative option requiring explicit owner authorization, not an approved next step**. No cloud deployment is needed to finish this documentation review; the indicative local Miniflare benchmark measurements (0.2–1.2 ms active compute time) are retained as the algorithmic baseline ($0).

#### 4. The `/academicSummaries` Write Path & Partial-Failure Handling (Finding 7)
* **What Gate 2A Evidence Establishes:** The worker generates all 5 expected partition summary objects in memory (`kota_gorontalo_courses`, `kota_gorontalo_kindergarten`, `bone_bolango_courses`, `limboto_courses`, `pohuwato_courses`) with correct field structures and suppression flags.
* **What Remains Unverified or Unresolved:** Writing summaries to Firestore was excluded from Gate 2A under strict guardrails. Writing documents sequentially via individual HTTP calls (`POST` or `PATCH`) creates a severe partial-failure risk: if the worker encounters an Error 1102, subrequest limit, or network drop after writing 2 of the 5 documents, Tab 4 would display partial, inconsistent, or desynchronized province-wide data.
* **Blocker Status for Candidate D:** **Data Integrity & Architecture Blocker.** Uncontrolled sequential writes violate system integrity invariants and cannot be deployed.
* **Resolution Requirement:** Architectural contract requiring an atomic write mechanism:
  - *Option A (Recommended):* A single atomic Firestore REST `:commit` request containing a batch of all 5 document mutations (`writeBatch` equivalent over REST). This executes as 1 HTTP subrequest and guarantees all-or-nothing atomicity.
  - *Option B:* Versioned partition keys or batch generation timestamps (`generatedAt`) where Tab 4 queries only matching cohort timestamps.
* **Lowest-Cost Practical Next Step:** Formulate the write path as a single atomic REST `:commit` batch request in the local emulator harness; verify that all 5 summaries commit atomically in 1 subrequest ($0).

#### 5. Production Composite-Index Deployment (`branchId ASC, examDate DESC`) (Finding 8)
* **What Gate 2A Evidence Establishes:** The composite query (`where("branchId", "==", B).where("examDate", ">=", start).where("examDate", "<=", end).orderBy("examDate", "DESC")`) executed successfully against the local emulator using definitions from `firestore.indexes.json`.
* **What Remains Unverified or Unresolved:** The index exists in `firestore.indexes.json` (as entry #6) and local emulator state, but has NOT been deployed to the live production Firestore database. In production, executing this query without the deployed composite index will fail immediately with HTTP 400 `FAILED_PRECONDITION`.
* **Repository Configuration vs. Live Deployed Usage:** The repository configuration file [`firestore.indexes.json`](file:///e:/myliberty-portal/firestore.indexes.json) contains **41 composite index definitions**. Cloud Firestore enforces a limit of 200 composite indexes per database on the Spark tier. Crucially, the actual live deployed index count in the production project is unverified, as inspectable live production state is outside this local investigation's scope. If all 41 repository-defined indexes were deployed, they would occupy 41 of the 200 slots (leaving 159). The required index is already authored in the repository configuration; actual live deployment is an infrastructure change strictly reserved for Gate 4.
* **Blocker Status for Candidate D:** **Pre-Deployment Infrastructure Blocker (Gate 4).** Production queries will throw immediate 400 errors until the index is deployed and built.
* **Resolution Requirement:** Execution of `firebase deploy --only firestore:indexes` and confirmation in Firebase Console that the index status is `Enabled`.
* **Lowest-Cost Practical Next Step:** The index is already fully defined in `firestore.indexes.json`. No immediate action; actual live deployment is held for Gate 4 following explicit owner approval ($0).

#### 6. Report-Level versus Learner-Level Score Weighting Policy (Finding 9)
* **What Gate 2A Evidence Establishes:** Gate 2A validated that the prototype algorithm deduplicated learners for the head count (`distinctLearnersCount` via `Set`), but weighted scores per-report (`averageScore` sums all report scores divided by `totalReportsCount`).
* **Governance Resolution (`OD-AM-06`):** On 2026-10-18, Owner Kifry reviewed the policy choice and **RATIFIED Option B (Learner Academic Average)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md). Multiple reports for the same learner within the reporting period are averaged first, and each distinct learner carries an equal weight of 1 in cohort averages and score distribution buckets.
* **Blocker Status for Candidate D:** **Policy Blocker Resolved.** The weighting rule is formally established by owner ratification.
* **Implementation Requirement:** Incorporate learner-level deduplicated averaging into future summary generation prototypes. Adjusting the in-memory algorithm requires ~5 lines of code with zero infrastructure or financial impact ($0).

#### 7. Supporting Verification Boundaries: Error Path & Spark Billing Metering (Findings 1 & 6)
* **Finding 1 (Live Error Path vs. Simulated Statuses):**
  - *Evidence:* Live non-OK response from the Firestore REST endpoint (exercised with live emulator 400 `INVALID_ARGUMENT`) proved that the query loop captures HTTP errors without crashing and routes them through `classifyFirestoreError`.
  - *Unverified:* 503, 429, and 500 were verified via simulated response objects, testing isolate classification logic rather than live Google Cloud error responses.
  - *Blocker Status:* Non-blocking for architecture; operational test boundary only.
  - *Resolution & Next Step:* Maintained as an in-memory regression suite test ($0).
* **Finding 6 (Production Wire Reads & Spark Quota Metering):**
  - *Evidence:* Exactly 4 subrequests returning 99 documents for Q4 (and omitting 3 out-of-period/unstamped records) confirmed the query plan request profile.
  - *Unverified:* Physical Google Cloud Console billing meter increments are unmeasured in the emulator.
  - *Blocker Status:* Non-blocking under modeled assumptions, but subject to qualified scope.
  - *Qualified Read-Cost Assessment:* Total read consumption under modeled assumptions (~100–1,000 progress reports across 4 active branches read on a single weekly cadence) is estimated at ~400–4,000 document reads per month. Under these explicit assumptions, consumption is small relative to the 50,000 daily (1.5M monthly) Spark quota. However, this is a **qualified bounded estimate**, not an absolute guarantee: it does not prove that unpruned multi-year data growth is indefinitely safe without explicit query bounds, nor does it guarantee that concurrent application workflows (e.g. attendance tracking, admissions, real-time client listeners) sharing the same daily 50,000 read limit will not impact or exhaust project quota.
  - *Resolution & Next Step:* Retain bounded query modeling; live metering requires owner authorization for staging telemetry ($0).

---

#### Gate 2A Technical Closeout Matrix

| Finding | Category | Blocker Status for Candidate D | Resolution Requirement | Lowest-Cost Practical Next Step |
| :--- | :--- | :--- | :--- | :--- |
| **Finding 4: Cron Retries/Backoff** | Platform Runtime | **Pre-Production Operational Blocker** | Verify Cloudflare Free Cron retry/backoff behavior | *Possible future investigative step:* Deploy test worker to free Cloudflare account (*Requires explicit owner authorization; outside current read-only scope*). Immediate: local documentation ($0). |
| **Findings 2 & 3: 500/429 Retry Trade-offs** | Failure Policy | **Resolved Policy (`OD-AM-07`)** | Ratified by Owner Kifry (2026-10-19): Option C (Mandatory readiness gate; alert delivery, UI staleness indicator, and recovery runbook required before production cron; bounded retries; see [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)) | Maintain defensive suppression (`noRetry: true`) in code documentation; defer production deployment pending Gate 4 verification ($0). |
| **Finding 5: 10ms CPU / Error 1102** | Platform Runtime | **Conditional Runtime Blocker (for Gate 4)** | Potential future edge isolate telemetry if mandated prior to deployment | Local Miniflare benchmark complete (0.2–1.2 ms indicative). Live cloud testing is a hypothetical future option requiring explicit owner authorization; no cloud deployment needed to complete this review ($0). |
| **Finding 7: `/academicSummaries` Write Path** | Data Architecture | **Data Integrity & Architecture Blocker** | Guarantee atomic all-or-nothing writes across partitions | Architect write path as 1 atomic REST `:commit` batch in local emulator harness (5 writes in 1 subrequest, $0). |
| **Finding 8: Composite Index Deployment** | Database Infrastructure | **Pre-Deployment Infrastructure Blocker (Gate 4)** | Deploy index to production Firestore | Index authored in `firestore.indexes.json` (1 of 41 repo definitions; 200 slot ceiling). Live deployment held for Gate 4 ($0). |
| **Finding 9: Score Weighting Policy** | Academic Governance | **Resolved Policy (`OD-AM-06`)** | Ratified by Owner Kifry (2026-10-18): Option B (Learner Academic Average; see [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)) | Incorporate learner-level deduplicated averaging into future summary generation algorithm ($0). |
| **Finding 1: Simulated vs Live Errors** | Test Methodology | **Non-Blocking (Operational Validation Boundary)** | End-to-end staging test | Retain simulated assertions in local test suite ($0). |
| **Finding 6: Spark Quota Metering** | Cost & Infrastructure | **Non-Blocking (Qualified Bounded Estimate)** | Staging project billing observation (*Requires explicit owner authorization*) | Qualified bounded estimate under weekly modeled assumptions ($0). |

---

#### Gate 2A Closeout Verdict & Next Step Governance

1. **Gate 2A Verdict Reaffirmed:** **PARTIALLY DEMONSTRATED WITH OPEN FINDINGS.** Local execution, query filtering, data partitioning, subrequest budgeting ($\le 4 \ll 50$), and failure classification logic are validated. Platform runtime retries, edge CPU limits, atomic writes, and composite index deployment remain unverified.
2. **Advancement Status Maintained:** **DO NOT ADVANCE TO NEXT GATE.** No deployment to Cloudflare, production Firestore, or security rules changes are authorized.
3. **Owner Policy Decisions & Ratification Status:** Stage 1 strategic disposition (`OD-AM-01`) is **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md) (Option B: staged path). Stage 2 reporting policies are **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md): `OD-AM-06` (per-learner weighting), `OD-AM-03` (quarterly reporting period), `OD-AM-02` (small-cell suppression for $N < 5$), and `OD-AM-04` (staff-submission metrics excluded). Stage 3 execution and readiness policies are **RATIFIED BY OWNER KIFRY (2026-10-19)** under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md): `OD-AM-03` (monthly generation cadence with unresolved $N \ge 5$ privacy choice preserved), `OD-AM-05` (conditional automated schedule with Vice Director designated as Accountable Operator without trigger, deployment, or expanded data permissions), and `OD-AM-07` (Option C mandatory production readiness gate with bounded failure handling).
4. **Production Implementation Remains Gated (Gate 4):** Although Stage 1, Stage 2, and Stage 3 policy directions are formally ratified, Gate 4 (production implementation, rules changes, and cloud deployment) remains strictly blocked pending fulfillment and empirical testing of the `OD-AM-07` readiness prerequisites (verified email alerts, UI staleness indicator, and operational recovery runbook) and explicit owner authorization.
5. **No Cloud Deployments Authorized:** Test Worker deployments, Cron Trigger setups, or live Cloudflare runs remain potential future options subject to explicit owner approval; no cloud deployment is needed or authorized for this documentation review.
6. **Current System State:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains completely unchanged and strictly home-campus scoped (`kota_gorontalo`).

### 10.2.3 Gate 2B Empirical Investigation Results: Local Policy Conformance & Atomic Write Verification (Completed 2026-10-18)

* **Investigation Script:** [`tests/gate2bLocalSummaryInvestigation.mjs`](file:///e:/myliberty-portal/tests/gate2bLocalSummaryInvestigation.mjs) executed under `npx firebase emulators:exec --only firestore`.
* **Runtime Environments:** Local Firestore emulator (`127.0.0.1:8085`) and local Cloudflare `workerd` / Miniflare V8 isolate.
* **Authentication & Security Rules Bypass Disclosure:**
  - All emulator REST operations were executed with administrative credentials (`Authorization: Bearer owner`).
  - **Crucial Boundary Disclosure:** Administrative authentication completely bypasses Firestore security rules (`firestore.rules`).
  - Gate 2B provides empirical evidence of aggregation arithmetic, date filtering, in-memory schema adherence, wire subrequest budgeting, and transactional batch rollback behavior only.
  - **It does NOT and CANNOT verify production authorization contracts, Firestore security rules enforcement, Cloudflare production runtime limits (10ms CPU / Error 1102), platform-level retry behavior, or live alerting.**

* **Empirical Measurements & Check Results (All 8 Checks Passed):**
  1. **Learner-Weighted Averages (`OD-AM-06`):**
     - Evaluated cohort with 1 student having 4 reports (averaging 60.0) and 4 students with 1 report each (90, 80, 75, 85).
     - Confirmed mathematical adherence to *Learner Academic Average*: cohort average computed as $78.0$ (deduplicated learner average), compared to $71.3$ under unweighted event-based averaging.
     - Distribution buckets accurately allocated each unique student once: `below70: 1`, `band70_84: 2`, `band85_100: 2` (total distinct learners = 5).
  2. **Stored Date Format & Boundary Filtering (`OD-AM-03`):**
     - Evaluated exact stored `YYYY-MM-DD` date string comparisons over Firestore REST `runQuery`.
     - Confirmed inclusive capture of Q4 start (`2026-10-01`) and Q4 end (`2026-12-31`), and strict exclusion of Q3 end (`2026-09-30`) and Q1 start (`2027-01-01`).
  3. **Small-Group Suppression & Stored-Data Concealment (`OD-AM-02`):**
     - Evaluated cohort with 6 total reports across $N=4$ distinct learners ($N < 5$).
     - Confirmed suppression in memory (`suppressed: true`, with `averageScore`, `scoreBuckets`, `distinctLearnersCount`, and `totalReportsCount` set to `null`).
     - **Direct Database Read-Back:** After committing the batch to the Firestore emulator, the stored document (`academicSummaries/..._bone_bolango_courses_2026-Q4`) was fetched back via direct HTTP `GET`. Confirmed that `averageScore`, `scoreBuckets`, `distinctLearnersCount`, and `totalReportsCount` are explicitly stored as `null` (`nullValue: null` in Firestore REST JSON). While Decision `OD-AM-02` permits concealing sensitive aggregates via either omission or null representation, the test empirically verified explicit stored `null` values, proving complete concealment in the stored Firestore document without exposing counts or scores.
  4. **In-Memory Schema Whitelist & Staff Metric Exclusion (`OD-AM-04`):**
     - Verified that the in-memory summary object before serialization strictly contains only the 12 approved aggregate fields (`branchId`, `division`, `period`, `periodStartDate`, `periodEndDate`, `distinctLearnersCount`, `totalReportsCount`, `suppressed`, `averageScore`, `scoreBuckets`, `generatedAt`, `aggregationMethod`).
     - Verified complete exclusion of instructor IDs, staff metrics, submission counts, or timeliness metrics.
     - *Scope Boundary:* This check validates the in-memory summary object prior to serialization; it does not independently validate the stored field set across all documents in Firestore.
  5. **Atomic REST `:commit` Batch Write Across 5 Partitions:**
     - Bundled summaries for all 5 active branch/division partitions into a single Firestore REST `:commit` batch subrequest.
     - Empirically confirmed a successful atomic write (HTTP 200) consuming exactly **1 write subrequest**.
     - *Pipeline Budget Context (Modeled Estimate):* Combining the measured 1 write subrequest with the 4 branch read queries (exercised in Gate 2A) yields a modeled pipeline estimate of ~5 external subrequests per run, well within the 50-subrequest Cloudflare Free tier ceiling ($5 \ll 50$). The Gate 2B harness itself exercised 1 query call and 1 commit batch write rather than measuring all four branch queries in a single invocation.
  6. **Transactional Rollback on Failing Database Precondition:**
     - Tested all-or-nothing transactional atomicity. Seeded a known existing document in `/academicSummaries`, then issued a batch with 2 valid partition writes plus 1 write targeting the existing document with a deliberately failing precondition (a stale `currentDocument.updateTime: "2020-01-01T00:00:00.000000Z"`).
     - Confirmed that the Firestore emulator rejected the batch with HTTP 400 `FAILED_PRECONDITION` (`the stored version (...) does not match the required base version (...)`).
     - Verified clean transactional rollback: zero valid writes were committed, and the target document remained unmodified in its initial state.
  7. **Identical-Batch Replay / Idempotency Check:**
     - Replayed the identical batch of 5 partition writes against the emulator.
     - Confirmed that the replay commit succeeded (HTTP 200).
     - Verified by direct key lookup that all 5 expected run-specific document paths were present and addressable (clean deterministic overwrite with zero duplicate documents created).
     - *Boundary Qualification:* Confirms only that the identical batch succeeded and the five expected run-specific paths were present; does not imply the entire collection was counted or that a dropped network response was simulated.
  8. **Indicative Compute Benchmark (Miniflare / Local V8):**
     - Partitioning and computing summaries across all branches in local V8 required $0.20\text{ ms}$ for $N=100$, $0.66\text{ ms}$ for $N=500$, and $1.08\text{ ms}$ for $N=1,000$ synthetic reports.
     - *Boundary Qualification:* Remains indicative desktop V8 compute scaling; does not prove active CPU limit compliance (Error 1102) under Cloudflare production edge infrastructure.
  9. **Scoped Data Isolation & Cleanup:**
     - All seeded and generated documents used unique run prefixes (`gate2b_*`). All 10 tracked test documents were deleted individually at test completion; local collections were preserved without broad wiping.

* **Gate 2B Verdict:** **LOCAL FEASIBILITY DEMONSTRATED; ADVANCEMENT STRICTLY HELD.**
  The investigation confirms that the Stage 2 ratified reporting policies (`OD-AM-06`, `OD-AM-03`, `OD-AM-02`, `OD-AM-04`) can be correctly executed by the aggregation logic, that stored documents fully conceal small-cell data, that partition summary writes can be executed as a single atomic REST `:commit` batch with clean rollback on precondition failure, and that identical batches can be replayed safely. However, because tests ran locally under administrative bypass, Gate 2B provides feasibility evidence only; it does **not** validate production authorization, security rules, Cloudflare runtime limits, or platform retries, and it does **not** approve production implementation or deployment.

### 10.3 Gate 3: Owner Policy & Governance Determinations (Staged Decision Framework)

* **Precondition:** Presentation of empirical Gate 1, Gate 2A, and Gate 2B findings and risk boundaries to Owner Kifry.
* **Recorded Owner Intent (In Principle Only):**
  - Owner Kifry’s intent is recorded as **pursue province-wide academic monitoring in principle**, consistent with the Central Academic Lead / Instructor Leader’s province-wide academic responsibility defined in the Authoritative Blueprint (Blueprint v3.4 §4, §5, §26 G-012).
  - **Strict Governance Boundary:** The initial statement of intent was in principle only; it did not constitute approval of Candidate D, production implementation, Firestore security rule modifications, or cloud deployments. Subsequent policy determinations have since been formally ratified as documented below, while production implementation remains strictly blocked pending Gate 4.
  - **Current System State Maintained:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`) while feasibility investigations and reporting policy design continue.
  - **Decision Status Discipline:** Stage 1 strategic disposition (`OD-AM-01`) is **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md) (Option B: staged path). Stage 2 reporting policies are **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md). Stage 3 execution and readiness policies (`OD-AM-03` monthly cadence, `OD-AM-05` conditional automated schedule, and `OD-AM-07` mandatory production readiness gate) are **RATIFIED BY OWNER KIFRY (2026-10-19)** under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md), subject to explicit operational boundaries, the unresolved $N \ge 5$ privacy choice, and the Gate 4 production authorization gate.

The proposed decisions are partitioned into three sequential, staged determinations:

#### Stage 1: Confirm Desired Monitoring Outcome & Strategic Scope (RATIFIED BY OWNER — 2026-10-18)

*Canonical Decision Record:* [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)

##### Owner Decision Brief: OD-AM-01 — Province-Wide Academic Monitoring Strategic Disposition

* **Decision ID:** `OD-AM-01`
* **Status:** **RATIFIED BY OWNER KIFRY — 2026-10-18 (Option B: Staged Path)**
* **Target Role:** Instructor Leader / Central Academic Lead (`instructorleader`, `instructor_leader`)
* **Governing Blueprint:** Authoritative Blueprint v3.4.1 (§4, §5, §6.11, §15, §16, §19, §26 G-012, §41)
* **Binding Context:** Owner Decision [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md)

###### 1. Question for Owner Kifry
Should MYLIBERTY pursue software-based province-wide academic monitoring for the Central Academic Lead / Instructor Leader, and under what strategic posture?

###### 2. Strategic Context & Governance Problem
The Central Academic Lead based at Kota Gorontalo holds province-wide pedagogical responsibility across all satellite branches (Blueprint §4, §5, §6.11, §26 G-012). However, raw student progress reports (`/progressReports`) are strictly branch-isolated (`isSameBranchStrict`), and Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) is restricted to Kota Gorontalo.

While Candidate D (precomputed partition summaries) has demonstrated local algorithmic and batch write feasibility in Gates 1, 2A, and 2B, significant production operational and infrastructure boundaries remain unverified (Cloudflare edge CPU limits, cron retry behavior, alerting, and security rules authorization).

###### 3. Recommendation: Option B (Recommended Staged Path — Pursue in Principle, Defer Implementation)
**The coding assistant and auditor recommend Option B:**
* Formally confirm the strategic intent to **pursue province-wide academic monitoring in principle**, aligning system evolution with the Central Academic Lead’s pedagogical quality assurance mandate.
* Keep Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) **strictly home-campus scoped** (`kota_gorontalo`) with zero client-side bypasses in the interim.
* **Defer production implementation, Firestore security rules changes, and cloud deployment** until the technical and operational blockers identified in Gate 2 are resolved and explicit owner decisions are rendered on Stages 1 and 3.

> [!IMPORTANT]
> **Explicit Authorization Boundary of Option B:**
> Choosing Option B authorizes **continued feasibility research, architectural planning, and local prototyping ONLY**.
> - It does **NOT** approve Candidate D as the selected permanent architecture.
> - It does **NOT** authorize modifying production code or `firestore.rules`.
> - It does **NOT** authorize deploying Cloudflare Workers, Cron Triggers, or Firebase infrastructure.
> - Production implementation and deployment authorization remain a separate, subsequent decision (Gate 4).

###### 4. Alternatives & Consequences Analysis

| Option | Strategic Posture | Tab 4 System State | Production Code & Rules | Cloud & Financial Risk | Consequence / Trade-off |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option A: Candidate D Conditional Direction** | Select Candidate D as conditional direction | Remains strictly home-campus scoped until separate production authorization | Deferred to Gate 4; no immediate production code or rule changes | Moderate: Narrows architecture to serverless cron before runtime safety is proven | Commits strategically to Candidate D's precomputed summary model before Stage 3 evaluates execution safety or alternatives. Production implementation and deployment remain separate subsequent decisions in Gate 4. |
| **Option B: Staged Path (RECOMMENDED & RATIFIED)** | **Pursue in principle; defer implementation** | **Remains strictly home-campus scoped (`kota_gorontalo`)** | **Zero production changes; planning & local testing only** | **Zero ($0): Preserves Spark free tier and avoids premature lock-in** | **Confirms the pedagogical monitoring mandate without prematurely committing to Candidate D over alternatives (e.g. on-demand or manual triggers). Protects data privacy and system stability while evaluating execution in Stage 3. Production implementation and deployment remain separate subsequent decisions in Gate 4.** |
| **Option C: Decline Portal Implementation** | Reject software-based cross-branch aggregation | Remains permanently home-campus scoped (`kota_gorontalo`) | Zero production changes | **Zero ($0): No infrastructure complexity** | No portal infrastructure cost; province-wide oversight would require ongoing manual out-of-band coordination across satellites, leaving the Instructor Leader's province-wide mandate unassisted in software. |

###### 5. Next Steps Following Owner Ratification
* On 2026-10-18, Owner / Director Kifry formally approved **Option B** (recorded in [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)):
  > “Option B it is: continue pursuing province-wide academic monitoring in principle, keep Tab 4 home-campus-only, and defer production implementation pending the remaining gates.”
* Feasibility design and technical evaluation of Stage 3 execution models will proceed locally ($0), with Tab 4 remaining strictly home-campus scoped.

#### Stage 2: Core Reporting & Privacy Policy Determinations (RATIFIED BY OWNER — 2026-10-18)

*Canonical Decision Record:* [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)

On 2026-10-18, Owner Kifry reviewed the Stage 2 reporting policies and explicitly approved the following durable standards:

1. **`OD-AM-06` (RATIFIED BY OWNER KIFRY — 2026-10-18): Score Weighting Policy**
   - *Ratified Standard:* **Option B (Learner Academic Average).** Average each learner’s reports within the reporting period first, then give each distinct learner equal weight (weight of 1) in division averages and score distribution buckets (`<70`, `70–84`, `85–100`).
   - *Governance Rationale:* Prevents learners who receive multiple evaluations within a quarter from disproportionately skewing division-wide or branch-wide performance indicators relative to learners evaluated once. Zero cost impact ($0).
2. **`OD-AM-03` (RATIFIED BY OWNER KIFRY — 2026-10-18 FOR PERIOD): Reporting Horizon & Cadence**
   - *Ratified Standard (Reporting Period):* **Option A (Fixed Calendar Quarters: Q1–Q4).** Aggregation is bounded by discrete, non-sliding quarterly calendar windows (Q1: Jan 1 – Mar 31, Q2: Apr 1 – Jun 30, Q3: Jul 1 – Sep 30, Q4: Oct 1 – Dec 31). Fixed quarter boundaries avoid continuously overlapping date ranges, reducing some differencing risks without eliminating them (they do not guarantee protection against comparisons across periods or other overlapping summaries).
   - *Important Boundary:* **Generation cadence** was formerly undecided in Stage 2; subsequently ratified as **Option B (Monthly Batch Generation)** on 2026-10-19 under Stage 3 (`OD-AM-03`, Entry #48; [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)), with the open privacy choice regarding cohorts with $N \ge 5$ preserved.
3. **`OD-AM-02` (RATIFIED BY OWNER KIFRY — 2026-10-18): Small-Group Disclosure Suppression Threshold**
   - *Ratified Standard:* **Option A ($N < 5$ Distinct Learners).** Suppress aggregate results (`scoreBuckets` and `averageScore`) whenever fewer than five distinct learners ($N < 5$) are represented in an academic cohort partition (`branchId + division + period`) during the reporting period.
   - *Disclosure Boundary:* Do not expose counts or score details for suppressed groups if those would reveal the small cell. Provides strong defense against casual re-identification in satellite branch communities, acknowledging that small cohorts may display empty.
4. **`OD-AM-04` (RATIFIED BY OWNER KIFRY — 2026-10-18): Staff Submission Tracking Disposition**
   - *Ratified Standard:* **Option A (Exclude Staff Submission Metrics).** Exclude instructor submission metrics (e.g. report counts per instructor, submission recency, or staff-level submission rates) from the academic progress summary (`/academicSummaries`).
   - *Governance Boundary:* Academic progress summaries remain strictly focused on student learning distributions. Any separate staff-tracking proposal requires an independent supervisory inquiry with explicit purpose, access rules, supervisory boundaries, and a separate Owner decision.

#### Stage 3: Candidate D Safety Assessment & Execution Mechanism (RATIFIED BY OWNER KIFRY — 2026-10-19)

*Canonical Decision Record:* [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)

> [!IMPORTANT]
> **Decision Brief Quality Gate & Governance Notice:**
> The following decision briefs document the options analysis, trade-offs, and empirical baselines for Stage 3 execution and operational readiness. On 2026-10-19, Owner / Director Kifry formally ratified the Stage 3 policy direction:
> - **`OD-AM-03` (Cadence):** Monthly batch generation (1st of each month; 3 runs/quarter); explicit caveat that temporal differencing for cohorts with $N \ge 5$ is not eliminated; unresolved privacy choice on additional mitigations explicitly preserved.
> - **`OD-AM-05` (Execution Model & Operator):** Automated scheduled generation approved as preferred execution model, conditional on `OD-AM-07` gate; Vice Director designated as Accountable Operator for operational monitoring and recovery coordination; strictly zero trigger authority, zero deployment authority, and zero expanded data access (no inferred permissions); System Admin holds no business trigger or approval authority; technical maintenance requires separate authorization.
> - **`OD-AM-07` (Mandatory Readiness Gate):** Option C adopted as mandatory production readiness gate (no unattended production cron until alert delivery verified, Tab 4 staleness indicator implemented, and recovery runbook tested); bounded failure handling with no unbounded retries; exact retry classifications (429 handling) and platform retry queuing remain unresolved until validated.
> - **Gate 4 Precondition:** This approval concerns policy direction and documentation only. It does **not** authorize production code changes, rules changes, schema changes, cloud deployment, or broadening Tab 4. Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`).

---

##### Decision Brief: OD-AM-03 — Summary Generation Cadence (RATIFIED BY OWNER KIFRY — 2026-10-19: Monthly Cadence; Unresolved N >= 5 Privacy Choice Preserved)

###### 1. Question for Owner Kifry
At what frequency should precomputed partition summaries be regenerated during an active calendar quarter?

###### 2. Context & Operational Background
Under ratified decision `OD-AM-03 (Reporting Period)` (Entry #46), academic summary aggregation is bounded by fixed calendar quarters (`2026-Q1` through `Q4`). While the quarterly reporting period was ratified first, the frequency at which the background batch pipeline updates partition documents (`branchId + division + period`) during an active quarter was evaluated across concrete options and subsequently ratified as monthly batch generation on 2026-10-19:
- In-progress student evaluations are entered by instructors throughout the teaching term.
- Generating summaries too frequently introduces temporal differencing risks for cohorts of size 5 or greater and repeatedly draws against the daily Firestore read allowance.
- Generating summaries less frequently leaves the dashboard with older data during the teaching term; whether weekly or monthly updates are useful enough to support coaching is an owner determination.

###### 3. Quota, Subrequests, and Workload Baseline
To evaluate options realistically, the operational baseline must reflect official service definitions:
- **Firestore Free Allowance (Firebase Spark):** Strictly **50,000 document reads per day**, resetting daily around **midnight Pacific Time (PT / UTC-8 or UTC-7)** ([Firebase Pricing](https://firebase.google.com/docs/firestore/pricing)). There is **no cumulative monthly quota**.
- **Cloudflare Cron Clocks vs. Firestore Quota Reset:** Cloudflare Cron Triggers execute strictly on **UTC** ([Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)). These two independent clocks must be kept distinct: a job scheduled at 00:00 UTC (08:00 WITA) runs at 16:00 or 17:00 Pacific Time, drawing against the *current* Pacific day's quota before it resets several hours later.
- **Cloudflare Workers Subrequests:** Strictly **50 external subrequests per Worker invocation** ([Cloudflare Limits](https://developers.cloudflare.com/workers/platform/limits/)), NOT per month.
- **Modeled Subrequests per Run:** The modeled Candidate D pipeline issues 4 branch query requests (`:runQuery`) plus 1 atomic partition commit (`:commit`), representing **about five external subrequests per run** (a modeled pipeline estimate) against the 50 subrequests/invocation limit.
- **Modeled Document Read Volume:** Estimated at **~100–1,000 document reads per run across all four branches**. This is a **modeled workload estimate based on synthetic cohort sizes**, NOT a measured wire count or guaranteed quota share. In Firestore, query request count (~4 query subrequests) is distinct from document read volume: every individual progress report document matched and returned by the query directly decrements the daily 50,000 read allowance on the execution day.

###### 4. Privacy Risk: Week-Over-Week Temporal Differencing ($N \ge 5$)
The brief previously suggested that weekly differencing was mitigated by the ratified $N < 5$ suppression rule (`OD-AM-02`). That claim was incorrect and must be qualified:
- **Ratified Rule Scope:** Decision `OD-AM-02` suppresses summary aggregates *only* when fewer than 5 distinct learners are represented in a cohort ($N < 5$).
- **Temporal Differencing Exposure on Cohorts with $N \ge 5$:** For cohorts with 5 or more learners, summaries display unsuppressed averages and score distribution buckets. Repeatedly updating an active quarter's summary week over week enables temporal differencing under specific conditions:
  - *Sixth Learner Deduction:* Under the assumption that the scores of the original 5 learners remain unchanged, an observer who records successive weekly summaries could subtract the Week $W$ sum from the Week $W+1$ sum to deduce the newly evaluated 6th learner's exact score. (If multiple learners are evaluated in the same week or existing scores are revised, algebraic differencing becomes indeterminate without auxiliary data.)
  - *Cohort Average Shifts:* A shift in a fixed-size cohort's average indicates that performance changed, but does *not*, by itself, identify which specific learner's score moved unless external contextual knowledge reveals who was evaluated.
- **Resolution:** Following presentation of the dedicated privacy options analysis, Owner Kifry reviewed candidate mitigations and formally ratified Entry #49 (`OD-AM-08`), explicitly accepting the residual differencing risk for cohorts with $N \ge 5$ under monthly generation while strictly bounding view access to the Central Academic Lead and prohibiting bulk CSV exports ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)).

###### 5. Concrete Options Analysis

| Dimension | Option A: Weekly Batch Generation | Option B: Monthly Batch Generation | Option C: End-of-Quarter Generation Only |
| :--- | :--- | :--- | :--- |
| **Cadence & Timing** | Runs once per week (e.g., Sunday 00:00 UTC / 08:00 WITA). Overwrites active quarter in-place. | Runs once per calendar month (e.g., 1st of each month; 3 updates per quarter). | Runs exactly once at the close of the calendar quarter (4 runs per year). |
| **Data Freshness** | Maximum 7 days stale during active teaching terms (assuming scheduled runs succeed; failed runs or delivery delays make data older). | Up to 31 days stale during active teaching terms (assuming scheduled runs succeed; failures or delivery delays extend staleness). | Completely retrospective; active quarter displays no current-term data. |
| **Update Frequency & Operational Timeliness** | **Most Frequent Updates:** Provides weekly snapshots (max 7 days stale, assuming scheduled runs succeed). Whether frequent in-quarter updates are useful enough to justify the temporal privacy trade-off for cohorts with $N \ge 5$ is an owner decision. | **Monthly Updates:** Provides up to 3 updates per quarter (up to 31 days stale, assuming scheduled runs succeed). Offers fewer observation points than weekly. | **End-of-Quarter:** Retrospective summary generated once at quarter close. Avoids routine in-quarter snapshots (though reruns or data corrections could still create comparisons). |
| **Spark Quota Draw (50,000 reads/day cap resetting PT)** | Modeled workload estimate: **~100–1,000 reads per run** drawn on execution day (draws once per week against that day's 50k limit; ~0.2–2% of that day's quota). | Modeled workload estimate: **~100–1,000 reads per run** drawn once per month against that day's 50k limit. | Modeled workload estimate: **~100–1,000 reads per run** drawn once per quarter against that day's 50k limit. |
| **Cloudflare Subrequests (50/invocation limit)** | Modeled pipeline estimate: **~5 external subrequests per run** (4 queries + 1 commit) against the 50/invocation limit. | Modeled pipeline estimate: **~5 external subrequests per run** against the 50/invocation limit. | Modeled pipeline estimate: **~5 external subrequests per run** against the 50/invocation limit. |
| **Financial Cost** | **No additional cost expected** if existing free-tier limits and alerting features suffice (daily 50,000 read allowance resets around midnight Pacific Time, while Cloudflare Cron runs on UTC). | **No additional cost expected** if existing free-tier limits and alerting features suffice. | **No additional cost expected** if existing free-tier limits and alerting features suffice. |
| **Privacy & Temporal Differencing Risk** | **Open / Unmitigated Risk:** Allows viewers to compare week-over-week snapshots for cohorts with $N \ge 5$. Under stable scoring assumptions, individual additions or movements may be inferred. $N < 5$ suppression does not prevent subtraction across snapshots. | **Lower Risk:** Only 3 observation points per quarter significantly reduces temporal subtraction opportunities. $N < 5$ suppression applies. | **Avoids Routine In-Quarter Differencing:** Avoids routine in-quarter snapshots during active terms (though reruns or data corrections could still create comparisons); macro quarter-over-quarter comparisons remain possible. |
| **Operational Dependency** | Requires active automated cron or weekly manual operator execution. | Requires monthly cron or monthly manual operator execution. | Minimal operational touch (4 runs/year). |

###### 6. Evidence Already Available
- **Gate 1 & Gate 2A:** Verified that query date filtering (`examDate >= startDate && examDate <= endDate`) accurately isolates reports within discrete quarter boundaries.
- **Gate 2B Local Emulator Test:** Verified identical-batch replay idempotency: re-running the batch updates the 5 partition documents in-place via a single REST `:commit` write, without generating duplicate documents or orphan partitions.
- **Request Count Verification:** Gate 2B confirmed that the partition commit requires exactly 1 subrequest write. When combined with 4 branch queries, the modeled pipeline requires about 5 external subrequests per run.

###### 7. What Remains Unverified
- **Actual Read Volume on Production Data:** Document read counts depend on the number of stored progress reports. Whether active queries return 50, 500, or 5,000 documents across all branches has not been measured against live production collections.
- **Satellite Submission Pacing:** Whether satellite instructors enter evaluations continuously each week or bunch them near mid-term and final exam periods.
- **Differencing Mitigation for $N \ge 5$:** No technical mechanism (e.g. noise injection, snapshot freezing, or minimum cohort threshold of 10) has been proposed or evaluated to protect $N \ge 5$ cohorts against weekly subtraction.

###### 8. Reconsidered Advisory Recommendation & Ratified Owner Policy (2026-10-19)
> [!NOTE]
> **Advisory Background (Options Analysis):**
> - **Reporting Freshness as an Owner Choice:** Technical benchmarks, query plans, and cost models alone cannot determine whether weekly or monthly updates are pedagogically necessary or useful. The desired reporting freshness is a fundamental **Owner choice based on organizational need and pedagogical philosophy**.
> - **The Concrete Trade-offs Evaluated:**
>   - **Option A (Weekly):** Delivers the most frequent updates (max 7 days stale, assuming scheduled runs succeed; failed runs or delivery delays make data older) during active teaching terms; whether that update frequency is useful enough to justify the temporal privacy trade-off for cohorts with $N \ge 5$ (under stable scoring assumptions) and weekly draws against the daily 50,000 read allowance (resetting around midnight Pacific Time; modeled estimate: ~100–1,000 reads/run; ~5 subrequests/run) is an owner decision. No additional cost is expected if existing free-tier limits and alerting features suffice.
>   - **Option B (Monthly):** Represents an operational compromise with fewer observation points than weekly that draws against the daily quota only once per month, but leaves data up to 31 days stale during active teaching (assuming scheduled runs succeed; failures or delivery delays extend staleness).
>   - **Option C (End-of-Quarter):** Avoids routine in-quarter snapshots during active terms (though reruns or data corrections could still create comparisons) and draws quota only once per quarter, but is purely retrospective and cannot support within-term quality assurance.

> [!TIP]
> **Ratified Owner Policy — OD-AM-03 Cadence (2026-10-19):**
> - **Ratified Standard:** **Option B (Monthly Batch Generation).** Precomputed partition summaries will be generated monthly (1st of each calendar month, 3 updates per quarter) as an operational compromise between data freshness and fewer observation points than weekly.
> - **Preserved Temporal Differencing Caveat ($N \ge 5$):** Monthly cadence significantly reduces observation points relative to weekly, but **does not eliminate temporal differencing risk for cohorts with $N \ge 5$**. Under stable scoring assumptions, subtracting successive monthly summaries could still reveal newly evaluated student scores.
> - **Resolved Privacy Gate:** The open privacy choice regarding residual temporal differencing for cohorts with $N \ge 5$ was formally evaluated and resolved on 2026-10-19: Owner Kifry approved Entry #49 (`OD-AM-08`), explicitly accepting the residual risk under documented mathematical conditions while restricting view access to the Central Academic Lead and prohibiting bulk CSV exports ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)).
> - **Canonical Decision Record:** [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).
> - **Status:** **RATIFIED BY OWNER KIFRY (2026-10-19).**

---

##### Decision Brief: OD-AM-05 — Backend Execution Model & Trigger Authority (RATIFIED BY OWNER KIFRY — 2026-10-19: Conditional Automated Schedule; Vice Director Accountable Operator)

###### 1. Question for Owner Kifry
How should precomputed summary generation be executed, and if an on-demand manual trigger is supported, which organizational role holds authority to invoke it?

###### 2. Context & Governance Background
Cross-branch academic summaries require reading progress reports across all four branches. However:
- Raw student reports (`/progressReports`) are strictly branch-isolated (`isSameBranchStrict`, Decision #45).
- System Admin is a technical maintenance role with zero business or academic authority (Rule 3).
- Front Office and satellite Division Managers are strictly bound to their local branch (`branchId`) and cannot initiate multi-branch operations.
- The Central Academic Lead / Instructor Leader holds province-wide pedagogical quality assurance responsibility (Blueprint §6.11, §26 G-012), while the Vice Director holds province-wide operational control and multi-branch coordination (Blueprint v3.3 §0, §5.4).

###### 3. Cron Is Not Authority-Free: Security Principal & Accountable Operator
The brief previously described automated Cron as having "zero human authority" and representing the "cleanest governance separation." **That framing is incomplete:**
1. **Privileged Security Principal:** Automated background Cron does not eliminate authority; it delegates execution to a **privileged backend technical security principal** (a Google Cloud service account). This service account holds broad cross-branch read permissions on `/progressReports` and write permissions on `/academicSummaries`, entirely bypassing `firestore.rules`.
2. **Accountable Operator Requirement:** An automated background process cannot operate in an organizational vacuum. There must be an identified organizational role accountable for monitoring operational health, receiving failure alerts, tracking data staleness, and coordinating incident follow-up if the pipeline fails or quota is impacted.
3. **Strict Separation of Accountability from Authority:**
   - **Crucial Boundary:** Designating an Accountable Operator assigns responsibility for operational monitoring and alert follow-up; **it does NOT implicitly grant that person permission to trigger jobs, deploy infrastructure, or expand data access**.
   - *Trigger Authority is Separate:* If manual on-demand triggers are supported, trigger authority is a distinct permission that must be separately assigned by the Owner (Options B1, B2, B3) and does not automatically follow operator designation.
   - *Infrastructure Deployment Authority is Separate:* Deploying Cloudflare Workers, configuring Cron Triggers, or managing cloud credentials remains technical infrastructure work requiring separate authorization and owner approval; the Accountable Operator does not gain deployment privileges.
   - *Data Access Scope is Separate:* The Accountable Operator monitors summary execution and receives alerts, but does **NOT** gain access to raw cross-branch progress reports. Their data access remains strictly bound by their organizational role and branch assignment.
4. **No Authority by Assumption:** Under Blueprint v3.3 §5.4 and Rule 3:
   - System Admin is strictly a technical maintenance role with no business trigger or approval authority over academic summaries; any technical maintenance operations still require separate, explicit authorization.
   - Vice Director holds multi-branch operational control (§5.4).
   - Central Academic Lead holds province-wide pedagogical oversight (§6.11).
   - **Organizational accountability for operating and monitoring the background process cannot be assumed by an engineering agent; accountability must be explicitly owner-assigned, and the Vice Director is the ratified operator for this proposal (OD-AM-05).**

###### 4. Concrete Options Analysis

| Dimension | Option A: Automated Background Cron | Option B: Authorized On-Demand Manual Trigger | Option C: Hybrid Model (Cron + Restricted Break-Glass Manual) |
| :--- | :--- | :--- | :--- |
| **Execution Trigger** | Scheduled Cloudflare Worker Cron Trigger (e.g., weekly or monthly). Unattended execution. | Authenticated HTTP POST endpoint (`/api/academic-summaries/generate`) called from portal UI. | Automated scheduled cron as primary; restricted manual endpoint for exceptional data recovery. |
| **Security Principal** | Elevated GCP Service Account executing in Cloudflare Worker runtime (bypasses `firestore.rules`). | Elevated GCP Service Account invoked via edge API proxy after user authentication. | Elevated GCP Service Account invoked via either scheduled trigger or authenticated endpoint. |
| **Trigger Authority** | **No Interactive UI Button:** Execution is triggered by platform timer. Designates the **Vice Director** as Accountable Operator for operational monitoring and alert follow-up (ratified under OD-AM-05; does not confer trigger authority, deployment power, or expanded data access; Central Academic Lead alternative superseded). | **Explicit Role Authority Required:**<br>- *Sub-Option B1:* Central Academic Lead.<br>- *Sub-Option B2:* Vice Director.<br>- *Sub-Option B3:* Designated Executive Trigger (Director or Vice Director individually).<br>*(System Admin holds no business trigger or approval authority).* | Scheduled cron has no UI trigger; hypothetical manual break-glass trigger would require separate explicit owner assignment. |
| **Quota Runaway & Storm Risk** | Low storm risk (cannot be clicked repeatedly by users), but repeatedly runs on schedule regardless of whether daily 50k quota is already depleted by daytime operations. | High storm risk without strict server-side rate limits: multiple users or rapid clicking could trigger concurrent Firestore scans, exhausting the 50k daily Spark limit. Requires mandatory server-side 24h cooldown. | Low storm risk; cron is predictable, and manual trigger is strictly constrained by a server-side 24-hour cooldown. |
| **Software Attack Surface & Complexity** | **Minimal Surface:** Zero client-side API endpoints, no session token validation in worker, no CSRF handling, no UI trigger buttons. | **Substantial Complexity:** Requires authenticated worker endpoint, Firebase Auth ID token verification in edge worker, role-claim parsing, rate-limiting KV/cooldown state, and audit logging. | **Highest Complexity:** Incurs the full implementation overhead of both automated cron and authenticated manual endpoints. |
| **Financial Cost** | **No additional cost expected** if existing free-tier limits (5 cron triggers) and alerting features suffice. | **No additional cost expected** if existing free-tier limits suffice and rate limits prevent quota storms. | **No additional cost expected** if existing free-tier limits and alerting features suffice. |

###### 5. Strict Authority Prohibitions & Governance Invariants
Regardless of the option selected:
1. **Clarifying "Dual Control" vs. Individual Delegation (Sub-Option B3):**
   - In Blueprint v3.3 §0, §5.4, and Principles 15 & 16, Director and Vice Director hold *complementary control domains* (Director = Strategic Control; Vice Director = Operational Control).
   - "Director or Vice Director" describes one of two possible executive actors (either/or delegation), **not joint control**.
   - If MYLIBERTY were to require an actual *joint control* process (dual-key authorization where both Director and Vice Director must concur before execution), that would require an explicit two-person Maker-Checker workflow definition. Otherwise, B3 represents individual authorization by either executive actor.
2. **System Admin Authority Boundary:** Under Rule 3 and Blueprint §16, System Admin is a technical maintenance role with zero business, supervisory, or pedagogical authority. System Admin holds no business trigger or approval authority over academic summaries, and any technical maintenance still requires separate authorization.
3. **Front Office & Satellite Division Managers Barred:** Front Office and satellite Division Managers are strictly branch-scoped (`branchId`) and have no province-wide execution authority.
4. **Mandatory Cooldown:** Any manual trigger endpoint MUST enforce a server-side minimum 24-hour cooldown between executions to prevent accidental or malicious quota exhaustion.
5. **Explicit Separation of Accountability from Authority:** Designating an Accountable Operator assigns responsibility for monitoring operational health and receiving failure alerts; it does NOT confer authority to manually trigger summary generation, deploy or modify cloud infrastructure, or inspect raw cross-branch student reports.

###### 6. Evidence Already Available
- **Gate 2A in Miniflare:** Verified that Cloudflare Worker `scheduled(event, env, ctx)` handler successfully executes the multi-branch query pipeline without requiring incoming HTTP requests or user tokens.
- **Gate 2B in Firestore Emulator:** Proved that atomic summary commits execute via a single REST `:commit` write under administrative credentials.

###### 7. What Remains Unverified
- **Edge Authentication Pipeline:** Cloudflare Workers Free plan does not natively validate Firebase Auth JWT tokens or custom claims without custom crypto verification code and Google public key fetching, which consumes subrequests and CPU time.
- **Edge Cooldown State:** Managing a distributed 24-hour cooldown on Cloudflare Free without paid Workers KV requires storing timestamps in Firestore or relying on in-memory worker state.
- **Accountable Operator Designation (Resolved by Owner 2026-10-19):** Pre-ratification gap now resolved; Owner Kifry ratified `OD-AM-05` formally designating the Vice Director as Accountable Operator for monitoring pipeline operational health, tracking summary staleness, and coordinating recovery under Blueprint v3.3 §0 and §5.4 (Operational Control).

###### 8. Reconsidered Advisory Recommendation & Ratified Owner Policy (2026-10-19)
> [!NOTE]
> **Advisory Background (Options Analysis):**
> - **Architectural Trade-off:** Automated background cron (Option A) avoids building a complex, edge-authenticated manual execution API and eliminates user-driven quota storms in the UI. However, it requires a privileged service principal with cross-branch read access and requires designating an Accountable Operator for monitoring operational health, tracking staleness, and following up on alerts.
> - **Operational Dependency:** Automated cron (Option A) cannot be considered ready or safe until the failure handling, alerting, and recovery requirements in `OD-AM-07` are fully established.

> [!TIP]
> **Ratified Owner Policy — OD-AM-05 Execution Model & Operator (2026-10-19):**
> - **Ratified Standard:** **Option A (Automated Scheduled Generation).** Automated background cron is approved as the preferred execution model, conditional upon satisfying the `OD-AM-07` readiness gate.
> - **Accountable Operator Designated:** The **Vice Director** is designated as the Accountable Operator for monitoring pipeline operational health, tracking summary staleness, receiving failure notifications, and coordinating recovery actions under Blueprint v3.3 §0 and §5.4 (Operational Control).
> - **Strict Authority Boundaries & Prohibition on Inferred Permissions:**
>   - *Monitoring Accountability Only:* Assigns responsibility for operational health monitoring and recovery coordination only.
>   - *No Trigger Authority:* Does NOT grant authority to manually invoke or trigger summary generation runs.
>   - *No Deployment Authority:* Does NOT grant authority to deploy, configure, or modify Cloudflare Workers, Cron Triggers, credentials, or cloud infrastructure.
>   - *No Expanded Data Access:* Does NOT grant access to raw cross-branch progress reports (`/progressReports`); data access remains strictly bound by existing role permissions and branch boundaries.
>   - *No Inferred Permissions:* No additional permissions, privileges, or claims are granted or inferred.
>   - *System Admin Authority Boundary:* Under Rule 3 and Blueprint §16, System Administrator holds no business trigger or approval authority; any technical maintenance still requires separate authorization.
> - **Canonical Decision Record:** [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).
> - **Status:** **RATIFIED BY OWNER KIFRY (2026-10-19).**

---

##### Decision Brief: OD-AM-07 — Failure Handling, Alerting & Recovery Requirements (RATIFIED BY OWNER KIFRY — 2026-10-19: Option C Mandatory Readiness Gate; Bounded Retries)

###### 1. Question for Owner Kifry
What failure handling, retry constraints, alerting, and recovery requirements must be established before background summary generation can safely operate unattended on the zero-budget tier?

###### 2. Context & Operational Background
Operating unattended background batch processing on free-tier infrastructure poses two critical operational failure risks:
1. **Risk of Uncontrolled Retries & Quota Exhaustion:** Cloudflare documentation describes automated retries for scheduled tasks under certain unhandled failure conditions ([Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)). If a query fails due to quota exhaustion (HTTP 429) or database permission denial (HTTP 403), uncontrolled retries or naive in-worker retry loops could consume thousands of reads, depleting the daily 50,000 Firebase Spark read quota (which resets around midnight Pacific Time) and impacting operations across all branches. However, the exact platform retry behavior remains unverified.
2. **Risk of Silent Staleness & Unnoticed Failure:** If the worker catches errors and blindly suppresses retries via `controller.noRetry()` without active notification, summary generation could fail silently for weeks or months. The Instructor Leader viewing Tab 4 would see outdated data without any indication that the pipeline is broken.

###### 3. Clarifying Safeguard Limits: `noRetry()`, Active CPU Limits, and Alerting Realities
To avoid false security, the operational boundaries of error suppression, CPU constraints, and alerting must be clearly stated:
1. **`noRetry()` Limits Retries, NOT Document Read Volume:**
   - Calling `controller.noRetry()` merely tells the Cloudflare runtime not to automatically retry the scheduled invocation after an error.
   - **It does NOT bound the volume of documents returned by the queries during execution, and it does NOT make the system immune to quota exhaustion.**
   - The planned run issues 4 query requests (`:runQuery`), which count as ~4 external subrequests against Cloudflare's 50 subrequests/invocation limit. However, those 4 queries can return hundreds or thousands of documents depending on the volume of student progress reports in Firestore.
   - Every matching document read directly decrements the daily 50,000 read allowance (resetting at midnight Pacific Time). If queries return 5,000 documents, that single run consumes 10% of the entire day's quota. If the daily quota was already partially depleted by daytime branch operations, the batch run itself can trigger quota exhaustion *before* `noRetry()` is ever reached.
   - `noRetry()` prevents compounding an outage through automatic retry loops, but it does not cap query-result size or protect against large datasets.
2. **Active CPU Limit (10ms) vs. Elapsed Time & Error 1102 Realities:**
   - A sleep or wait increases elapsed wall-clock time while the isolate yields execution, but Cloudflare's 10ms limit on the Free plan measures **active CPU time** ([Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)).
   - Compute-intensive operations—such as repeated JSON parsing, deserialization of large query payloads, schema validation, array filtering, and retry processing—directly consume active CPU cycles.
   - Local Miniflare / V8 benchmarks ($0.2–1.2\text{ ms}$) measure execution under unconstrained local developer hardware and do **NOT** establish that the Worker will stay below the 10ms active CPU limit in Cloudflare's production multi-tenant edge environment.
   - Claims of "zero risk of Error 1102" are unsubstantiated: if an unexpected response size, edge scheduling delay, or repeated retry work pushes active CPU time past 10ms, Cloudflare aborts the isolate immediately with Error 1102, bypassing `catch` blocks and `controller.noRetry()`.
3. **Cron Automatic Retry Behavior Remains Unverified:**
   - The documented `controller.noRetry()` API control merely instructs the runtime not to retry if an invocation fails.
   - However, the existence of `noRetry()` does **not**, by itself, establish which failures Cloudflare's platform automatically retries, when, or how often.
   - If an isolate crashes (e.g. out of memory, or hypervisor CPU kill via Error 1102) before application code calls `noRetry()`, platform-level queuing or retry behavior remains unverified.
4. **Alerting and UI Banners Are Unverified Requirements, NOT Solved Safeguards:**
   - **Cloudflare Email Alerting is Unverified:** While Cloudflare provides general account Notifications ([Cloudflare alert setup](https://developers.cloudflare.com/notifications/get-started/)) supporting email delivery across all plans, and separate in-dashboard error-tracking via Workers Issues ([Workers Issues](https://developers.cloudflare.com/workers/observability/issues/)), **no email alert policies have been configured, tested, or verified for this MYLIBERTY account, and available alert types (e.g. Workers High Error Rate) require live confirmation in the account dashboard**. Alert delivery remains an unverified requirement.
   - **UI Staleness Banner is Passive:** A staleness banner in Tab 4 only informs someone who actively logs in, navigates to Tab 4, and inspects the screen. If staff do not open the dashboard, pipeline failure remains completely undetected.
   - Both mechanisms must be treated as **unverified operational requirements and prerequisites**, NOT established or solved safeguards.

###### 4. Concrete Options Analysis

| Dimension | Option A: Strict Defensive Suppression + UI Staleness Banner + Out-of-Band Alerting | Option B: Bounded In-Isolate Single Retry with Jittered Backoff | Option C: Automated Cron Deployment Gate *(RECOMMENDED PREREQUISITE)* |
| :--- | :--- | :--- | :--- |
| **Error Handling & Retry Behavior** | **Defensive Halt:** Immediately call `controller.noRetry()` on all fatal, quota, and server errors (HTTP 400, 403, 404, 412, 429, 500). Zero automatic application retries. Never loop. (Platform retry behavior if isolate crashes before `noRetry()` runs remains unverified). | **Single Retry:** Attempt exactly 1 in-isolate retry after a 500ms–1000ms delay for transient network blips (HTTP 503/504), then call `controller.noRetry()`. | **Policy Gate:** Explicitly prohibits unattended cron deployment in production until alerting and recovery runbooks are tested and verified. |
| **Quota Exhaustion Protection** | **Prevents In-App Retry Cascades:** Halts on failure to avoid compounding outages. Does NOT bound document read volume or protect against large query result sets (~100–1,000 reads/run modeled). | **Higher Quota Risk:** Consumes additional subrequests and reads on transient failures. Fails if Cloudflare 10ms active CPU limit is breached during repeated parsing or retry processing. | **Operational Assurance:** Prevents deploying unattended automation until quota guardrails and monitoring are empirically proven. |
| **Silent Staleness Defense** | **Passive UI + Unverified Alerts:**<br>1. Every partition doc stores `generatedAt` timestamp.<br>2. Tab 4 UI displays *"Data current as of [Date]"*.<br>3. Under monthly generation, staleness requires an agreed threshold and grace period (e.g. proposed 35 days [31-day cycle + 4-day operational grace period], subject to an explicit Owner decision); prior to establishing that policy and while summaries do not exist, the banner remains completely dormant.<br>4. Cloudflare Worker unhandled exceptions require configured email alerts. | **Weak–Moderate:** Recovers from brief network drops within the run, but still suffers silent staleness if repeated runs fail without active alerting. | **Strong Governance:** Mandates verified alert channels and a documented recovery runbook before production go-live. |
| **Cloudflare CPU Budget (10ms Limit)** | **Consumes Minimal CPU on Error:** Halts immediately on caught error. Local benchmarks showed $<1\text{ ms}$ active CPU for error handlers, but local benchmarks do not establish that the Worker will stay below the 10ms limit in production edge conditions. Hypervisor abort (Error 1102) remains an unverified production risk. | **Elevated CPU Risk:** While waiting/sleeping increases elapsed time without consuming CPU, repeated JSON parsing, response deserialization, and retry processing consume active CPU time, which risks exceeding the 10ms Free tier limit and triggering an uncatchable Error 1102 abort. | **N/A (Policy constraint).** |
| **Financial Cost** | **Expected to remain within the Free plan, subject to account verification** (Free plan limits include 100 Workers and 100,000 req/day; live account plan, current usage, and alert type availability require dashboard confirmation; zero Firestore reads/writes on failure). | **Expected to remain within the Free plan, subject to account verification.** | **Expected to remain within the Free plan, subject to account verification** (policy gate). |

###### 5. Evidence Already Available
- **Gate 2A Error Classifier Verification:** Miniflare tests verified that the error classifier correctly identifies fatal errors (HTTP 400 `INVALID_ARGUMENT`, HTTP 429 `RESOURCE_EXHAUSTED`, HTTP 500 `INTERNAL`) and invokes `controller.noRetry()` while logging structured error payloads.
- **Gate 2B Transactional Rollback:** Firestore emulator tests proved that a REST `:commit` write with an invalid precondition rolls back completely with HTTP 400 `FAILED_PRECONDITION`, leaving zero partially written or corrupted partition documents.
- **Document Metadata:** All partition summaries created in Gate 2B include explicit `generatedAt` ISO timestamps, establishing the data foundation for client-side freshness calculations.

###### 6. What Remains Unverified
- **Cloudflare Account Alert Delivery:** No general Alert notification policies (e.g. Workers High Error Rate routing to email) have been configured or verified in the live Cloudflare dashboard for this account, and available alert types and recipient workflows require live confirmation. (Workers Issues provides in-dashboard error-tracking but is separate from outbound email notifications).
- **Platform-Level Cron Retry Behavior:** The documented `controller.noRetry()` control does not, by itself, establish which failures Cloudflare's platform automatically retries, when, or how often. Behavior when an isolate crashes before `noRetry()` is called remains unverified.
- **Production Edge Active CPU Compliance & Hypervisor Abort (Error 1102):** Cloudflare's 10ms limit measures active CPU time, not elapsed wall-clock time. While waiting/sleeping increases elapsed time without consuming CPU, repeated parsing, deserialization, and retry processing consume active CPU. Local benchmarks do not prove that the Worker will stay below the 10ms limit in production multi-tenant edge environments; Error 1102 aborts terminate the isolate immediately without executing application error handlers or `controller.noRetry()`.
- **Operational Recovery Runbook:** Operational recovery requirements (failure diagnosis, log inspection, and escalation paths) have not been documented in a formal runbook. (Note: Partition mutations and out-of-band batch reruns have no authorized or implemented execution tooling today and cannot be presented as executable operations without defined mechanisms and owner authorization).

###### 7. Reconsidered Advisory Recommendation & Ratified Owner Policy (2026-10-19)
> [!NOTE]
> **Advisory Background (Options Analysis):**
> - **Mandatory Prerequisite Gate (Option C):** Automated background cron must NOT be deployed to production until:
>   1. Email alert delivery from Cloudflare Workers is configured and empirically tested for this account.
>   2. The Tab 4 UI staleness banner is implemented and tested.
>   3. An operational recovery runbook is documented and verified.
> - **Error Handling Posture (Option A):** When and if automated cron is authorized, strict defensive suppression (`controller.noRetry()` on all errors) should be adopted to prevent automated retry cascades, with the clear understanding that `noRetry()` limits retries rather than document read volume (~100–1,000 reads/run), platform-level retry policies remain unverified, and Error 1102 active CPU aborts remain an unverified risk on production edge isolates.

> [!TIP]
> **Ratified Owner Policy — OD-AM-07 Readiness Gate & Retries (2026-10-19):**
> - **Ratified Standard:** **Option C (Mandatory Production Readiness Gate).** Unattended production cron is strictly prohibited until all three prerequisites are met and verified: (1) alert delivery is verified, (2) the Tab 4 staleness indicator is implemented, and (3) an operational recovery runbook is established and tested.
> - **Bounded Failure Handling:** Requires bounded failure handling with **no unbounded retries**. The runtime must never enter unbounded retry loops that risk exhausting daily Firestore read quotas or breaching edge runtime limits.
> - **Unresolved Retry Classifications:** Exact retry classifications (e.g., distinguishing HTTP 429 daily quota exhaustion vs transient rate spikes) and platform retry queuing remain **unresolved** until the remaining platform behavior is validated during Gate 4.
> - **Canonical Decision Record:** [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).
> - **Status:** **RATIFIED BY OWNER KIFRY (2026-10-19).**

---

##### Decision Brief: OD-AM-08 — Residual Privacy Risk ($N \ge 5$), View Access & Export Boundaries (RATIFIED BY OWNER KIFRY — 2026-10-19: Central Academic Lead Only; No CSV Export; Residual Risk Accepted)

###### 1. Question for Owner Kifry
What consumer view access permissions, tabular export boundaries, and privacy safeguards should govern precomputed province-wide academic summaries (`/academicSummaries`), and how should the residual temporal differencing risk for cohorts with $N \ge 5$ be handled?

###### 2. Context & Governance Background
Under Authoritative Blueprint v3.4 §5 and §26 G-012, the Central Academic Lead / Instructor Leader holds province-wide pedagogical quality assurance mandate across all branches, while raw `/progressReports` data access remains strictly branch-isolated ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-scope.md)).

While Stage 2 ratified the $N < 5$ suppression threshold (`OD-AM-02`) and Stage 3 ratified monthly batch generation (`OD-AM-03`, Entry #48), Decision #48 explicitly recorded an unresolved privacy gate: monthly summaries for cohorts with $N \ge 5$ display unsuppressed averages and score distribution buckets, which can permit temporal differencing under specific conditions. Furthermore, consumer view access and export rights for `/academicSummaries` required formal owner determination.

###### 3. The Exposure Mechanism & Mathematical Assumptions
Under ratified Stage 2 policies ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-reporting-policy.md)), cohorts with fewer than 5 distinct learners ($N < 5$) have their aggregates suppressed (`null`). For cohorts with $N \ge 5$, partition summaries publish `studentCount` ($N$), `averageScore` (learner-weighted arithmetic average), and four integer `scoreBuckets`.

**The Mathematical Differencing Formula:**
If Month 1 displays $N_1 = 5$ with average $A_1$ (score sum $S_1 = 5 \cdot A_1$) and Month 2 displays $N_2 = 6$ with average $A_2$ (score sum $S_2 = 6 \cdot A_2$), the newly added learner’s score is deduced by:
$$\text{Score}_6 = S_2 - S_1 = 6 \cdot A_2 - 5 \cdot A_1$$

**Mandatory Conditions Required for This Equation to Hold:**  
This algebraic deduction is valid **only under all of the following strict conditions**:
1. **Single Addition:** Exactly one learner was evaluated and added to the cohort between Month 1 and Month 2 ($N_2 = N_1 + 1$).
2. **Score Invariance:** None of the existing 5 learners had their scores revised, re-tested, or corrected in that interval.
3. **Zero Removals or Withdrawals:** No students withdrew or had their progress reports deleted.
4. **Zero Reclassifications or Transfers:** No students were transferred between classes, branches, or divisions.
5. **No Multi-Student Batching:** If two or more students are evaluated in the same month, $S_2 - S_1$ yields only the aggregate sum of their scores, making individual deduction indeterminate without auxiliary data.

###### 4. Practical Mitigation Proposals & Trade-Offs Evaluated
The following four practical mitigation candidates were analyzed:

1. **Proposal A: Higher Static Suppression Threshold (e.g. $N < 10$) [SUPERSEDED / REJECTED]:**
   - *Proposed Mechanism:* Suppress all aggregates (`averageScore` and `scoreBuckets`) unless a cohort partition contains $\ge 10$ distinct learners.
   - *Why It Does NOT Guarantee Privacy:* Does not eliminate differencing; it merely shifts the mathematical boundary to $N = 10 \rightarrow 11$. Comparing consecutive months with 10 and 11 students reproduces the exact same subtraction vulnerability under the conditions above. Furthermore, small satellite branch cohorts (e.g. illustrative 5–8 learners) would frequently experience dashboard blackouts (empty displays), disabling pedagogical quality monitoring.
   - *Status:* Rejected by Owner Kifry.

2. **Proposal B: Metric Coarsening (Rounded Averages & Percentages) [SUPERSEDED / REJECTED]:**
   - *Proposed Mechanism:* Round averages to broad intervals (e.g. nearest 5 or 10 points) or qualitative tiers, and publish buckets as percentages.
   - *Why It Does NOT Guarantee Privacy:* Rounding introduces an error margin that breaks exact integer subtraction, but does not prevent inference: additions near bin boundaries can still shift rounded bands. Crucially, metric coarsening alters already-ratified reporting standards (`OD-AM-06`) and reduces pedagogical diagnostic utility.
   - *Status:* Rejected by Owner Kifry.

3. **Proposal C: End-of-Quarter Snapshot Freezing (Retrospective Release) [SUPERSEDED / REJECTED]:**
   - *Proposed Mechanism:* Generate partition summaries strictly once per calendar quarter, after quarter close (4 runs/year). Publish zero routine in-quarter monthly summaries to Tab 4 during active teaching terms.
   - *Why It Does NOT Guarantee Privacy:* While it avoids routine in-quarter scheduled snapshots, batch reruns under `OD-AM-07` recovery or out-of-band data corrections still expose comparisons before and after updates. Changing cadence prospectively cannot undo comparisons from monthly snapshots already viewed or exported in prior cycles. Most importantly, it completely eliminates in-term coaching and monitoring utility.
   - *Status:* Rejected by Owner Kifry.

4. **Proposal D: Formal Acceptance of Residual Operational Risk Under Defined Access Boundaries [ADOPTED & RATIFIED]:**
   - *Proposed Mechanism:* Retain ratified $N < 5$ suppression (`OD-AM-02`) and monthly cadence (`OD-AM-03`). Explicitly accept residual temporal differencing risk for cohorts with $N \ge 5$ as an operational reality governed by strict least-privilege view access and bulk export prohibitions.
   - *Status:* Formally ratified by Owner Kifry under Decision #49 ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md)).

###### 5. Evidence Already Available & Narrowed Check Verification
- **Gate 2B Local Emulator Test:** Verified an in-memory 12-field schema whitelist before serialization, confirming student IDs, report IDs, and staff metrics were excluded from the generated summary object. Direct database `GET` read-back verified that sensitive aggregates in a *suppressed* record were persisted as explicit `null`. (Gate 2B did *not* independently inspect every stored field across all unsuppressed documents committed to Firestore).
- **Access Governance Contracts & Blueprint:** Under Authoritative Blueprint §6.11, the Central Academic Lead holds province-wide pedagogical quality assurance responsibility across all branches. Under §11 (Data Scope), §23 (Role Seniority Is Not a Permission Shortcut), and Principle 11 ("access follows legitimate purpose and need-to-know, not seniority"), restricting view access strictly to the Central Academic Lead while omitting Director and Vice Director access adheres strictly to least-privilege principles. In accordance with Rule 3 and Decision #40 (`OD-ADM-01`), System Admin is strictly barred from operational reports. Under Blueprint §15, §19, and Decision #43 (`OD-OPS-02`), disallowing bulk CSV exports prevents automated harvesting.

###### 6. Reconsidered Advisory Recommendation & Ratified Owner Policy (2026-10-19)
> [!NOTE]
> **Advisory Background:**
> Statistical disclosure controls cannot achieve mathematical privacy guarantees against an observer with external contextual knowledge (class rosters, testing dates, or past exports) without completely eliminating small-cohort reporting utility. Acknowledging residual risk transparently and bounding exposure via strict least-privilege view access and export prohibitions provides a governed, honest baseline.

> [!TIP]
> **Ratified Owner Policy — OD-AM-08 Privacy, View Access & Export Boundaries (2026-10-19):**
> - **View Access:** Limited strictly to the **Central Academic Lead** (`instructorleader`). Director and Vice Director access is **not** included unless approved separately by Owner Kifry. System Admin is excluded in accordance with Rule 3 and Decision #40.
> - **Bulk CSV Export:** Strictly prohibited for `/academicSummaries`. Does not alter unrelated reports or existing export policies.
> - **Residual Risk Acceptance:** Owner Kifry explicitly accepts that monthly summaries for cohorts with $N \ge 5$ can still permit temporal differencing under the documented mathematical conditions (single addition, score invariance, zero removals/transfers/batching). This is an explicit operational risk acceptance, **not** a claim that summaries guarantee mathematical privacy.
> - **Preserved Invariants:** $N < 5$ suppression rule (`OD-AM-02`), monthly cadence (`OD-AM-03`), and reporting metrics remain completely unchanged.
> - **Canonical Decision Record:** [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md).
> - **Status:** **RATIFIED BY OWNER KIFRY (2026-10-19).**

---

### 10.3.1 Summary of Ratified Governance Policies for Stage 3 & Privacy (RATIFIED BY OWNER KIFRY — 2026-10-19)

> [!IMPORTANT]
> **Governance Ratification Notice:** On 2026-10-19, Owner / Director Kifry formally ratified the Stage 3 execution and readiness policies under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md) and the residual privacy, view access, and export boundaries under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md). Stage 1, Stage 2, Stage 3, and Privacy/Access policies are now fully ratified by the Owner. Gate 4 remains strictly blocked pending fulfillment of readiness prerequisites and subsequent written owner approval.

1. **`OD-AM-01` (Strategic Implementation Disposition — RATIFIED BY OWNER KIFRY 2026-10-18):**
   - *Ratified Standard:* **Option B (Staged Path).** Continue formally pursuing province-wide academic monitoring in principle to fulfill the Central Academic Lead’s pedagogical mandate (Blueprint §6.11), while keeping Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) strictly home-campus scoped (`kota_gorontalo`). Do not approve production implementation or rule modifications until all operational and governance prerequisites are resolved.
   - *Current Status:* **RATIFIED BY OWNER KIFRY (2026-10-18)** under canonical record [`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md).

2. **`OD-AM-03` (Generation Cadence — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - *Ratified Standard:* **Option B (Monthly Batch Generation).** Precomputed partition summaries will be generated monthly (1st of each calendar month, 3 runs/quarter) as a compromise between data freshness and fewer observation points than weekly. Draws against daily 50,000 read allowance (~100–1,000 reads/run) only once per month. Expected to remain within the Free plan, subject to live account verification.
   - *Preserved Caveat & Resolved Privacy Gate:* Monthly cadence significantly reduces observation points relative to weekly, but **does not eliminate temporal differencing risk for cohorts with $N \ge 5$**. Residual differencing risk, view access, and export boundaries were subsequently evaluated and formally resolved under `OD-AM-08` (Entry #49).
   - *Current Status:* Quarterly period **RATIFIED** (Entry #46); monthly cadence **RATIFIED BY OWNER KIFRY (2026-10-19)** with open privacy choice resolved under `OD-AM-08` ([`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md)).

3. **`OD-AM-05` (Backend Execution Model & Trigger Authority — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - *Ratified Standard:* **Option A (Automated Scheduled Generation).** Automated background cron is approved as preferred execution model, conditional on `OD-AM-07` readiness gate.
   - *Accountable Operator Designated:* The **Vice Director** is designated as the Accountable Operator for monitoring pipeline operational health, tracking summary staleness, receiving failure notifications, and coordinating recovery under Blueprint v3.3 §0 and §5.4 (Operational Control).
   - *Strict Authority Boundaries (No Inferred Permissions):* Operator designation assigns monitoring and recovery coordination accountability only; it does **NOT** grant trigger authority, deployment authority, or expanded data access. In accordance with Rule 3 and Blueprint §16, System Administrator holds no business trigger or approval authority; any technical maintenance still requires separate authorization.
   - *Current Status:* **RATIFIED BY OWNER KIFRY (2026-10-19)** under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).

4. **`OD-AM-07` (Failure Handling, Alerting & Recovery Requirements — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - *Ratified Standard:* **Option C (Mandatory Production Readiness Gate).** Unattended production cron is strictly prohibited until: (1) email alert delivery is verified, (2) the Tab 4 staleness indicator is implemented, and (3) an operational recovery runbook is established and tested.
   - *Bounded Failure Handling:* Enforces bounded failure handling with **no unbounded retries** to protect against Firestore quota exhaustion.
   - *Unresolved Retry Classifications:* Exact retry classifications (e.g. 429 quota exhaustion vs transient spikes) and platform retry queuing remain unresolved until validated during Gate 4.
   - *Current Status:* **RATIFIED BY OWNER KIFRY (2026-10-19)** under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).

5. **`OD-AM-08` (Residual Privacy Risk, View Access & Export Boundaries — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - *Ratified Standard:* **Proposal D (Adopted).** View access on `/academicSummaries` is limited strictly to the Central Academic Lead (`instructorleader`). Director and Vice Director access is not included unless approved separately by Owner Kifry. Bulk CSV export of summary aggregates is strictly prohibited.
   - *Formal Residual Risk Acceptance:* Owner Kifry explicitly accepts that monthly summaries for cohorts with $N \ge 5$ can permit temporal differencing under specific mathematical conditions (single addition, score invariance, zero removals/transfers/batching). Operational risk accepted; no claim that summaries guarantee mathematical privacy.
   - *Preserved Reporting Invariants:* $N < 5$ suppression rule (`OD-AM-02`), monthly generation cadence (`OD-AM-03`), and reporting metrics remain unchanged.
   - *Current Status:* **RATIFIED BY OWNER KIFRY (2026-10-19)** under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md).

### 10.4 Phased Implementation & Deployment Sequence (Phase 3.5 vs. Phase 4)

To resolve the sequencing deadlock between the mandatory readiness prerequisites (`OD-AM-07`) and the strict prohibition on unapproved production code/cloud modifications, implementation must proceed through two distinct, sequentially authorized phases:

#### 10.4.1 Phase 3.5: Limited-Scope Preparatory Authorization (Prerequisite Build & Verification Plan)
* **Precondition:** Explicit written owner approval of this limited preparatory scope.
* **Scope Classification:**
  - **Proposed Changes:** A **local production source-code change** in `src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx` (staging the dormant banner component locally), local documentation updates (drafting the runbook and target contract), and configuring Cloudflare alert notifications in the dashboard.
  - **Strict Deployment Boundary:** **No production hosting deployment, no Firestore rules change, no index deployment, and no cloud scheduled trigger activation.** The local UI change will remain undeployed in the working tree until final Phase 4 authorization.

* **Authorized Preparation Scope (Strictly Bounded):**

  1. **Tab 4 Dormant Staleness Banner (Local Source Code Staging):**
     - *Scope:* Author and test the UI data-currency indicator component in `src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx`.
     - *Reconciliation with Monthly Generation:* Under the approved monthly schedule (`OD-AM-03`), batches generate summaries once per calendar month (1st of each month). A weekly threshold (such as 8 days) would erroneously flag normally scheduled monthly data as stale for up to 23 days of each month. A staleness warning requires an agreed threshold and grace period.
     - *Status of the 35-Day Figure:* The 35-day threshold (31-day calendar month + 4-day operational grace period for batch delivery and retries) is an **illustrative proposal for the Owner's consideration**, NOT an approved policy or implementation default. The banner component must **NOT** hardcode or evaluate 35 days (or any threshold) as an active default prior to explicit Owner approval.
     - *Dormant State & Defensive Contract:* A staleness banner cannot display meaningful data freshness until an authoritative summary source exists and provides a valid `generatedAt` timestamp, and until an agreed staleness threshold policy is established. When `/academicSummaries` does not exist, when partition documents are missing, empty, or `null`, or pending explicit agreement on the staleness threshold:
       - The banner remains **completely hidden / dormant** (renders `null`).
       - It must **not** display a warning, an error message, or present the lack of summaries as a "data failure" or "stale pipeline."
       - It must **not** imply that province-wide monitoring is active or that data failed to load.
       - Tab 4 continues rendering the existing, unaltered home-campus progress reports view as normal (`kota_gorontalo`).
     - *Reader Invariants & WITA Convention:* The eventual `generatedAt` reader must defensively handle stored ISO 8601 strings, Firestore Timestamps (`.toDate()`, `{ seconds }`), and Date objects, and must format display dates using the project's permanent WITA convention (`timeZone: "Asia/Makassar"` per `src/utils/dateWita.js`).
     - *Activation Condition:* The banner is coded to activate only if and when a valid, populated summary document with a recognized `generatedAt` timestamp is retrieved in the future and breaches the owner-decided monthly threshold policy.

  2. **Cloudflare Alert Routing Configuration & Delivery Verification:**
     - *Separation of Alert Mechanisms:*
       - **Cloudflare Notifications (Alerts):** An account-level notification service ([Cloudflare alert setup](https://developers.cloudflare.com/notifications/get-started/)) supporting email delivery across all plans.
       - **Workers Issues:** A separate in-dashboard error-tracking and observability feature ([Workers Issues](https://developers.cloudflare.com/workers/observability/issues/)) that captures and groups uncaught runtime exceptions, distinct from outbound email notifications.
     - *Live Configuration (Option A):* In the Cloudflare dashboard, check available alert types under **Account** $\rightarrow$ **Notifications** $\rightarrow$ **Add Notification** $\rightarrow$ **Workers and Pages** (e.g. *Workers High Error Rate* or available Workers alert type), and configure a policy routing to the Vice Director's email.
     - *Precise Verification Scope & Account Impact:*
       - *Option A (Dashboard Test Action — Delivery Pipeline Only):* After creating the notification policy, use Cloudflare's built-in **"Test"** action on the alert's action menu (`...` menu) to dispatch a sample notification with dummy data. This verifies that Cloudflare's outbound email pipeline reaches the Vice Director's inbox and is not filtered into spam. **Live Impact & Limitation:** While Option A avoids deploying a test Worker, creating an alert policy and sending a test email still modifies live Cloudflare account configuration and notification routes (it is not zero-risk). Furthermore, sample data verifies email transport only; it does **not** prove that a live Worker runtime failure or unhandled exception will trigger the intended alert.
       - *Option B (Empirical Failure Verification via Ephemeral Test Worker — Live Trigger Test):* To empirically prove that a real isolate runtime exception activates the Cloudflare alert policy, deploy an isolated, temporary test Worker (`myliberty-alert-test`) containing a minimal HTTP endpoint (~10 lines) protected by a test token that throws an unhandled exception upon `GET`. After verifying alert delivery, delete the Worker immediately (`npx wrangler delete myliberty-alert-test`).
       - *Strict Gate on Cloudflare Changes:* **Neither Option A nor Option B will be executed, and Cloudflare account settings will NOT be modified, without separate, explicit written authorization from Owner Kifry.**
     - *Cost Baseline:* Expected to remain within the Free plan, subject to live account verification. Documented limits allow up to 100 Workers and 100,000 requests/day, but live account tier, existing multi-project usage, and alert type availability must be confirmed in the dashboard. Zero Firestore reads/writes.

  3. **Operational Recovery Runbook (Documenting Future Recovery Requirements):**
     - *Scope:* Draft `docs/runbooks/academic-summaries-recovery-runbook.md` documenting future operational requirements, failure diagnostic procedures, log inspection steps, and escalation paths for the Accountable Operator.
     - *Clear Separation of Current vs. Post-Deployment Checks:*
       - **Checks Possible Today (Prior to Any Deployment):** Checking Google Cloud Console for daily Spark 50,000 Firestore read allowance consumption, and checking existing Cloudflare account settings and available alert notification types in the Cloudflare dashboard.
       - **Procedures Applying ONLY After Separately Authorized Deployment:** Inspecting `myliberty-academic-summaries` Worker logs and metrics in Cloudflare (no summary Worker exists today), receiving automated failure alerts (no production alert policy exists today), or executing partition repairs.
     - *Honesty on Unimplemented Operations:* The runbook must document future recovery requirements, but must **not** present "clearing stale partitions" or "executing batch reruns" as operations executable today. Because manual trigger endpoints, administrative scripts, and partition mutation permissions are intentionally unimplemented and unauthorized, the runbook will explicitly define what tooling and authorization would be required before those recovery operations could ever be performed.

  4. **Target Authorization Contract Specification (`docs/specs/authorization-contract.md`):**
     - *Scope:* Draft a new subsection (§6.8) in [`docs/specs/authorization-contract.md`](../specs/authorization-contract.md) defining the **Target Authorization Contract (Proposed / Inactive Baseline)** for `/academicSummaries`:
       - *Status Label:* Explicitly labeled as `PROPOSED — INACTIVE PENDING PRODUCTION RULES AUTHORIZATION`. The proposal commits to a direction in principle, but has not approved a permanent architecture change or production access change.
       - *Dual-Collection Architecture:* Distinguish raw student evaluations from derived statistical summaries.
       - *Raw Progress Reports Contract (`/progressReports`):* Retains strict same-branch isolation (`isSameBranchStrict(doc)`). Central Academic Lead has **zero read or write access** to raw evaluation documents from satellite branches (`bone_bolango`, `limboto`, `pohuwato`). Raw documents contain student IDs, names, teacher remarks, and individual exam dates.
       - *Target Summary Contract (`/academicSummaries`):* Province-wide read-only access is granted to the **role-and-branch scope** representing the Central Academic Lead:
         ```javascript
         isInstructorLeader() && userBranch() == 'kota_gorontalo'
         ```
         *(Audience & Role Assignment Controls: In the project's actual user profile model, `userProfile()` reads `/users/{uid}`, and `userBranch()` resolves `branchId: 'kota_gorontalo'` or legacy `branch: 'Kota Gorontalo' / 'Cabang Utama'`. This condition matches any account holding both that role and branch scope; it does not by itself guarantee that only one person holds the position. Enforcing singular occupancy relies on administrative role assignment controls and Maker-Checker staff status workflows under Blueprint §16, §21, and §41. However, this compound rule strictly excludes non-Main-Campus instructor accounts, such as test fixture `ilBoba` with `branchId: 'bone_bolango'`).*
       - *Excluded Roles:* Director and Vice Director read access is explicitly denied (unless separately approved). System Admin read access is denied under Rule 3 and Decision #40.
       - *Client Write Denial:* Client writes (`create`, `update`, `delete`) are strictly `false` (`allow write: if false;`). The specific backend write mechanism remains intentionally unspecified in this target contract until the production architecture is formally approved.
       - *Field Whitelisting & Aggregation Invariants:* Summary documents contain only whitelisted statistical aggregations (`studentCount`, `averageScore`, `scoreBuckets`, `generatedAt`, `dataStaleness`). Zero student IDs, zero report IDs, zero staff metrics. Small cells ($N < 5$) persist explicit `null`.
       - *Export Boundary:* Tab 4 consumer UI strictly prohibits bulk CSV export.

* **Strict Prohibitions During Phase 3.5:**
  - Do **NOT** deploy scheduled Cron Triggers or activate unattended cron in Cloudflare.
  - Do **NOT** deploy the temporary test Worker or modify Cloudflare without separate explicit owner approval.
  - Do **NOT** create live production `/academicSummaries` collection documents.
  - Do **NOT** deploy modified `firestore.rules` or composite indexes to production Firestore.
  - Do **NOT** deploy local UI source-code changes to production hosting.
* **Current Status:** **PENDING LIMITED OWNER AUTHORIZATION (PROPOSED PLAN UNDER REVIEW).**

#### 10.4.2 Phase 4: Production Activation & Scheduled Job Deployment Authorization
* **Precondition:** Successful verification and audit sign-off on all Phase 3.5 readiness prerequisites (`OD-AM-07`), followed by explicit written owner authorization to activate production.
* **Production Activation Scope:**
  - Deploy authored `/academicSummaries` rules in `firestore.rules` (strictly restricted to Central Academic Lead; no client writes; Director/Vice Director denied).
  - Deploy required composite index `progressReports(branchId ASC, examDate DESC)` to production.
  - Connect Tab 4 UI consumer to live `/academicSummaries` collection (with no bulk CSV export).
  - Configure monthly Cron Trigger (`0 0 1 * *`) in Cloudflare and activate unattended production cron.
* **Current Status:** **STRICTLY BLOCKED.** Transition to production implementation, rules modification, and scheduled cloud deployment remains strictly blocked pending fulfillment of Phase 3.5 prerequisites and subsequent written owner authorization. Tab 4 remains unchanged and home-campus scoped.

---

## 11. Pre-Implementation Verification & Governance Checklist

Before any production implementation, security rule modification, or Cloudflare deployment for Candidate D can be authorized, the following items must be verified or decided:

### 11.1 What Remains Unverified (Technical & Operational Gaps)

1. **Authorization Contract Specification Gap for `/academicSummaries`:**
   - While Decision #49 formally ratified the access policy (`OD-AM-08`), the future collection `/academicSummaries` is **not yet defined in the technical authorization contract** ([`docs/specs/authorization-contract.md`](../specs/authorization-contract.md)).
   - No security rules for `/academicSummaries` exist in `firestore.rules`, and no authorization tests under non-admin role tokens have been run (prior Gate 2B emulator tests operated under `Authorization: Bearer owner` administrative bypass). Current documents record approved governance policy, not implemented technical access controls.
2. **Production Edge CPU Compliance (10ms / Error 1102):**
   - Local Miniflare / V8 benchmarks ($0.2–1.2\text{ ms}$) are indicative only.
   - Active isolate execution time under Cloudflare Free plan production multi-tenant edge infrastructure remains unverified.
3. **Platform-Level Cron Retry & Backoff Behavior:**
   - Cloudflare Free platform behavior following scheduled event failures (whether events are automatically retried, retry backoff curves, and Error 1102 handling) has not been empirically proven.
4. **Alerting Delivery & Stale Summary Recovery:**
   - Cloudflare general Alert notification policies (e.g. Workers High Error Rate) and recipient workflows have not been configured or verified in the live Cloudflare dashboard, and available alert types on this account require live confirmation. Workers Issues provides in-dashboard error-tracking but is separate from outbound email notifications.
   - Tab 4 staleness banner is a passive in-dashboard display that does not alert staff if the dashboard is unopened.
5. **Differencing Mitigation for Cohorts with $N \ge 5$ (Resolved Governance Policy):**
   - Owner Kifry has formally accepted the residual temporal differencing risk for cohorts with $N \ge 5$ under monthly generation as an operational risk, rather than claiming mathematical privacy (`OD-AM-08`, Entry #49).
   - *Access Boundary Established:* View access is strictly limited to the Central Academic Lead (`instructorleader`); Director and Vice Director access is omitted unless approved separately; bulk CSV export is strictly prohibited for `/academicSummaries`.
6. **Accountable Operator Designation (Resolved Governance Policy):**
   - The Vice Director has been designated as the Accountable Operator (`OD-AM-05`, Entry #48) for monitoring pipeline operational health, tracking summary staleness, receiving failure notifications, and coordinating recovery under Blueprint v3.3 §0 and §5.4.
   - *Authority Boundary:* This operator designation is strictly bounded to operational monitoring and recovery coordination; it does **NOT** grant trigger authority, deployment authority, or expanded data access.
7. **Production Query Document Volume & Index Deployment:**
   - The required composite index `progressReports(branchId ASC, examDate DESC)` is authored in `firestore.indexes.json` but has not been deployed to live production Firestore.
   - Document read counts over full production student bodies remain an unmeasured estimate (~100–1,000 reads/run).

### 11.2 Required Owner Decisions Before Production Implementation

1. **`OD-AM-01` (Strategic Disposition — RATIFIED BY OWNER KIFRY 2026-10-18):**
   - Formally ratified Option B (staged path): continue pursuing province-wide monitoring in principle, maintain Tab 4 home-campus scoped (`kota_gorontalo`), and defer production implementation pending the remaining gates ([`docs/decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md`](../decisions/2026-10-18-instructor-leader-academic-monitoring-strategic-disposition.md)).
2. **`OD-AM-03` (Generation Cadence — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - Formally ratified Option B (Monthly batch generation; 1st of each calendar month, 3 runs/quarter) under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).
   - Preserves the explicit caveat that temporal differencing for $N \ge 5$ is not eliminated; residual privacy, view access, and export boundaries subsequently resolved under `OD-AM-08`.
3. **`OD-AM-05` (Execution Model & Operator — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - Formally ratified Option A (Automated scheduled generation) as preferred execution model, conditional on `OD-AM-07` gate, under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md).
   - Designates Vice Director as Accountable Operator for monitoring failures and coordinating recovery under Blueprint v3.3 §5.4, with zero trigger authority, zero deployment authority, and zero expanded data access. System Admin holds no business trigger or approval authority; technical maintenance requires separate authorization.
4. **`OD-AM-07` (Mandatory Production Readiness Gate — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - Formally ratified Option C as mandatory prerequisite gate under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-execution-readiness.md): no unattended production cron until alert delivery is verified, Tab 4 staleness indicator is implemented, and recovery runbook is tested.
   - Enforces bounded failure handling with no unbounded retries. Exact retry classifications (429 handling) and platform retry queuing remain unresolved until validated.
5. **`OD-AM-08` (Residual Privacy Risk, View Access & Export Boundaries — RATIFIED BY OWNER KIFRY 2026-10-19):**
   - Formally ratified Proposal D under canonical record [`docs/decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md`](../decisions/2026-10-19-instructor-leader-academic-monitoring-privacy-and-access.md): view access limited strictly to Central Academic Lead; Director/Vice Director access omitted unless approved separately; bulk CSV export prohibited for `/academicSummaries`; explicit acceptance of residual temporal differencing risk for $N \ge 5$ under documented conditions; $N < 5$ suppression rule, monthly cadence, and reporting metrics preserved.
6. **Limited-Scope Preparatory Authorization (Phase 3.5 Gate — SEPARATE OWNER DECISION REQUIRED):**
   - Requires explicit written owner authorization to build and verify the preparatory readiness prerequisites (author passive Tab 4 banner in UI code, configure out-of-band email notifications in Cloudflare dashboard, test recovery runbook, and specify access contract in `docs/specs/authorization-contract.md`), strictly without deploying scheduled cron triggers or production database rules.
7. **Gate 4 Production Activation & Scheduled Deployment Authorization (FINAL PRODUCTION GATE):**
   - Transition to production implementation, rules modification, and scheduled cloud deployment remains **strictly blocked** pending fulfillment of Phase 3.5 readiness prerequisites and subsequent explicit written authorization from Owner Kifry.

*Current Implementation State:* Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`). No production code, rules, or cloud resources have been modified.


