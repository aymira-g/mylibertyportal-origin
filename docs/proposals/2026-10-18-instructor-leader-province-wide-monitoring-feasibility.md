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
  - **Differencing Vulnerability:** An authorized user querying overlapping timeframes (e.g., a 30-day window vs a 31-day window) can algebraically isolate the exact test score of a single student evaluated on the 31st day:  
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
   - If summaries are updated dynamically or re-run mid-cycle, differences between successive snapshots reveal individual learner entries.
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
  - *Estimate:* Scanning 500–1,000 reports once weekly in $\le 4$ REST `runQuery` batches consumes ~500–1,000 reads/week ($\approx 1–2\%$ of the 50,000 daily Spark quota).
  - *Condition & Synthetic Data Limitation:* Synthetic data testing validates aggregation data structures (`Set` deduplication, score bucketing, suppression logic) and estimates costs from an explicit query plan. However, **synthetic data cannot confirm actual Firestore wire reads or subrequest counts**. Cost and subrequest numbers must remain phrased as estimates until a safe, authorized non-production integration test measures them.
  - *Mitigations vs. Guarantees:* Service account REST calls bypass `firestore.rules` and carry project-level GCP IAM blast radius risks (Section 4.2), while small-cell suppression reduces casual disclosure but cannot guarantee anonymity against auxiliary background knowledge in small satellite communities (Section 6).

---

## 8. Open Owner Decisions Table (Staged Decision Framework)

* **Recorded Owner Intent (In Principle Only):** Owner Kifry’s intent is recorded as **pursue province-wide academic monitoring in principle**, consistent with the Central Academic Lead / Instructor Leader’s province-wide academic responsibility defined in the Authoritative Blueprint (Blueprint v3.4 §4, §5, §26 G-012).
* **Strict Governance Boundary:** This statement of intent is in principle only. It does **not** constitute approval of Candidate D, production implementation, Firestore security rule changes, cloud deployment, or any proposed `OD-AM-*` policy choice.
* **Current System State Maintained:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`) while feasibility investigations and reporting policy design continue.
* **Decision Status Discipline:** All items below are **PROPOSED — AWAITING OWNER APPROVAL** and organized into three sequential stages:

### Stage 1: Desired Monitoring Outcome & Strategic Scope

| Decision ID | Question for Owner Kifry | Options | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-01** | **Province-Wide Academic Monitoring Strategic Disposition** | **Option A (Approve Implementation):** Approve implementation of Candidate D precomputed summaries once feasibility benchmarks are validated.<br>**Option B (Recommended Staged Path):** Defer implementation pending policy and feasibility resolution (pursue province-wide monitoring in principle, resolve reporting policy in Stage 2, evaluate Candidate D and alternatives in Stage 3, keep Tab 4 home-campus scoped).<br>**Option C (Decline Portal Implementation):** Decline software-based portal aggregation entirely and maintain permanent home-campus portal scope, relying on manual out-of-band coordination. | Option A commits to software-based oversight once validated. Option B avoids forcing a false binary choice between premature architectural commitment and abandoning monitoring. Option C incurs zero code and zero cost, relying on manual coordination. | **PROPOSED — AWAITING OWNER APPROVAL** |

### Stage 2: Core Reporting & Privacy Policy Determinations

| Decision ID | Question for Owner Kifry | Options | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-06** | **Score Weighting Policy** | **Option A:** Assessment Event Average (per-report).<br>**Option B:** Learner Academic Average (per-learner deduplicated). | Option A weights every report equally (learners tested multiple times have greater weight). Option B averages multiple reports per student first so each unique learner carries equal weight. Zero infrastructure cost difference ($0). | **PROPOSED — AWAITING OWNER APPROVAL** |
| **OD-AM-03** | **Reporting Horizon & Cadence** | **Option A:** Fixed Calendar Periods (Monthly or Quarterly).<br>**Option B:** Rolling Horizon (e.g. Last 30 Days). | Option A aggregates over discrete calendar windows, preventing sliding-window queries. Option B provides rolling recency but introduces overlapping-window differential risks. | **PROPOSED — AWAITING OWNER APPROVAL** |
| **OD-AM-02** | **Small-Cell Suppression Threshold** | **Option A:** Threshold $N < 5$ distinct learners.<br>**Option B:** Threshold $N < 3$ distinct learners. | Option A suppresses cohorts with $<5$ learners, offering stronger protection in satellites at the cost of frequent empty displays. Option B exposes cohorts with 3–4 learners at higher re-identification risk. Neither threshold guarantees anonymity against auxiliary background knowledge. | **PROPOSED — AWAITING OWNER APPROVAL** |
| **OD-AM-04** | **Staff Submission Tracking Disposition** | **Option A:** Exclude staff submission metrics from academic summary.<br>**Option B:** Address staff submission tracking through a separate, dedicated inquiry. | Option A keeps summaries focused purely on student progress. Option B addresses staff compliance through an independent supervisory inquiry with explicit access boundaries, avoiding conflating staff metrics with student scores. | **PROPOSED — AWAITING OWNER APPROVAL** |

### Stage 3: Candidate D Safety Assessment & Execution Mechanism

| Decision ID | Question for Owner Kifry | Options | Governance / Privacy / Cost Consequence | Status |
|---|---|---|---|---|
| **OD-AM-05** | **Backend Execution Model & Trigger Authority** | **Option A:** Prototype automated execution via Cloudflare Worker Cron on Free plan.<br>**Option B:** On-demand manual trigger mechanism (trigger authority, execution frequency, and invocation boundaries undecided pending explicit Owner decision). | Option A tests automated background execution within 10ms CPU and 50-subrequest limits, contingent on failure constraint `OD-AM-07`. Option B avoids background cron risks but leaves trigger authority undecided until explicitly decided by Owner Kifry. | **PROPOSED — AWAITING OWNER APPROVAL** |
| **OD-AM-07** | **Automated Failure Recovery & Retry Design Constraint** | **Design Constraint:** Defer automated Cron execution until bounded retry behavior, failure notification, and recovery paths are demonstrated; otherwise, consider manual execution only after Owner Kifry decides which organizational role has authority to trigger it. | Free Cron lacks demonstrated retry ceilings and verified alerting; running with retries suppressed risks silent staleness, while unconstrained platform retries pose potential quota exhaustion risks if the platform retries. Neither path is approved. | **PROPOSED — AWAITING OWNER APPROVAL** |

---

## 9. Comprehensive Evidence & Uncertainty Matrix

In accordance with the Decision Brief Quality Gate, the following matrix categorizes all evidence supporting this study:

| Category | Evidence Item / Claim | Source / Documentation | Verification Status |
|---|---|---|---|
| **Verified Repository Fact** | Raw report reads restricted to same branch in local rules | [`firestore.rules:1324, 1336`](file:///e:/myliberty-portal/firestore.rules#L1324) | Verified locally in prior test run; 177 emulator tests pass. |
| **Verified Repository Fact** | Staff profiles and classes are strictly branch-isolated | [`firestore.rules:859, 977`](file:///e:/myliberty-portal/firestore.rules#L859) | Verified in code and prior test suite (`isSameBranchStrict`). |
| **Verified Repository Fact** | No scheduled cron triggers or background workers exist | [`cloudflare-worker/wrangler.toml`](file:///e:/myliberty-portal/cloudflare-worker/wrangler.toml) | Verified: `wrangler.toml` and `worker.js` have no cron configurations. |
| **Verified Repository Fact** | Tab 4 is home-campus scoped with documented missing evaluation subsystem | [`AcademicProgressLeader.jsx:201–218`](file:///e:/myliberty-portal/src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx#L201) | Verified in component source. |
| **Official Service Limit** | Cloudflare Workers Free CPU time limit is strictly 10ms (limit exhaustion is Error 1102) | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/), [Errors](https://developers.cloudflare.com/workers/observability/errors/) | Confirmed: 10ms CPU limit per invocation applies to Cron Triggers on Free plan; exhaustion throws Error 1102. |
| **Official Service Limit** | Cloudflare Workers Cron wall-clock duration is up to 15 minutes | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Confirmed: Cron Triggers permit up to 15 minutes of wall-clock duration (separate from the 10ms CPU limit). |
| **Official Service Limit** | Cloudflare Workers Free subrequest limit is 50 | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Confirmed: Max 50 external `fetch()` calls per invocation. |
| **Official Service Limit** | Cloudflare Workers Free Cron Triggers limit is 5 per account | [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Confirmed: 5 Cron Triggers per account across all Workers. |
| **Official Service Limit** | Firebase Spark Plan quota is 50,000 document reads/day | Firebase Official Pricing Documentation | Confirmed: Free tier daily read cap. |
| **Official Service Limit** | Firestore aggregations charge 1 read per up to 1,000 index entries | Google Cloud Firestore Pricing Documentation | Confirmed: Index scan pricing rule. |
| **Estimate (Subject to Measure)** | Candidate C read consumption (~10 reads/load) | Query count calculation ($5 + 5$) | Assumes $<1,000$ index entries matched per query. |
| **Estimate (Subject to Measure)** | Candidate D batch read consumption (~500–1,000 reads/week) | Report volume assumption & query plan | Assumes periodic structured `runQuery` batches over active cohorts. Synthetic data tests query plans and logic but cannot confirm actual wire reads or subrequest counts. |
| **Assumption (Unproven)** | Report aggregation fits within 10ms Cloudflare CPU time | Theoretical JSON parsing budget | **Unproven (Indicative Node Benchmark Only):** Deserialization & hashing in V8 may exceed 10ms. A local Node benchmark measures elapsed time via `process.hrtime.bigint()`, which cannot prove active isolate CPU time or prevent Error 1102. Furthermore, local `workerd` or Miniflare test results alone cannot certify behavior under Cloudflare's production Free-plan limits. |
| **Assumption (Unproven)** | Cloudflare Cron automatic retry behavior and `controller.noRetry()` semantics | [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) | **Unverified:** Cloudflare documents `controller.noRetry()` to suppress retries; blind suppression "upon entry" is an anti-pattern. While a local test can check whether code invokes `controller.noRetry()`, it cannot reproduce Cloudflare's actual automatic retry behavior or backoff following a real scheduled failure in production. Platform retry behavior remains unresolved. |
| **Assumption (Unproven)** | Service account GCP IAM roles and permissions | Google Cloud Console IAM | **Unverified:** The actual IAM roles granted to the service account in GCP are unverified from repository artifacts alone. Bypasses `firestore.rules`. |
| **Assumption (Unproven)** | Live Cloudflare account alert notifications and Workers Issues setup | Cloudflare Dashboard | **Unverified:** Live account configuration, failure destinations, and alerting automations are not documented in repository artifacts. |
| **Assumption (Unproven)** | Live deployed rules match repository rules source | Local working tree | **Unverified:** Firebase production deployment state has not been inspected. |
| **Unresolved Owner Decision** | Stage 1: Strategic implementation disposition | Decision ID `OD-AM-01` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; awaiting completion of feasibility and policy review. |
| **Unresolved Owner Decision** | Stage 2: Score weighting policy | Decision ID `OD-AM-06` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; per-report vs per-learner weighting awaiting Owner Kifry's review. |
| **Unresolved Owner Decision** | Stage 2: Reporting horizon and cadence | Decision ID `OD-AM-03` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; calendar period vs rolling window awaiting Owner Kifry's review. |
| **Unresolved Owner Decision** | Stage 2: Small-cell suppression threshold ($N$) | Decision ID `OD-AM-02` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; $N < 5$ vs $N < 3$ threshold awaiting Owner Kifry's review. |
| **Unresolved Owner Decision** | Stage 2: Staff submission tracking disposition | Decision ID `OD-AM-04` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; exclusion vs separate inquiry awaiting Owner Kifry's review. |
| **Unresolved Owner Decision** | Stage 3: Backend execution model & trigger authority | Decision ID `OD-AM-05` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; automated cron vs manual trigger with trigger authority undecided. |
| **Unresolved Owner Decision** | Stage 3: Automated failure recovery design constraint | Decision ID `OD-AM-07` | **PROPOSED — AWAITING OWNER APPROVAL:** Open; defer automated cron until bounded retry and recovery demonstrated. |

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
│ - Local workerd / Miniflare test harness                                    │
│ - Local isolate CPU measurement (CANNOT certify production Free limits)     │
│ - Unit check for controller.noRetry() (platform retry behavior unresolved)  │
│ - Measure REST runQuery subrequests (<= 4) against non-prod Firestore       │
│ - Audit service account GCP IAM permissions (least-privilege review)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Proceed only upon technical review)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 3: Owner Policy & Governance Determinations (Staged Review)            │
│ - Stage 1: Confirm monitoring outcome & scope (pursue in principle)         │
│ - Stage 2: Core reporting & privacy policy (OD-AM-06, 03, 02, 04)           │
│ - Stage 3: Candidate D safety & execution assessment (OD-AM-05, 07)         │
│ - All items PROPOSED — AWAITING OWNER APPROVAL; Tab 4 remains unchanged     │
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
  9. *Score Weighting Policy Remains Open:* Multiple reports for the same student contribute multiple scores to the average and score buckets. Whether scores should be weighted per-report or per-learner remains an unresolved owner reporting design decision.
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
* **Blocker Status for Candidate D:** **Reliability & Operational Architecture Blocker (Unresolved Design Constraint: Proposed `OD-AM-07`).** For an unattended weekly cron, if retries are suppressed, runs could go stale without an effective notification or recovery path, since alerting has not been verified. Conversely, blind retries or unconstrained retries pose possible risks of consuming quota or subrequests if the platform retries; both are possible risks if the platform retries, not demonstrated outcomes, because Cloudflare's actual retry behavior is unverified and alerting has not been demonstrated.
* **Resolution Requirement:** Address the operational failure and recovery design constraint (Proposed `OD-AM-07`), kept distinct from the trigger-authority decision in `OD-AM-05`:
  - **Proposed Framing:** Defer automated Cron execution until a bounded retry and verified failure-notification/recovery approach is demonstrated; otherwise, consider manual execution only after Owner Kifry decides which organizational role has authority to trigger it.
  - Neither execution path (automated cron or manual triggering) is currently approved, and this constraint remains an open design determination.
* **Status & Next Steps:** Maintain the defensive suppression policy (`noRetry: true`) in code documentation as a local fallback. Keep the failure-recovery constraint (`OD-AM-07`), trigger authority (`OD-AM-05`), and execution model explicitly unresolved for owner determination ($0).

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
* **What Gate 2A Evidence Establishes:** Gate 2A validated that the algorithm deduplicates learners for the head count (`distinctLearnersCount` via `Set`), but weights scores per-report (`averageScore` sums all report scores divided by `totalReportsCount`, and score distributions categorize every report).
* **What Remains Unverified or Unresolved:** Whether academic leadership intends for students with multiple evaluations within a quarter to have their scores averaged first per-student, or if every progress report should carry equal weight in province-wide averages. For example, if a struggling student is tested 4 times in a quarter, their low scores count 4 times in the division average.
* **Blocker Status for Candidate D:** **Governance & Academic Policy Blocker (Explicit Owner Decision Required: Proposed `OD-AM-06`).** Weighting policy is an independent reporting design decision. It must **not** be conflated with `OD-AM-02` (which specifically governs small-cell suppression thresholds: $N < 5$ vs $N < 3$). Weighting requires its own distinct owner determination.
* **Resolution Requirement:** Explicit Owner Decision (`OD-AM-06`) selecting between "Assessment Event Average" (per-report) or "Learner Academic Average" (per-student).
* **Lowest-Cost Practical Next Step:** Present the mathematical difference to Owner Kifry during Gate 3 review as an explicit decision item (`OD-AM-06`); adjusting the algorithm in memory requires ~5 lines of code with zero infrastructure or financial impact ($0).

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
| **Findings 2 & 3: 500/429 Retry Trade-offs** | Failure Policy | **Reliability & Governance Blocker** | Proposed `OD-AM-07`: Unresolved failure-recovery design constraint (defer automated cron until bounded retry/recovery demonstrated; otherwise consider manual execution only after deciding trigger authority) | Maintain defensive suppression (`noRetry: true`) in code documentation; keep failure-recovery constraint (`OD-AM-07`) and trigger authority (`OD-AM-05`) explicitly unresolved ($0). |
| **Finding 5: 10ms CPU / Error 1102** | Platform Runtime | **Conditional Runtime Blocker (for Gate 4)** | Potential future edge isolate telemetry if mandated prior to deployment | Local Miniflare benchmark complete (0.2–1.2 ms indicative). Live cloud testing is a hypothetical future option requiring explicit owner authorization; no cloud deployment needed to complete this review ($0). |
| **Finding 7: `/academicSummaries` Write Path** | Data Architecture | **Data Integrity & Architecture Blocker** | Guarantee atomic all-or-nothing writes across partitions | Architect write path as 1 atomic REST `:commit` batch in local emulator harness (5 writes in 1 subrequest, $0). |
| **Finding 8: Composite Index Deployment** | Database Infrastructure | **Pre-Deployment Infrastructure Blocker (Gate 4)** | Deploy index to production Firestore | Index authored in `firestore.indexes.json` (1 of 41 repo definitions; 200 slot ceiling). Live deployment held for Gate 4 ($0). |
| **Finding 9: Score Weighting Policy** | Academic Governance | **Academic Governance Blocker (`OD-AM-06`)** | Explicit Owner Decision (`OD-AM-06`) on score weighting policy (distinct from `OD-AM-02`) | Present formula comparison to Owner Kifry in Gate 3 as separate decision item ($0). |
| **Finding 1: Simulated vs Live Errors** | Test Methodology | **Non-Blocking (Operational Validation Boundary)** | End-to-end staging test | Retain simulated assertions in local test suite ($0). |
| **Finding 6: Spark Quota Metering** | Cost & Infrastructure | **Non-Blocking (Qualified Bounded Estimate)** | Staging project billing observation (*Requires explicit owner authorization*) | Qualified bounded estimate under weekly modeled assumptions ($0). |

---

#### Gate 2A Closeout Verdict & Next Step Governance

1. **Gate 2A Verdict Reaffirmed:** **PARTIALLY DEMONSTRATED WITH OPEN FINDINGS.** Local execution, query filtering, data partitioning, subrequest budgeting ($\le 4 \ll 50$), and failure classification logic are validated. Platform runtime retries, edge CPU limits, atomic writes, and composite index deployment remain unverified.
2. **Advancement Status Maintained:** **DO NOT ADVANCE TO NEXT GATE.** No deployment to Cloudflare, production Firestore, or security rules changes are authorized.
3. **Owner Policy Decisions Unresolved:** Decisions `OD-AM-01` through `OD-AM-07` remain open determinations for Owner Kifry in Gate 3, organized into three sequential stages (Stage 1: outcome & scope; Stage 2: reporting & disclosure policy; Stage 3: technical execution & failure recovery). All decisions are **PROPOSED — AWAITING OWNER APPROVAL**; none are approved or ratified by recording the owner's intent to pursue monitoring in principle.
4. **Trigger Authority & Failure Recovery Kept Distinct:** Under `OD-AM-05`, whether execution is automated cron or manual trigger—and if manual, which organizational role holds trigger authority—remains explicitly undecided until Owner Kifry explicitly decides it. Proposed `OD-AM-07` represents the unresolved automated failure & recovery constraint (defer automated Cron until bounded retry and recovery/alerting are demonstrated; otherwise consider manual execution only after deciding who has authority to trigger it). Neither execution path is approved.
5. **No Cloud Deployments Authorized:** Test Worker deployments, Cron Trigger setups, or live Cloudflare runs remain potential future options subject to explicit owner approval; no cloud deployment is needed or authorized for this documentation review.
6. **Current System State:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AcademicProgressLeader.jsx)) remains completely unchanged and strictly home-campus scoped (`kota_gorontalo`).

### 10.3 Gate 3: Owner Policy & Governance Determinations (Staged Decision Framework)

* **Precondition:** Presentation of empirical Gate 1 and Gate 2A findings and risk boundaries to Owner Kifry.
* **Recorded Owner Intent (In Principle Only):**
  - Owner Kifry’s intent is recorded as **pursue province-wide academic monitoring in principle**, consistent with the Central Academic Lead / Instructor Leader’s province-wide academic responsibility defined in the Authoritative Blueprint (Blueprint v3.4 §4, §5, §26 G-012).
  - **Strict Governance Boundary:** This statement of intent is in principle only. It does **NOT** constitute approval of Candidate D, production implementation, Firestore security rule modifications, cloud deployments, or any proposed `OD-AM-*` policy choice.
  - **Current System State Maintained:** Tab 4 ([`AcademicProgressLeader.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AcademicProgressLeader.jsx)) remains strictly home-campus scoped (`kota_gorontalo`) while feasibility investigations and reporting policy design continue.
  - **Decision Status Discipline:** All decision items below are **PROPOSED — AWAITING OWNER APPROVAL**. None are marked approved, accepted, or ratified based on this instruction.

The proposed decisions are partitioned into three sequential, staged determinations:

#### Stage 1: Confirm Desired Monitoring Outcome & Strategic Scope
* **`OD-AM-01` (PROPOSED — AWAITING OWNER APPROVAL): Province-Wide Academic Monitoring Strategic Disposition**
  - *Context:* Avoids forcing a false binary between prematurely approving an unverified architecture and permanently abandoning province-wide academic monitoring.
  - *Option A (Approve Candidate D Implementation):* Approve implementation of the Candidate D precomputed summary architecture once all feasibility benchmarks, runtime limits, and technical blockers are fully resolved.
  - *Option B (Recommended Staged Path — Defer Implementation Pending Policy & Feasibility Resolution):* Formally pursue province-wide academic monitoring in principle; resolve core reporting and disclosure policies first (Stage 2); continue evaluating whether Candidate D or an alternative mechanism can safely and affordably fulfill those requirements (Stage 3); keep Tab 4 strictly home-campus scoped in the interim.
  - *Option C (Decline Portal Implementation):* Decline software-based portal aggregation entirely and maintain permanent home-campus portal scope, relying solely on manual out-of-band communication for province-wide oversight.

#### Stage 2: Core Reporting & Privacy Policy Determinations
Before committing to any backend architecture or code, the owner must establish the durable reporting and disclosure policies that govern aggregated academic reporting:

1. **`OD-AM-06` (PROPOSED — AWAITING OWNER APPROVAL): Score Weighting Policy**
   - *Question:* Should division and branch academic averages weight each assessment event equally, or average scores per-learner first?
   - *Option A (Assessment Event Average):* Every progress report carries equal weight. If a learner has multiple reports in a period, each contributes independently to the average and score buckets.
   - *Option B (Learner Academic Average):* Multiple reports for the same learner within the period are averaged first, so each unique learner contributes exactly one score to the division average and distribution buckets.
2. **`OD-AM-03` (PROPOSED — AWAITING OWNER APPROVAL): Reporting Horizon & Cadence**
   - *Question:* What calendar time horizon should bounded aggregation cover?
   - *Option A (Fixed Calendar Periods — Monthly or Quarterly):* Aggregation is bounded by discrete, non-sliding calendar windows (e.g. Q4: Oct 1 – Dec 31). Prevents arbitrary sliding-window queries.
   - *Option B (Rolling Horizon — e.g. Last 30 Days):* Aggregation reflects a continuous sliding window. Provides recent visibility but creates adjacent overlapping windows that may allow differential inference.
3. **`OD-AM-02` (PROPOSED — AWAITING OWNER APPROVAL): Small-Group Disclosure Suppression Threshold**
   - *Question:* What minimum distinct-learner count ($N$) is required before displaying aggregate scores for a branch/division cohort?
   - *Option A ($N < 5$ Distinct Learners):* Suppress score distributions and averages when fewer than 5 learners are active in the cohort. Provides stronger defense against casual re-identification in satellite branches, but frequently results in suppressed (empty) displays for small cohorts.
   - *Option B ($N < 3$ Distinct Learners):* Suppress only when fewer than 3 learners are active. Exposes averages for cohorts of 3 or 4 learners, increasing data visibility for lean satellites at higher disclosure risk.
   - *Governance Note:* Neither threshold guarantees anonymity against auxiliary background knowledge in small satellite communities.
4. **`OD-AM-04` (PROPOSED — AWAITING OWNER APPROVAL): Staff Submission Tracking Disposition**
   - *Question:* Should instructor progress-report submission counts and timeliness be tracked within this academic summary?
   - *Option A (Exclude Staff Submission Metrics):* Omit instructor submission tracking entirely from `/academicSummaries`, keeping the document strictly focused on student academic distributions.
   - *Option B (Separate Dedicated Inquiry):* Address instructor submission compliance through an independent supervisory inquiry with explicit purpose, access rules, and supervisory boundaries, avoiding mixing staff performance tracking with student academic reporting.

#### Stage 3: Candidate D Safety Assessment & Execution Mechanism
Evaluate whether Candidate D can safely and reliably fulfill the policy requirements defined in Stages 1 and 2:

1. **`OD-AM-05` (PROPOSED — AWAITING OWNER APPROVAL): Backend Execution Model & Trigger Authority**
   - *Question:* How should precomputed summary generation be executed?
   - *Option A (Automated Cloudflare Worker Cron on Free Plan):* Scheduled weekly execution. Subject to resolution of the failure recovery constraint (`OD-AM-07`).
   - *Option B (On-Demand Manual Trigger Mechanism):* Manual invocation endpoint. Leaves trigger authority, execution frequency, and invocation boundaries explicitly undecided until Owner Kifry explicitly decides them.
2. **`OD-AM-07` (PROPOSED — AWAITING OWNER APPROVAL): Automated Failure Recovery & Retry Design Constraint**
   - *Design Constraint:* Keep automated Cron execution deferred until bounded retry behavior, failure notifications, and recovery paths are demonstrably proven on the target platform; otherwise, consider manual execution only after Owner Kifry explicitly decides which organizational role has authority to trigger it.
   - *Unresolved Operational Reality:* Unattended automated Cron on Cloudflare Free plan currently lacks demonstrated retry ceilings and verified alerting; running with retries suppressed risks data going stale silently without recovery, while unconstrained platform retries pose potential risks of quota exhaustion if the platform retries. Neither execution path is currently approved.

### 10.4 Gate 4: Production Implementation & Deployment Authorization

* **Precondition:** Explicit written owner approval of Gate 3 policy decisions.
* **Scope:**
  - Create `/academicSummaries` collection and schema.
  - Update `firestore.rules` to permit Instructor Leader read access on `/academicSummaries` while maintaining branch-isolated raw `/progressReports` rules.
  - Integrate `/academicSummaries` consumer into Tab 4 UI.
  - Deploy worker to Cloudflare with configured secrets, Cron Triggers, and verified alerting.
* **Current Status:** **STRICTLY BLOCKED.** No production implementation or deployment is ready from this review alone. Tab 4 remains unchanged and home-campus scoped.


